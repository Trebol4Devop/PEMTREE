import { AlertTriangle, X } from 'lucide-react';

export default function WarningBanner({
  message,
  onClose,
  className = '',
}) {
  return (
    <div
      className={`bg-[#FFF0B3] dark:bg-[#422006] border border-[#D97706]/40 dark:border-[#FBBF24]/30 rounded-2xl p-4 flex items-start gap-3 text-[#B45309] dark:text-[#FBBF24] shadow-sm relative ${className}`}
    >
      <div className="shrink-0 mt-0.5">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-md text-[#B45309]/70 dark:text-[#FBBF24]/70 hover:bg-[#B45309]/10 dark:hover:bg-[#FBBF24]/10 transition"
          aria-label="Cerrar advertencia"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
