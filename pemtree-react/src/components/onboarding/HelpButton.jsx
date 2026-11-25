import { HelpCircle } from 'lucide-react';

/**
 * Botón de ayuda "?" que reabre el centro de ayuda de una pantalla.
 */
export default function HelpButton({ onClick, className = '', title = 'Ayuda' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-semibold transition cursor-pointer border-0 bg-transparent text-[#5E6C84] hover:text-[#172B4D] dark:text-slate-300 dark:hover:text-white ${className}`}
    >
      <HelpCircle size={18} />
    </button>
  );
}
