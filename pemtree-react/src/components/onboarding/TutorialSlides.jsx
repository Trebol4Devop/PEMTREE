import { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '../ui';
import { SCREENS } from '../../onboarding/tutorials';

/**
 * Slides reutilizables del tutorial de una pantalla. Contenido completo
 * (paso actual + navegación). Lo usan el TutorialModal y el centro de ayuda.
 */
export default function TutorialSlides({ screenKey, isDarkMode, onFinish, onOpenHelp }) {
  const screen = SCREENS[screenKey];
  const [step, setStep] = useState(0);

  if (!screen || !Array.isArray(screen.pasos) || screen.pasos.length === 0) {
    return null;
  }

  const pasos = screen.pasos;
  const total = pasos.length;
  const actual = pasos[step];
  const Icono = actual.icon;
  const isLast = step === total - 1;

  const next = () => {
    if (isLast) {
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <p className={`text-xs sm:text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-[#7A869A]'}`}>
        {screen.descripcionCorta}
      </p>

      <div className={`rounded-2xl p-4 sm:p-5 border transition-colors ${isDarkMode ? 'bg-[#1C2636] border-[#3E4C5E]' : 'bg-[#F4F5F7] border-[#DFE1E6]'}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${isDarkMode ? 'bg-[#0C295E] text-[#4C9AFF]' : 'bg-[#DEEBFF] text-[#0052CC]'}`}>
            <Icono size={18} className="sm:hidden" />
            <Icono size={22} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            {actual.tema && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${isDarkMode ? 'bg-[#3E4C5E] text-slate-200' : 'bg-[#DFE1E6] text-[#172B4D]'}`}>
                <Info size={11} />
                Reglas
              </span>
            )}
            <h3 className={`font-bold text-base sm:text-lg leading-tight mb-2 ${isDarkMode ? 'text-white' : 'text-[#172B4D]'}`}>
              {actual.titulo}
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
              {actual.descripcion}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap mt-4">
        <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-[#7A869A]'}`}>
          Paso {step + 1} de {total}
        </span>
        <div className="flex items-center gap-1.5">
          {pasos.map((p, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Ir al paso ${i + 1}: ${p.titulo}`}
              className={`h-2 rounded-full transition-all cursor-pointer border-none p-0 ${i === step ? 'w-6 bg-[#0052CC] dark:bg-[#4C9AFF]' : 'w-2 bg-[#DFE1E6] dark:bg-[#3E4C5E] hover:bg-[#B3BAC5] dark:hover:bg-[#4C586A]'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 mt-5">
        <Button variant="ghost" size="md" onClick={onFinish} className="max-sm:px-2.5 max-sm:py-1.5 max-sm:text-xs">
          Saltar
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="max-sm:px-2.5 max-sm:py-1.5 max-sm:text-xs"
        >
          <ChevronLeft size={16} className="mr-1" />
          Anterior
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={next}
          className="max-sm:px-2.5 max-sm:py-1.5 max-sm:text-xs"
        >
          {isLast ? 'Entendido' : 'Siguiente'}
          {!isLast && <ChevronRight size={16} className="ml-1" />}
        </Button>
      </div>

      {onOpenHelp && (
        <button
          onClick={onOpenHelp}
          className={`mt-3 self-start max-sm:w-full max-sm:text-center text-xs font-semibold underline underline-offset-2 cursor-pointer border-none bg-transparent p-0 ${isDarkMode ? 'text-[#4C9AFF] hover:text-[#85C4FF]' : 'text-[#0052CC] hover:text-[#0747A6]'}`}
        >
          Ver también normativo y descargo
        </button>
      )}
    </div>
  );
}
