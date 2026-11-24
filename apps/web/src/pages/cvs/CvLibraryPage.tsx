import { useEffect, useState, type FormEvent } from 'react';
import type { CvClaim, CvDraft, CvVersion, JobPosting } from '@tracker/shared';
import { cvApi } from '../../api/cvs';
import { Card } from '../../components/Card/Card';
import { Field } from '../../components/Field/Field';
import { PageHeading } from '../../components/PageHeading/PageHeading';
import './CvLibraryPage.css';

const blankJob = { url: '', company: '', title: '', description: '' };

function Claim({ claim }: { claim: CvClaim }) {
  return (
    <div className="cv-claim">
      <p>{claim.text}</p>
      <details>
        <summary>Profile sources</summary>
        {claim.sources.map((source) => (
          <p key={source.id}>{source.text}</p>
        ))}
      </details>
    </div>
  );
}

export function CvLibraryPage({
  application,
  onReturn,
}: {
  application: { id: string; job: JobPosting } | null;
  onReturn: () => void;
}) {
  const [job, setJob] = useState(application?.job ?? blankJob);
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [saved, setSaved] = useState<CvVersion | null>(null);
  const [attachedId, setAttachedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(!!application);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cvApi
      .list()
      .then((list) => {
        if (active)
          setVersions((current) => [
            ...current,
            ...list.filter((item) => !current.some((cv) => cv.id === item.id)),
          ]);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function perform(action: string, run: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(action);
    try {
      await run();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy('');
    }
  }

  function update(field: keyof JobPosting, value: string) {
    setJob((job) => ({ ...job, [field]: value }));
  }

  function importPosting() {
    return perform('Reading posting…', async () => {
      const result = await cvApi.posting(job.url.trim());
      setJob({
        ...result,
        company: result.company || job.company,
        title: result.title || job.title,
      });
      setNotice('Posting imported. Review the details before generating.');
    });
  }

  function generate(event: FormEvent) {
    event.preventDefault();
    void perform('Generating draft…', async () => {
      setDraft(await cvApi.draft(job));
      setSaved(null);
      setNotice('Draft ready. Review the wording and its profile sources.');
    });
  }

  function save() {
    if (!draft) return;
    void perform('Saving PDF…', async () => {
      const version = await cvApi.save(draft.id);
      setSaved(version);
      setVersions((current) => [
        version,
        ...current.filter((cv) => cv.id !== version.id),
      ]);
      setNotice('CV saved to the library.');
    });
  }

  function attach(version: CvVersion) {
    if (!application) return;
    void perform('Attaching CV…', async () => {
      await cvApi.attach(application.id, version.id);
      setAttachedId(version.id);
      setNotice('CV attached to this application.');
    });
  }

  return (
    <div className="cv-stack">
      {application && (
        <button type="button" className="back" onClick={onReturn}>
          Back to application
        </button>
      )}
      <PageHeading
        title="CV Library"
        subtitle="Create and keep track of the CV versions you use."
      >
        <button
          className="primary"
          onClick={() => setCreating(true)}
          disabled={creating}
        >
          Create CV
        </button>
      </PageHeading>
      {error && (
        <p className="cv-error" role="alert">
          {error}
        </p>
      )}
      {(busy || notice) && <p role="status">{busy || notice}</p>}
      {creating && (
        <Card className="cv-stack">
          <h2>Create a tailored CV</h2>
          <form onSubmit={generate} className="cv-stack">
            <fieldset disabled={!!busy} className="editor-fields cv-stack">
              <div className="cv-actions">
                <Field label="Job URL">
                  <input
                    type="url"
                    value={job.url}
                    onChange={(event) => update('url', event.target.value)}
                  />
                </Field>
                <button
                  className="secondary"
                  type="button"
                  onClick={importPosting}
                  disabled={!job.url.trim()}
                >
                  Read posting
                </button>
              </div>
              <div className="cv-fields">
                <Field label="Job title">
                  <input
                    required
                    maxLength={200}
                    value={job.title}
                    onChange={(event) => update('title', event.target.value)}
                  />
                </Field>
                <Field label="Company">
                  <input
                    maxLength={200}
                    value={job.company}
                    onChange={(event) => update('company', event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Job description">
                <textarea
                  required
                  rows={8}
                  maxLength={30_000}
                  placeholder="Read the posting or paste the job description here."
                  value={job.description}
                  onChange={(event) =>
                    update('description', event.target.value)
                  }
                />
              </Field>
              <button className="primary">Generate draft</button>
            </fieldset>
          </form>
        </Card>
      )}
      {draft && (
        <Card className="cv-stack">
          <h2>Review CV draft</h2>
          <div className="cv-stack">
            <div className="cv-actions">
              <a href={cvApi.pdf(draft.id)} target="_blank" rel="noreferrer">
                Open PDF preview
              </a>
              {!saved && (
                <button className="primary" disabled={!!busy} onClick={save}>
                  Save reviewed CV
                </button>
              )}
            </div>
            {draft.trimmed && (
              <p role="status">The draft was shortened to fit one A4 page.</p>
            )}
            <p>
              <strong>{draft.document.headline}</strong>
            </p>
            {draft.document.summary.map((claim, index) => (
              <Claim key={index} claim={claim} />
            ))}
            {draft.document.experience
              .filter((role) => role.bullets.length > 0)
              .map((role, index) => (
                <section key={index} className="cv-stack">
                  <h3>
                    {role.employer} · {role.title}
                  </h3>
                  {role.bullets.map(({ claim }) => (
                    <Claim key={claim.sources[0]?.id} claim={claim} />
                  ))}
                </section>
              ))}
            {draft.document.projects.map(({ claim, project }) => (
              <section key={claim.sources[0]?.id} className="cv-stack">
                <h3>{project}</h3>
                <Claim claim={claim} />
              </section>
            ))}
          </div>
        </Card>
      )}
      <Card className="cv-stack">
        <h2>Saved versions</h2>
        <div className="cv-stack">
          <Field label="Import an existing CV (PDF)">
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={!!busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (!file) return;
                void perform('Importing PDF…', async () => {
                  const version = await cvApi.import(file);
                  setVersions((current) => [version, ...current]);
                  setNotice('PDF imported.');
                });
              }}
            />
          </Field>
          {loading && <p>Loading saved CVs…</p>}
          {!loading && !versions.length && <p>No CVs saved yet.</p>}
          {versions.map((cv) => (
            <div key={cv.id} className="cv-version">
              <div>
                <strong>{cv.name}</strong>
                <small>
                  {cv.kind === 'imported' ? 'Imported' : 'Generated'} ·{' '}
                  {new Date(cv.createdAt).toLocaleString()}
                </small>
              </div>
              <div className="cv-actions">
                <a href={cvApi.pdf(cv.id)} target="_blank" rel="noreferrer">
                  Preview
                </a>
                <a href={cvApi.pdf(cv.id, true)}>Download</a>
                {application && (
                  <button
                    className="secondary"
                    disabled={!!busy || attachedId === cv.id}
                    onClick={() => attach(cv)}
                  >
                    {attachedId === cv.id
                      ? 'Attached'
                      : 'Attach to application'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
