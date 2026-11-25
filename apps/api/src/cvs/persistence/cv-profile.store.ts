import { randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseProfileJson } from '../entities/cv-profile.entity.ts';
import { parseLegacyProfile } from '../parsing/cv-profile-legacy.parser.ts';
import { profileDirectory } from './cv-storage-paths.ts';

const template = new URL(
  '../../../../../cv-profile.template.json',
  import.meta.url,
);

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
