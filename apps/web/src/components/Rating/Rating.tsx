import { Star } from 'lucide-react';
import './Rating.css';
export function Rating({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
}) {
  return (
    <div
      className="stars"
      aria-label={value ? `${value} out of 5 stars` : 'Not rated'}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            type="button"
            key={n}
            aria-label={`Rate ${n} stars`}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? null : n)}
          >
            <Star
              size={18}
              fill={(value ?? 0) >= n ? 'currentColor' : 'none'}
            />
          </button>
        ) : (
          <Star
            key={n}
            size={15}
            fill={(value ?? 0) >= n ? 'currentColor' : 'none'}
          />
        ),
      )}
    </div>
  );
}
