import { useState } from 'react';
import { BookOpen, Info, AlertTriangle, ChevronRight } from 'lucide-react';
import { Modal, WarningBanner, Button } from './ui';

const NORMATIVO_RULES = [
  {
    title: 'Evaluacion del curso (ponderaciones)',
    icon: '1',
    description: 'La nota final se compone de:',
    table: [
      { concepto: 'Zona (actividades + parciales)', porcentaje: '75%', detalle: 'Parciales max 2/3 de zona. Labs: 40% o 80% segun area.' },
      { concepto: 'Examen final', porcentaje: '25%', detalle: 'Obligatorio si no se exime.' },
    ],
  },
  {
    title: 'Notas minimas y promocion',
    icon: '2',
    description: 'Nota de aprobacion del curso: 61 sobre 100.',
    bullets: [
      'Zona minima para derecho a examen final o recuperacion: 36 puntos.',
      'Si no se alcanza 36, se pierde el curso automaticamente.',
      'Exencion de examen final: zona >= 61 (verifica con tu catedratico).',
    ],
  },
  {
    title: 'Asignacion de cursos - Limite de creditos CLAR (Art. 16)',
    icon: '3',
    description: 'Segun tu promedio acumulado:',
    table: [
      { promedio: '70 o menos', max: '32 creditos' },
      { promedio: '71 - 85', max: '37 creditos' },
      { promedio: '86 - 100', max: '42 creditos' },
      { promedio: '+ Carrera simultanea', max: '+ 5 creditos extra' },
    ],
    note: 'Maximo 3 veces en semestre + 3 veces en escuela de vacaciones por curso. Con pensum antiguo: hasta 48 creditos.',
  },
  {
    title: 'Recuperaciones (primera y segunda retrasada)',
    icon: '4',
    description: 'Derecho a recuperacion: zona >= 36 y pago/asignacion de recuperacion.',
    bullets: [
      'Se pueden presentar dos recuperaciones por curso, despues del examen final.',
      'Para subir nota: si ya aprobaste, puedes presentar recuperacion para mejorar (solicitar a Control Academico).',
    ],
  },
  {
    title: 'Evaluacion por suficiencia (Art. 48-56)',
    icon: '5',
    description: 'Forma de eximir un curso mediante examen.',
    bullets: [
      'Cursos area basica: max 24 creditos totales.',
      'Cualquier otro curso: max 2 suficiencias por ano.',
      'Nota minima para aprobar: 80 puntos.',
      'Solo 1 suficiencia por curso; si repruebas, debes cursarlo normalmente.',
      'Pierdes derecho si has reprobado o no te has presentado a 3 suficiencias in total.',
    ],
  },
  {
    title: 'Graduacion y distinciones',
    icon: '6',
    description: 'Opciones de graduacion: Examen Tecnico Profesional + Tesis / EPS (3 o 6 meses) / Informe de maestria.',
    bullets: [
      'Cum Laude: promedio >= 85',
      'Magna Cum Laude: promedio >= 90',
      'Summa Cum Laude: promedio >= 95',
      'Requisito adicional: no mas de 10 equivalencias.',
    ],
  },
  {
    title: 'Requisitos adicionales importantes',
    icon: '7',
    description: '',
    bullets: [
      'Ingles (carnet 2008 en adelante): Aprobar Idioma Tecnico 1, 2, 3 y 4.',
      'Practicas (EPS): Areas Inicial, Intermedia y Final segun pensum CLAR.',
      'Cada semestre: 30 creditos CLAR. Area Social Humanistica: min 8 de 10 CLAR.',
      'Seminario de Investigacion obligatorio (o de EPS segun modalidad).',
    ],
  },
  {
    title: 'Derechos y deberes',
    icon: '8',
    description: '',
    bullets: [
      'Revision de examen: 3 dias habiles despues de publicada la nota.',
      'Fraude o filtracion: anulacion de la prueba y posible sancion disciplinaria.',
      'Inasistencia a examen final: se registra "No se presento" (-1). Causa justificada: examen extemporaneo (solicitar en 3 dias habiles).',
    ],
  },
  {
    title: 'Congelamiento de zona (Art. 19)',
    icon: '9',
    description: 'Si llevas un curso post-requisito y el prerrequisito esta en segunda recuperacion del semestre anterior, puedes congelar la zona del post-requisito con minimo 45 puntos. La zona congelada sirve solo para las dos recuperaciones de ese post-requisito.',
  },
];

