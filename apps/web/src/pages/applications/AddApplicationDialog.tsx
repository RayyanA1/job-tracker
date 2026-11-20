import type { FormEvent } from 'react';
import { BriefcaseBusiness, X } from 'lucide-react';
import { Field } from '../../components/Field/Field';
import { ErrorMessage } from '../../components/Feedback/Feedback';
import './AddApplicationDialog.css';
export function AddApplicationDialog({
  saving,
  error,
  onClose,
  onSubmit,
}: {
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !saving) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
      >
        <button
          className="close icon-button"
          aria-label="Close dialog"
          disabled={saving}
          onClick={() => onClose()}
        >
          <X size={21} />
        </button>
        <span className="empty-icon">
          <BriefcaseBusiness size={27} />
        </span>
        <h2 id="add-title">A new possibility</h2>
        <p>Start with the basics. The rest can come later.</p>
        <form onSubmit={onSubmit}>
          <Field label="Company *">
            <input
              name="company"
              required
              maxLength={200}
              autoFocus
              placeholder="e.g. Linear"
            />
          </Field>
          <Field label="Role *">
            <input
              name="role"
              required
              maxLength={200}
              placeholder="e.g. Software Engineer"
            />
          </Field>
          {error && <ErrorMessage error={error} />}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => onClose()}
            >
              Cancel
            </button>
            <button className="primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add application'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
