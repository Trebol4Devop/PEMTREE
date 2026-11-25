
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-bold transition duration-200 border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 dark:focus:ring-[#4C9AFF]/30 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-transparent hover:opacity-80 text-[#0052CC] hover:text-[#0747A6] dark:text-[#4C9AFF] dark:hover:text-[#79B8FF]',
    secondary: 'bg-transparent hover:opacity-80 text-[#172B4D] hover:text-[#0052CC] dark:text-slate-100 dark:hover:text-[#4C9AFF]',
    danger: 'bg-transparent hover:opacity-80 text-[#BF2600] hover:text-[#A32000] dark:text-[#FF6369] dark:hover:text-[#FF858A]',
    ghost: 'bg-transparent hover:opacity-80 text-[#5E6C84] hover:text-[#172B4D] dark:text-slate-300 dark:hover:text-white',
    success: 'bg-transparent hover:opacity-80 text-[#4A7C6A] hover:text-[#3A6354] dark:text-[#6BA892] dark:hover:text-[#82BBA6]',
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