const DISCLAIMER = {
  title: 'Pagina no oficial',
  icon: '!',
  text: 'PEMTREE no es una pagina oficial de la Universidad de San Carlos de Guatemala ni de la Facultad de Ingenieria. Es una herramienta informativa creada por estudiantes para estudiantes.',
  points: [
    'Los datos de pensum se basan en informacion publica disponible.',
    'Las reglas mostradas provienen del Normativo General de Evaluacion y Promocion de la Facultad (Acta 33-2021).',
    'Para informacion oficial, consulta siempre los portales de la Facultad de Ingenieria.',
    'Esta herramienta no almacena ni comparte tus datos personales.',
  ],
  links: [
    { label: 'Portal de Ingeniería', url: 'https://portal.ingenieria.usac.edu.gt' },
    { label: 'Redes de Estudio', url: 'https://redesestudio.ingenieria.usac.edu.gt/redesDeEstudio' },
    { label: 'Normativo PDF (Acta 33-2021)', url: 'https://portal.ingenieria.usac.edu.gt/reglamentos/NormativoGeneral_Evaluacion_y_Promocion.pdf' },
  ],
};

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

export default function WelcomeModal({ isDarkMode, guiaSrc, onClose }) {
  const [activeTab, setActiveTab] = useState('normativo');

  const tabs = [
    { id: 'normativo', label: 'Normativo', shortLabel: 'Norm', icon: BookOpen },
    { id: 'guia', label: 'Guia de Uso', shortLabel: 'Guia', icon: Info },
    { id: 'descargo', label: 'Descargo', shortLabel: 'Info', icon: AlertTriangle },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Bienvenido a PEMTREE"
      size="lg"
      className="max-w-[720px]"
      footer={
        <Button onClick={onClose} variant="primary" className="max-sm:w-full">
          Entendido
        </Button>
      }
    >
      <div className={`flex border-b -mx-5 -mt-5 mb-4 ${isDarkMode ? 'border-[#3E4C5E]' : 'border-[#DFE1E6]'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 max-sm:gap-1 px-2 py-3 text-sm max-sm:text-xs font-semibold transition border-b-2 border-t-0 border-x-0 bg-transparent cursor-pointer ${isActive
                ? 'border-[#0052CC] text-[#0052CC] dark:border-[#4C9AFF] dark:text-[#4C9AFF]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]')
              }`}
            >
              <Icon size={14} className="max-sm:hidden flex-shrink-0" />
              <span className="hidden max-sm:inline">{tab.shortLabel}</span>
              <span className="max-sm:hidden">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {activeTab === 'normativo' && (
          <div className="space-y-3">
            <p className={`text-xs sm:text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-[#5E6C84]'}`}>
              Resumen del <strong>Normativo General de Evaluacion y Promocion</strong> de la Facultad de Ingenieria, USAC. Consulta el documento completo para detalles.
            </p>
            {NORMATIVO_RULES.map((rule, i) => (
              <RuleCard key={i} rule={rule} isDarkMode={isDarkMode} />
            ))}
          </div>
        )}

        {activeTab === 'guia' && (
          <div className="text-center">
            <img
              src={guiaSrc}
              alt="Guia de uso de PEMTREE"
              onError={(e) => { e.currentTarget.src = '/images/Guia_de_uso.png'; }}
              className="max-w-full max-h-[58vh] max-sm:max-h-[55vh] mx-auto rounded-2xl shadow object-contain"
            />
          </div>
        )}

        {activeTab === 'descargo' && (
          <div className="space-y-4">
            <WarningBanner
              message={
                <div>
                  <h3 className="font-bold text-sm mb-1">{DISCLAIMER.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed">{DISCLAIMER.text}</p>
                </div>
              }
            />

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
        )}
      </div>
    </Modal>
  );
}