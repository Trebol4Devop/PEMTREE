import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative w-full bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 ${sizes[size]} ${className}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DFE1E6] dark:border-[#3E4C5E] shrink-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-xl bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] flex items-center justify-center">
                <Icon size={18} />
              </div>
            )}
            {title && (
              <h2 className="font-bold text-base sm:text-lg text-[#172B4D] dark:text-slate-100">
                {title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#7A869A] dark:text-slate-400 hover:bg-[#F4F5F7] dark:hover:bg-[#2D333B] transition"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-grow p-5 overflow-y-auto min-h-0 text-[#172B4D] dark:text-slate-100">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 border-t border-[#DFE1E6] dark:border-[#3E4C5E] bg-[#F4F5F7] dark:bg-[#0E1624]/60 flex justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
