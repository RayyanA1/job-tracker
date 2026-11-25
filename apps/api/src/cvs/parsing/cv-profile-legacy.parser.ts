import type { CvProfileEntry } from '@tracker/shared';
import {
  invalidProfile,
  validateProfile,
} from '../entities/cv-profile.entity.ts';

const value = (text = '') =>
  /^\[[^\]]*\]$/.test(text.trim()) ? '' : text.trim();
const ids = (text = '') =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
export function parseLegacyProfile(markdown: string) {
  if (markdown.length > 100_000)
    invalidProfile('profile.md must be at most 100,000 characters.');
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
        invalidProfile(`${id} needs a parent role.`);
      if (
        entries.some((entry) => entry.id === id) ||
        ['background', 'interests'].includes(id!)
      ) {
        invalidProfile(`duplicate or reserved fact ID ${id}.`);
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
