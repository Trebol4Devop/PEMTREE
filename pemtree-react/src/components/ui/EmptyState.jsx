
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 w-full ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[#F4F5F7] dark:bg-[#1C2636] text-[#5E6C84] dark:text-slate-300 flex items-center justify-center mb-4 border border-[#DFE1E6] dark:border-[#3E4C5E]">
          <Icon size={28} />
        </div>
      )}
      {title && (
        <h3 className="font-bold text-base sm:text-lg text-[#172B4D] dark:text-slate-100 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-xs sm:text-sm text-[#5E6C84] dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 dark:focus:ring-[#4C9AFF]/30"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
