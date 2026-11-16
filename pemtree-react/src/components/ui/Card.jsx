
export default function Card({
  children,
  padding = true,
  hoverable = false,
  className = '',
  ...props
}) {
  const paddingClass = padding === true ? 'p-5 sm:p-6' : (padding === false || padding === 'none' ? '' : padding);
  const hoverClass = hoverable
    ? 'hover:border-[#0052CC]/50 dark:hover:border-[#4C9AFF]/50 hover:shadow-md transition-all duration-200 cursor-pointer'
    : '';

  return (
    <div
      className={`bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded-2xl shadow-sm ${paddingClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
