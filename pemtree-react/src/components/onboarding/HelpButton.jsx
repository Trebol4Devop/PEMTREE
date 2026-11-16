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
      className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-semibold transition cursor-pointer border bg-white/90 border-[#DFE1E6] text-[#5E6C84] hover:bg-[#F4F5F7] hover:text-[#172B4D] dark:bg-[#1C2636]/90 dark:border-[#3E4C5E] dark:text-slate-300 dark:hover:bg-[#2D333B] dark:hover:text-white ${className}`}
    >
      <HelpCircle size={18} />
    </button>
  );
}
