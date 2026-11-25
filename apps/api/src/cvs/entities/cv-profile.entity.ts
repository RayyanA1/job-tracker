import type { CvProfile, CvProfileEntry } from '@tracker/shared';
import { z } from 'zod';
import { CvError } from '../cv.errors.ts';

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

export function invalidProfile(message: string): never {
  throw new CvError('invalid-content', `CV profile: ${message}`);
}

export function validateProfile(input: unknown): CvProfile {
  const result = profileSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    invalidProfile(
      `check ${issue.path.join('.') || 'profile.json'}. ${issue.message}`,
    );
  }
  const profile = result.data;
  const byId = new Map<string, CvProfileEntry>();
  for (const entry of profile.entries) {
    if (byId.has(entry.id) || ['background', 'interests'].includes(entry.id))
      invalidProfile(`duplicate or reserved fact ID ${entry.id}.`);
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
      invalidProfile(`${id} needs an official title and dates.`);
    if ((kind === 'project' || kind === 'achievement') && !fields.Contribution)
      invalidProfile(`${id} needs a contribution.`);
    if (kind === 'achievement' && !roleId)
      invalidProfile(`${id} needs a parent role.`);
    if (
      roleId &&
      ((kind !== 'project' && kind !== 'achievement') ||
        byId.get(roleId)?.kind !== 'role')
    )
      invalidProfile(`${id} has an invalid associated role.`);
    for (const skill of skills) {
      if (byId.get(skill)?.kind !== 'skill')
        invalidProfile(`${id} has an unknown skill ID ${skill}.`);
    }
    for (const source of evidence) {
      const sourceKind = byId.get(source)?.kind;
      if (
        sourceKind !== 'role' &&
        sourceKind !== 'project' &&
        sourceKind !== 'achievement'
      )
        invalidProfile(`${id} has an unknown evidence ID ${source}.`);
    }
  }
  return profile;
}

export function parseProfileJson(json: string): CvProfile {
  if (json.length > 1_000_000)
    invalidProfile('profile.json must be at most 1,000,000 characters.');
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    invalidProfile('profile.json contains invalid JSON.');
  }
  return validateProfile(input);
}
