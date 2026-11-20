import { Plus } from 'lucide-react';
import { progress } from '@tracker/shared';
import { Field } from '../../components/Field/Field';
import { Card } from '../../components/Card/Card';
import type { ApplicationEditorProps } from './types';
import './InterviewStagesSection.css';
import { InterviewStageEditor } from './InterviewStageEditor';
export function InterviewStagesSection({
  draft,
  patch,
}: ApplicationEditorProps) {
  return (
    <Card>
      <div className="section-heading">
        <div>
          <h2>Interview stages</h2>
          <p>Your process, as you learn it.</p>
        </div>
        <button
          type="button"
          className="secondary compact"
          onClick={() =>
            patch({
              stages: [
                ...draft.stages,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  date: '',
                  status: 'Planned',
                  summary: '',
                  notes: '',
                },
              ],
            })
          }
        >
          <Plus size={16} /> Add stage
        </button>
      </div>
      <div className="grid2">
        <Field label="Total rounds (optional)">
          <input
            type="number"
            min={Math.max(1, draft.stages.length)}
            max={100}
            placeholder="Not known yet"
            value={draft.totalRounds ?? ''}
            onChange={(e) =>
              patch({
                totalRounds: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
        <Field label="Current stage">
          <select
            value={draft.currentStageId ?? ''}
            onChange={(e) =>
              patch({
                currentStageId: e.target.value || null,
              })
            }
          >
            <option value="">Not set</option>
            {draft.stages.map((s, i) => (
              <option value={s.id} key={s.id}>
                {s.name || 'Unnamed stage'} · round {i + 1}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="progress-label">{progress(draft)}</p>
      {draft.stages.map((stage, index) => (
        <InterviewStageEditor
          key={stage.id}
          stage={stage}
          index={index}
          stageCount={draft.stages.length}
          isCurrent={draft.currentStageId === stage.id}
          onChange={(changes) =>
            patch({
              stages: draft.stages.map((item) =>
                item.id === stage.id ? { ...item, ...changes } : item,
              ),
            })
          }
          onMove={(delta) => {
            const stages = [...draft.stages];
            [stages[index], stages[index + delta]] = [
              stages[index + delta]!,
              stages[index]!,
            ];
            patch({ stages });
          }}
          onRemove={() => {
            if (window.confirm('Remove this stage and its notes?'))
              patch({
                stages: draft.stages.filter((item) => item.id !== stage.id),
                currentStageId:
                  draft.currentStageId === stage.id
                    ? null
                    : draft.currentStageId,
              });
          }}
        />
      ))}
      {!draft.stages.length && (
        <p className="section-empty">
          Add stages as you learn about the interview process.
        </p>
      )}
    </Card>
  );
}
