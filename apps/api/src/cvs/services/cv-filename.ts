export function cvFilename(title: string, company = '') {
  return (
    [title, company]
      .filter(Boolean)
      .join(' - ')
      // eslint-disable-next-line no-control-regex -- Remove ASCII control characters from PDF filenames.
      .replace(/[\u0000-\u001f\u007f/\\]/g, '-')
      .slice(0, 160)
  );
}
