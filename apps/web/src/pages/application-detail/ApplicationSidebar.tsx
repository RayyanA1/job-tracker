import { CalendarDays } from 'lucide-react';
import { statuses } from '@tracker/shared';
import type { ApplicationInput } from '@tracker/shared';
import { Field } from '../../components/Field/Field';
import { Rating } from '../../components/Rating/Rating';
import { Card } from '../../components/Card/Card';
import type { ApplicationEditorProps } from './types';
import './ApplicationSidebar.css';
export function ApplicationSidebar({
  draft,
  patch,
  dirty,
}: ApplicationEditorProps & { dirty: boolean }) {
  return (
    <aside className="detail-side">
      <Card>
        <h2>At a glance</h2>
        <Field label="Application status">
          <select
            value={draft.status}
            onChange={(e) =>
              patch({
                status: e.target.value as ApplicationInput['status'],
              })
            }
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <div className="field">
          <span>Your rating</span>
          <Rating
            value={draft.rating}
            onChange={(rating) => patch({ rating })}
          />
          <small className="muted">Click the selected star to clear.</small>
        </div>
      </Card>
      <Card className="next-card">
        <div className="section-heading">
          <h2>Next action</h2>
          <CalendarDays size={19} />
        </div>
        <p>One clear next step.</p>
        <Field label="What needs to happen?">
          <textarea
            rows={3}
            placeholder="Send availability to the recruiter"
            value={draft.nextAction}
            onChange={(e) => patch({ nextAction: e.target.value })}
          />
        </Field>
        <Field label="Due date">
          <input
            type="date"
            value={draft.nextActionDate}
            onChange={(e) => patch({ nextActionDate: e.target.value })}
          />
        </Field>
      </Card>
      <p className="save-hint">
        {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
      </p>
    </aside>
  );
}
