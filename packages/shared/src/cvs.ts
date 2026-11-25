export type CvProfileEntry = {
  id: string;
  name: string;
  kind: 'role' | 'achievement' | 'project' | 'skill' | 'education';
  fields: Record<string, string>;
  roleId?: string | undefined;
  skills: string[];
  evidence: string[];
};

export type CvProfile = {
  name: string;
  location: string;
  email: string;
  phone: string;
  links: string;
  headlines: string[];
  background: string;
  interests: string;
  entries: CvProfileEntry[];
};

export type JobPosting = {
  url: string;
  company: string;
  title: string;
  description: string;
};

export type CvClaim = { text: string; sources: { id: string; text: string }[] };
export type CvBullet = { claim: CvClaim; project?: string; priority?: number };
export type CvDocument = {
  name: string;
  contact: string[];
  links: string;
  headline: string;
  summary: CvClaim[];
  skills: string[];
  experience: {
    employer: string;
    title: string;
    dates: string;
    bullets: CvBullet[];
  }[];
  projects: CvBullet[];
  education: string[];
};

export type CvVersion = {
  id: string;
  name: string;
  createdAt: string;
  kind: 'generated' | 'imported';
  company: string;
  title: string;
  url: string;
};

export type CvDraft = {
  id: string;
  document: CvDocument;
  trimmed: boolean;
};
