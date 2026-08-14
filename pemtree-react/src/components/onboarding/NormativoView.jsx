import { NORMATIVO_RULES } from '../../onboarding/normativo';

function RuleCard({ rule, isDarkMode }) {
  return (
    <div className={`rounded-2xl p-4 border border-[#DFE1E6] dark:border-[#3E4C5E] ${isDarkMode ? 'bg-[#1C2636]' : 'bg-[#F4F5F7]'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#0052CC] dark:bg-[#4C9AFF] text-white dark:text-[#0E1624]">{rule.icon}</span>
        <h3 className={`font-bold text-sm leading-tight ${isDarkMode ? 'text-white' : 'text-[#172B4D]'}`}>{rule.title}</h3>
      </div>
      {rule.description && (
        <p className={`text-xs sm:text-sm leading-relaxed mb-2.5 ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>{rule.description}</p>
      )}
      {rule.table && (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className={`w-full text-xs rounded overflow-hidden min-w-[280px] ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
            <thead>
              <tr className={isDarkMode ? 'bg-[#0E1624]' : 'bg-[#DFE1E6]'}>
                {rule.table[0] && Object.keys(rule.table[0]).map((colKey, ci) => (
                  <th key={ci} className={`text-left px-2.5 py-2 font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap ${isDarkMode ? 'text-slate-200' : 'text-[#172B4D]'}`}>
                    {colKey.charAt(0).toUpperCase() + colKey.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rule.table.map((row, ri) => (
                <tr key={ri} className={`border-t ${isDarkMode ? 'border-[#3E4C5E]' : 'border-[#DFE1E6]'}`}>
                  {Object.entries(row).map(([, val], ci) => (
                    <td key={ci} className={`px-2.5 py-1.5 ${ci > 0 ? 'font-medium' : ''}`}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rule.bullets && rule.bullets.length > 0 && (
        <ul className={`mt-2.5 space-y-1.5 ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
          {rule.bullets.map((b, bi) => (
            <li key={bi} className="flex items-start gap-2 text-xs sm:text-sm">
              <span className="text-[#0052CC] dark:text-[#4C9AFF] mt-0.5 flex-shrink-0 font-bold">-</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {rule.note && (
        <p className={`text-[11px] mt-2 italic ${isDarkMode ? 'text-slate-400' : 'text-[#7A869A]'}`}>{rule.note}</p>
      )}
    </div>
  );
}

export default function NormativoView({ isDarkMode }) {
  return (
    <div className="space-y-3">
      <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
        Resumen del <strong>Normativo General de Evaluacion y Promocion</strong> de la Facultad de Ingenieria, USAC. Consulta el documento completo para detalles.
      </p>
      {NORMATIVO_RULES.map((rule, i) => (
        <RuleCard key={i} rule={rule} isDarkMode={isDarkMode} />
      ))}
    </div>
  );
}
