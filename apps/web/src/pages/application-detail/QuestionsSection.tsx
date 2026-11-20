import { Plus } from 'lucide-react';
import { Field } from '../../components/Field/Field';
import { Card } from '../../components/Card/Card';
import type { ApplicationEditorProps } from './types';
export function QuestionsSection({ draft, patch }: ApplicationEditorProps) {
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Application questions</h2>
          <p>Keep a copy of what you submitted.</p>
        </div>
        <button
          type="button"
          className="secondary compact"
          onClick={() =>
            patch({
              answers: [
                ...draft.answers,
                {
                  id: crypto.randomUUID(),
                  question: '',
                  answer: '',
                },
              ],
            })
          }
        >
          <Plus size={16} /> Add question
        </button>
      </div>
      {!draft.answers.length && (
        <p className="section-empty">
          No questions yet. Save your answers here for later.
        </p>
      )}
      {draft.answers.map((q, i) => (
        <div className="nested" key={q.id}>
          <div className="item-heading">
            <span>Question {i + 1}</span>
            <button
              type="button"
              className="remove"
              onClick={() => {
                if (window.confirm('Remove this question and answer?'))
                  patch({
                    answers: draft.answers.filter((x) => x.id !== q.id),
                  });
              }}
            >
              Remove
            </button>
          </div>
          <Field label="Question">
            <input
              required
              placeholder="Why this company?"
              value={q.question}
              onChange={(e) =>
                patch({
                  answers: draft.answers.map((x) =>
                    x.id === q.id ? { ...x, question: e.target.value } : x,
                  ),
                })
              }
            />
          </Field>
          <Field label="Submitted answer">
            <textarea
              rows={4}
              value={q.answer}
              placeholder="Paste your submitted answer…"
              onChange={(e) =>
                patch({
                  answers: draft.answers.map((x) =>
                    x.id === q.id ? { ...x, answer: e.target.value } : x,
                  ),
                })
              }
            />
          </Field>
        </div>
      ))}
    </Card>
  );
}
