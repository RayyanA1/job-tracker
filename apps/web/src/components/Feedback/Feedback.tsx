import { Check, X } from 'lucide-react';
import './Feedback.css';
export function ErrorMessage({
  error,
  onDismiss,
}: {
  error: string;
  onDismiss?: () => void;
}) {
  return (
    <div role="alert" className="error">
      {error}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss error">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function Toast({ message }: { message: string }) {
  return (
    <div role="status" className="toast">
      <Check size={17} />
      {message}
    </div>
  );
}
