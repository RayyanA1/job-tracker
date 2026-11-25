export function cvFilename(title: string, company = '') {
  return [title, company]
    .filter(Boolean)
    .join(' - ')
    .replace(/[\u0000-\u001f\u007f/\\]/g, '-')
    .slice(0, 160);
}
