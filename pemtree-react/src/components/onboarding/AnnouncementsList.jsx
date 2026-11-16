import { ANUNCIOS } from '../../onboarding/announcements';

/**
 * Lista de anuncios (contenido). La usan la ventana global de anuncios y el
 * centro de ayuda.
 */
export default function AnnouncementsList({ isDarkMode }) {
  return (
    <div className="space-y-3">
      <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#7A869A]'}`}>
        Novedades importantes de PEMTREE:
      </p>
      {ANUNCIOS.map((anuncio) => (
        <div
          key={anuncio.id}
          className={`rounded-2xl p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] ${isDarkMode ? 'bg-[#1C2636]' : 'bg-[#F4F5F7]'}`}
        >
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className={`font-bold text-sm sm:text-base leading-tight ${isDarkMode ? 'text-white' : 'text-[#172B4D]'}`}>
              {anuncio.titulo}
            </h3>
            {anuncio.fecha && (
              <span className={`text-[10px] font-semibold whitespace-nowrap mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-[#7A869A]'}`}>
                {anuncio.fecha}
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
            {anuncio.cuerpo}
          </p>
        </div>
      ))}
    </div>
  );
}
