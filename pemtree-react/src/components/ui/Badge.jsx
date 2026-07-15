
export default function Badge({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) {
  const variants = {
    neutral: 'bg-[#F4F5F7] text-[#172B4D] dark:bg-[#2D333B] dark:text-slate-200 border border-[#DFE1E6]/40 dark:border-[#3E4C5E]/40',
    accent: 'bg-[#DEEBFF] text-[#0052CC] dark:bg-[#0C295E] dark:text-[#4C9AFF] border border-[#DEEBFF] dark:border-[#0C295E]',
    success: 'bg-[#E3FCEF] text-[#059669] dark:bg-[#0A3622] dark:text-[#10b981] border border-[#E3FCEF] dark:border-[#0A3622]',
    warning: 'bg-[#FFF0B3] text-[#B45309] dark:bg-[#422006] dark:text-[#FBBF24] border border-[#FFF0B3] dark:border-[#422006]',
    danger: 'bg-[#FFEBE6] text-[#BF2600] dark:bg-[#450A0A] dark:text-[#FF6369] border border-[#FFEBE6] dark:border-[#450A0A]',
    info: 'bg-[#E0F2FE] text-[#0284C7] dark:bg-[#0C3E5F] dark:text-[#38BDF8] border border-[#E0F2FE] dark:border-[#0C3E5F]',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
