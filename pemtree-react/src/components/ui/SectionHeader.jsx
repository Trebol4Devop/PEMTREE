
export default function SectionHeader({
  eyebrow,
  title,
  description,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center text-center mb-8 max-w-3xl mx-auto px-4 ${className}`}>
      {eyebrow && (
        <span className="inline-block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E] px-3.5 py-1 rounded-full mb-4 shadow-xs">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#172B4D] dark:text-white tracking-tight leading-tight mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-xs sm:text-sm md:text-base text-[#5E6C84] dark:text-slate-300 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
