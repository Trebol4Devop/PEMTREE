// Contenido del Normativo de la Facultad y del descargo de responsabilidad.
// Migrado desde el antiguo WelcomeModal.jsx (Acta 33-2021).

export const NORMATIVO_RULES = [
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

export const DISCLAIMER = {
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
