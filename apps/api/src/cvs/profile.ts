import { randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import type { CvProfile, CvProfileEntry } from '@tracker/shared';
import { z } from 'zod';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export class CvError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const template = new URL(
  '../../../../cv-profile.template.json',
  import.meta.url,
);
const localDirectory = new URL('../../../../.cv-data/', import.meta.url);

export function profileDirectory(owner: string) {
  return join(
    process.env.CV_PROFILE_DIR || fileURLToPath(localDirectory),
    owner,
  );
}

async function readOptional(path: string | URL) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return undefined;
  }
}

export async function loadProfile(owner: string) {
  const directory = profileDirectory(owner);
  const path = join(directory, 'profile.json');
  const existing = await readOptional(path);
  if (existing !== undefined) return parseProfileJson(existing);

  const legacy = await readOptional(join(directory, 'profile.md'));
  const profile =
    legacy === undefined
      ? parseProfileJson(await readFile(template, 'utf8'))
      : parseLegacyProfile(legacy);

  await mkdir(directory, { recursive: true, mode: 0o700 });
  const pending = join(directory, `.profile-${randomUUID()}.json`);
  await writeFile(pending, JSON.stringify(profile, null, 2) + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  try {
    // Publish the complete file only if another request hasn't created it.
    await link(pending, path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    return parseProfileJson(await readFile(path, 'utf8'));
  } finally {
    await rm(pending, { force: true });
  }
  return profile;
}

const factId = z.string().regex(/^[a-z0-9-]+$/);
const field = z.string().trim();
const profileSchema = z.strictObject({
  name: field.default(''),
  location: field.default(''),
  email: field.default(''),
  phone: field.default(''),
  links: field.default(''),
  headlines: z.array(field.min(1)).default([]),
  background: field.default(''),
  interests: field.default(''),
  entries: z
    .array(
      z.strictObject({
        id: factId,
        name: field.min(1),
        kind: z.enum(['role', 'achievement', 'project', 'skill', 'education']),
        fields: z.record(z.string(), field).default({}),
        roleId: factId.optional(),
        skills: z.array(factId).default([]),
        evidence: z.array(factId).default([]),
      }),
    )
    .default([]),
});

function invalid(message: string): never {
  throw new CvError(422, `CV profile: ${message}`);
}

function validateProfile(input: unknown): CvProfile {
  const result = profileSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    invalid(
      `check ${issue.path.join('.') || 'profile.json'}. ${issue.message}`,
    );
  }
  const profile = result.data;
  const byId = new Map<string, CvProfileEntry>();
  for (const entry of profile.entries) {
    if (byId.has(entry.id) || ['background', 'interests'].includes(entry.id))
      invalid(`duplicate or reserved fact ID ${entry.id}.`);
    byId.set(entry.id, entry);
  }
  for (const {
    id,
    kind,
    fields,
    roleId,
    skills,
    evidence,
  } of profile.entries) {
    if (kind === 'role' && (!fields['Official title'] || !fields.Dates))
      invalid(`${id} needs an official title and dates.`);
    if ((kind === 'project' || kind === 'achievement') && !fields.Contribution)
      invalid(`${id} needs a contribution.`);
    if (kind === 'achievement' && !roleId)
      invalid(`${id} needs a parent role.`);
    if (
      roleId &&
      ((kind !== 'project' && kind !== 'achievement') ||
        byId.get(roleId)?.kind !== 'role')
    )
      invalid(`${id} has an invalid associated role.`);
    for (const skill of skills) {
      if (byId.get(skill)?.kind !== 'skill')
        invalid(`${id} has an unknown skill ID ${skill}.`);
    }
    for (const source of evidence) {
      const sourceKind = byId.get(source)?.kind;
      if (
        sourceKind !== 'role' &&
        sourceKind !== 'project' &&
        sourceKind !== 'achievement'
      )
        invalid(`${id} has an unknown evidence ID ${source}.`);
    }
  }
  return profile;
}

export function parseProfileJson(json: string): CvProfile {
  if (json.length > 1_000_000)
    invalid('profile.json must be at most 1,000,000 characters.');
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    invalid('profile.json contains invalid JSON.');
  }
  return validateProfile(input);
}

const value = (text = '') =>
  /^\[[^\]]*\]$/.test(text.trim()) ? '' : text.trim();
const ids = (text = '') =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
export function parseLegacyProfile(markdown: string) {
  if (markdown.length > 100_000)
    invalid('profile.md must be at most 100,000 characters.');
  const identity: Record<string, string> = Object.create(null);
  const professional: Record<string, string> = Object.create(null);
  const entries: CvProfileEntry[] = [];
  let section = '';
  let current: CvProfileEntry | undefined;
  let roleId: string | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const sectionHeading = /^## (.+)$/.exec(line);
    if (sectionHeading) {
      section = sectionHeading[1]!;
      current = undefined;
      roleId = undefined;
      continue;
    }

    const item = /^(#{3,4}|-) \[([a-z0-9-]+)\] (.+)$/.exec(line);
    if (item) {
      const [, marker, id, label] = item;
      const kind =
        section === 'Career history'
          ? marker === '####'
            ? 'achievement'
            : 'role'
          : section === 'Projects'
            ? 'project'
            : section === 'Skills'
              ? 'skill'
              : section === 'Education and certifications'
                ? 'education'
                : undefined;
      const name = value(label);
      current = undefined;
      if (kind === 'role') roleId = undefined;
      if (!kind || !name) continue;
      if (kind === 'achievement' && !roleId)
        invalid(`${id} needs a parent role.`);
      if (
        entries.some((entry) => entry.id === id) ||
        ['background', 'interests'].includes(id!)
      ) {
        invalid(`duplicate or reserved fact ID ${id}.`);
      }
      current = {
        id: id!,
        name,
        kind,
        fields: Object.create(null),
        skills: [],
        evidence: [],
        ...(kind === 'achievement' && roleId ? { roleId } : {}),
      };
      entries.push(current);
      if (kind === 'role') roleId = current.id;
      continue;
    }

    const field = /^\s*- ([^:]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    const fields =
      section === 'Identity'
        ? identity
        : section === 'Professional profile'
          ? professional
          : current?.fields;
    if (fields) fields[field[1]!] = value(field[2]);
  }

  for (const entry of entries) {
    const {
      Skills,
      Evidence,
      'Associated role': associatedRole,
      ...fields
    } = entry.fields;
    if (entry.kind === 'project' && associatedRole)
      entry.roleId = associatedRole;
    entry.skills = ids(Skills);
    entry.evidence = ids(Evidence);
    entry.fields = Object.fromEntries(
      Object.entries(fields).filter(([, text]) => text),
    );
  }
  return validateProfile({
    name: identity.Name,
    location: identity.Location,
    email: identity.Email,
    phone: identity.Phone,
    links: identity.Links,
    headlines: (professional['Supported CV headlines'] || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean),
    background: professional.Background,
    interests: professional.Interests,
    entries,
  });
}
