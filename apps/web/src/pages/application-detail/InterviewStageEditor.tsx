import { ChevronUp, ChevronDown } from 'lucide-react';
import { stageStatuses } from '@tracker/shared';
import type { ApplicationInput } from '@tracker/shared';
import { Field } from '../../components/Field/Field';
import './InterviewStageEditor.css';
type InterviewStage = ApplicationInput['stages'][number];
export function InterviewStageEditor({
  stage,
  index,
  stageCount,
  isCurrent,
  onChange,
  onMove,
  onRemove,
}: {
  stage: InterviewStage;
  index: number;
  stageCount: number;
  isCurrent: boolean;
  onChange: (changes: Partial<InterviewStage>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`nested ${isCurrent ? 'current' : ''}`}>
      <div className="item-heading">
        <strong>
          Round {index + 1}{' '}
          {isCurrent && <span className="current-label">Current</span>}
        </strong>
        <div className="item-controls">
          <button
            type="button"
            className="icon-button"
            aria-label={`Move stage ${index + 1} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move stage ${index + 1} down`}
            disabled={index === stageCount - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown size={18} />
          </button>
          <button type="button" className="remove" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <Field label="Stage name">
        <input
          required
          placeholder="e.g. Technical interview"
          value={stage.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <div className="grid2">
        <Field label="Date">
          <input
            type="date"
            value={stage.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </Field>
        <Field label="Stage status">
          <select
            value={stage.status}
            onChange={(e) =>
              onChange({
                status: e.target.value as InterviewStage['status'],
              })
            }
          >
            {stageStatuses.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Summary">
        <textarea
          rows={2}
          placeholder="What does this stage cover?"
          value={stage.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
        />
      </Field>
      <Field label="Notes">
        <textarea
          rows={6}
          placeholder="Paste your preparation or ChatGPT notes here…"
          value={stage.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </Field>
    </div>
  );
}
