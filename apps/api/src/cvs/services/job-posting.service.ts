import { fetchJobPosting } from '../clients/job-posting.client.ts';
import { CvError, unreadablePosting } from '../cv.errors.ts';
import { extractPosting } from '../parsing/job-posting.parser.ts';

export async function importPosting(url: string) {
  try {
    const html = await fetchJobPosting(url);
    return extractPosting(html, url);
  } catch (error) {
    if (error instanceof CvError) throw error;
    throw unreadablePosting();
  }
}
