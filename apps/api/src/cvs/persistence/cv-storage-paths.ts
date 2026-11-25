import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const localDirectory = new URL('../../../../../.cv-data/', import.meta.url);

export function profileDirectory(owner: string) {
  return join(
    process.env.CV_PROFILE_DIR || fileURLToPath(localDirectory),
    owner,
  );
}
