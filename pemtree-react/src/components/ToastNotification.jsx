import { X } from 'lucide-react';

export default function ToastNotification({ toasts, onRemove }) {
    return (
        <div className="planner-toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`planner-toast planner-toast-${toast.type}`}>
                    <span>{toast.message}</span>
                    <button onClick={() => onRemove(toast.id)} className="planner-toast-close">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
