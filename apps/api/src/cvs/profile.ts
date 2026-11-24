import { constants } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
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

const template = new URL('../../../../cv-profile.template.md', import.meta.url);
const localDirectory = new URL('../../../../.cv-data/', import.meta.url);

export function profileDirectory(owner: string) {
  return join(
    process.env.CV_PROFILE_DIR || fileURLToPath(localDirectory),
    owner,
  );
}

export async function loadProfile(owner: string) {
  const directory = profileDirectory(owner);
  const path = join(directory, 'profile.md');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await copyFile(template, path, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  return parseProfile(await readFile(path, 'utf8'));
}

type Entry = {
  id: string;
  name: string;
  kind: 'role' | 'achievement' | 'project' | 'skill' | 'education';
  fields: Record<string, string>;
  roleId?: string;
};

const value = (text = '') =>
  /^\[[^\]]*\]$/.test(text.trim()) ? '' : text.trim();
const ids = (text = '') =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
const invalid = (message: string): never => {
  throw new CvError(422, `Profile Markdown: ${message}`);
};

export function parseProfile(markdown: string) {
  if (markdown.length > 100_000) invalid('use at most 100,000 characters.');
  const identity: Record<string, string> = Object.create(null);
  const professional: Record<string, string> = Object.create(null);
  const entries: Entry[] = [];
  let section = '';
  let current: Entry | undefined;
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

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entry of entries) {
    const fields = entry.fields;
    if (entry.kind === 'role' && (!fields['Official title'] || !fields.Dates)) {
      invalid(`${entry.id} needs an official title and dates.`);
    }
    if (
      (entry.kind === 'project' || entry.kind === 'achievement') &&
      !fields.Contribution
    ) {
      invalid(`${entry.id} needs a contribution.`);
    }
    if (entry.kind === 'project' && fields['Associated role']) {
      if (byId.get(fields['Associated role'])?.kind !== 'role')
        invalid(`${entry.id} has an unknown associated role.`);
      entry.roleId = fields['Associated role'];
    }
    for (const id of ids(fields.Skills)) {
      if (byId.get(id)?.kind !== 'skill')
        invalid(`${entry.id} has an unknown skill ID ${id}.`);
    }
    for (const id of ids(fields.Evidence)) {
      const kind = byId.get(id)?.kind;
      if (kind !== 'role' && kind !== 'project' && kind !== 'achievement')
        invalid(`${entry.id} has an unknown evidence ID ${id}.`);
    }
  }
  return {
    name: identity.Name || '',
    contact: [identity.Location, identity.Email, identity.Phone].filter(
      (part): part is string => !!part,
    ),
    links: identity.Links || '',
    headlines: (professional['Supported CV headlines'] || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean),
    background: professional.Background || '',
    interests: professional.Interests || '',
    entries,
  };
}

export type Profile = ReturnType<typeof parseProfile>;
