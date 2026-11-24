import type { CvDraft, CvVersion, JobPosting } from '@tracker/shared';
import { api } from './client';

export const cvApi = {
  list: () => api<CvVersion[]>('/cvs'),
  posting: (url: string) => api<JobPosting>('/cvs/posting', 'POST', { url }),
  draft: (job: JobPosting) => api<CvDraft>('/cvs/drafts', 'POST', job),
  save: (id: string) => api<CvVersion>(`/cvs/drafts/${id}/save`, 'POST'),
  getAttachment: (id: string) =>
    api<CvVersion | null>(`/cvs/applications/${id}`),
  attach: (id: string, cvId: string | null) =>
    api(`/cvs/applications/${id}`, 'PUT', { cvId }),
  pdf: (id: string, download = false) =>
    `/api/cvs/${id}/pdf${download ? '?download=1' : ''}`,
  async import(file: File): Promise<CvVersion> {
    const response = await fetch(
      `/api/cvs/import?name=${encodeURIComponent(file.name)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? 'Could not import the PDF.');
    return data;
  },
};
