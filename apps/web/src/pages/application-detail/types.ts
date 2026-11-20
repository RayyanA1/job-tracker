import type { ApplicationInput } from '@tracker/shared';
export type ApplicationEditorProps = {
  draft: ApplicationInput;
  patch: (changes: Partial<ApplicationInput>) => void;
};
