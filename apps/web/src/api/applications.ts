import type { Application, ApplicationInput } from '@tracker/shared';
import { api } from './client';
export const applicationsApi = {
  list: () => api<Application[]>('/applications'),
  create: (input: Pick<ApplicationInput, 'company' | 'role'>) =>
    api<Application>('/applications', 'POST', input),
  update: (id: string, input: ApplicationInput) =>
    api<Application>(`/applications/${id}`, 'PUT', input),
};
