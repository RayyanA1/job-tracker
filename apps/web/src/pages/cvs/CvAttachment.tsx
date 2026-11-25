import { useEffect, useState } from 'react';
import type { CvVersion } from '@tracker/shared';
import { cvApi } from '../../api/cvs';
import { Card } from '../../components/Card/Card';
import { Field } from '../../components/Field/Field';
import './CvLibraryPage.css';

export function CvAttachment({
  applicationId,
  onCreate,
}: {
  applicationId: string;
  onCreate: () => void;
}) {
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [attached, setAttached] = useState<CvVersion | null>(null);
  const [selection, setSelection] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([cvApi.list(), cvApi.getAttachment(applicationId)])
      .then(([list, saved]) => {
        if (!active) return;
        setVersions(list);
        setAttached(saved);
        setSelection(saved?.id ?? '');
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [applicationId]);

  async function attach() {
    setBusy(true);
    setError('');
    try {
      await cvApi.attach(applicationId, selection || null);
      setAttached(versions.find(({ id }) => id === selection) ?? null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="cv-stack">
      <h2>CV Library</h2>
      <div className="cv-stack">
        {error && <p role="alert">{error}</p>}
        {attached && (
          <p>
            Attached CV{' '}
            <a href={cvApi.pdf(attached.id)} target="_blank" rel="noreferrer">
              {attached.name}
            </a>
          </p>
        )}
        {versions.length > 0 && (
          <div className="cv-actions">
            <Field label="CV version">
              <select
                value={selection}
                onChange={(event) => setSelection(event.target.value)}
                disabled={busy}
              >
                <option value="">No CV attached</option>
                {versions.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name} ({new Date(cv.createdAt).toLocaleString()})
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="secondary"
              type="button"
              onClick={attach}
              disabled={busy || selection === (attached?.id ?? '')}
            >
              {selection ? 'Attach version' : 'Remove attachment'}
            </button>
          </div>
        )}
        <button type="button" className="secondary" onClick={onCreate}>
          Create CV
        </button>
      </div>
    </Card>
  );
}
