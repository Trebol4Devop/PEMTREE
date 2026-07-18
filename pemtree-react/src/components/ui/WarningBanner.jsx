import { AlertTriangle, X } from 'lucide-react';

export default function WarningBanner({
  children,
  onClose,
  className = '',
}) {
  return (
    <div className={`planner-warning-banner ${className}`}>
      <AlertTriangle size={18} className="planner-warning-icon" aria-hidden="true" />
      <div className="planner-warning-text">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="planner-warning-close"
          title="Cerrar"
          aria-label="Cerrar advertencia"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
