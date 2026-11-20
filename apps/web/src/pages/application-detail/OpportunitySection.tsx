import { ExternalLink } from 'lucide-react';
import { Badge } from '../../components/Badge/Badge';
import { Field } from '../../components/Field/Field';
import { Card } from '../../components/Card/Card';
import type { ApplicationEditorProps } from './types';
import './OpportunitySection.css';
export function OpportunitySection({ draft, patch }: ApplicationEditorProps) {
  return (
    <Card>
      <div className="section-heading">
        <h2>The opportunity</h2>
        <Badge status={draft.status} />
      </div>
      <div className="grid2">
        <Field label="Company *">
          <input
            required
            maxLength={200}
            value={draft.company}
            onChange={(e) => patch({ company: e.target.value })}
          />
        </Field>
        <Field label="Role *">
          <input
            required
            maxLength={200}
            value={draft.role}
            onChange={(e) => patch({ role: e.target.value })}
          />
        </Field>
        <Field label="Job link">
          <input
            type="url"
            placeholder="https://…"
            value={draft.jobLink}
            onChange={(e) => patch({ jobLink: e.target.value })}
          />
        </Field>
        <Field label="Date applied">
          <input
            type="date"
            value={draft.dateApplied}
            onChange={(e) => patch({ dateApplied: e.target.value })}
          />
        </Field>
      </div>
      {/^https?:\/\//i.test(draft.jobLink) && (
        <a
          className="text-link"
          href={draft.jobLink}
          target="_blank"
          rel="noreferrer"
        >
          Open job listing <ExternalLink size={14} />
        </a>
      )}
      <Field label="CV reference">
        <input
          placeholder="e.g. Rayyan_CV_v3.pdf, version name, or link"
          value={draft.cvReference}
          onChange={(e) => patch({ cvReference: e.target.value })}
        />
      </Field>
      <Field label="General notes">
        <textarea
          rows={4}
          placeholder="What stands out about this opportunity?"
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </Field>
    </Card>
  );
}
