import { useId } from 'react';

export default function Textarea({
  label,
  error,
  className = '',
  id,
  ...props
}) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="font-bold text-xs sm:text-sm text-[#5E6C84] dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition duration-200 outline-none resize-none
          bg-white dark:bg-[#0E1624] 
          text-[#172B4D] dark:text-slate-100
          border-[#DFE1E6] dark:border-[#3E4C5E]
          focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/20
          dark:focus:border-[#4C9AFF] dark:focus:ring-[#4C9AFF]/20
          placeholder-[#7A869A] dark:placeholder-slate-500
          ${error ? 'border-[#BF2600] dark:border-[#FF6369] focus:ring-[#BF2600]/20' : ''}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-[#BF2600] dark:text-[#FF6369] font-medium mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
