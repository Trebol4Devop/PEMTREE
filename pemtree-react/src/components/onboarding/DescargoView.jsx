import { ChevronRight } from 'lucide-react';
import { WarningBanner } from '../ui';
import { DISCLAIMER } from '../../onboarding/normativo';

export default function DescargoView({ isDarkMode }) {
  return (
    <div className="space-y-4">
      <WarningBanner>
        <div>
          <h3 className="font-bold text-sm mb-1">{DISCLAIMER.title}</h3>
          <p className="text-xs sm:text-sm leading-relaxed">{DISCLAIMER.text}</p>
        </div>
      </WarningBanner>

      <div className={`rounded-2xl p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] ${isDarkMode ? 'bg-[#1C2636]' : 'bg-[#F4F5F7]'}`}>
        <h4 className={`font-bold text-sm mb-2.5 ${isDarkMode ? 'text-white' : 'text-[#172B4D]'}`}>Lo que debes saber:</h4>
        <ul className="space-y-2">
          {DISCLAIMER.points.map((point, i) => (
            <li key={i} className={`flex items-start gap-2 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
              <span className="text-[#0052CC] dark:text-[#4C9AFF] mt-0.5 flex-shrink-0 font-bold">-</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`rounded-2xl p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] ${isDarkMode ? 'bg-[#1C2636]' : 'bg-[#F4F5F7]'}`}>
        <h4 className={`font-bold text-sm mb-2.5 ${isDarkMode ? 'text-white' : 'text-[#172B4D]'}`}>Enlaces oficiales:</h4>
        <div className="space-y-2">
          {DISCLAIMER.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-xs sm:text-sm font-semibold hover:underline ${isDarkMode ? 'text-[#4C9AFF]' : 'text-[#0052CC]'}`}
            >
              <ChevronRight size={14} className="flex-shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
