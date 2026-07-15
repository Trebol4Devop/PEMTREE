
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 dark:focus:ring-[#4C9AFF]/30 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] text-white dark:text-[#0E1624] shadow-sm',
    secondary: 'bg-[#F4F5F7] hover:bg-[#EBECF0] dark:bg-[#2D333B] dark:hover:bg-[#3E4C5E] text-[#172B4D] dark:text-slate-100 border border-[#DFE1E6] dark:border-[#3E4C5E]',
    danger: 'bg-[#BF2600] hover:bg-[#A32000] dark:bg-[#FF6369] dark:hover:bg-[#FF858A] text-white',
    ghost: 'bg-transparent hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] text-[#5E6C84] dark:text-slate-300',
    success: 'bg-[#059669] hover:bg-[#047857] dark:bg-[#10b981] dark:hover:bg-[#059669] text-white',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg',
    md: 'text-sm px-4 py-2 rounded-xl',
    lg: 'text-base px-6 py-3 rounded-xl',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
