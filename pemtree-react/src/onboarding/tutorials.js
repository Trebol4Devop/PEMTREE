// Contenido de los tutoriales paso a paso por pantalla.
// Cada pantalla tiene un array de `pasos` ({ icon, titulo, descripcion }).
// Los pasos que mencionan las reglas/temática de la facultad o de Supabase
// van marcados con `tema: true` para resaltarlos en el tutorial.

import {
  Network,
  Grid3x3,
  Calendar,
  MessageSquare,
  Users,
  MousePointerClick,
  Eye,
  Route,
  Shield,
  Sparkles,
  Clock,
  Search,
  ZoomIn,
  CheckCircle2,
  Lock,
  Share2,
  ThumbsUp,
  Ban,
  Filter,
  Hand,
  GraduationCap,
  ListChecks,
} from 'lucide-react';

export const SCREEN_KEYS = {
  VISUALIZADOR: 'visualizador',
  PLANIFICADOR: 'planificador',
  HORARIOS: 'horarios',
  FORO: 'foro',
  GRUPOS: 'grupos',
};

export const SCREENS = {
  visualizador: {
    key: 'visualizador',
    titulo: 'Visualizador de Pensum',
    descripcionCorta: 'Explora la malla de tu carrera como un grafo interactivo.',
    pasos: [
      {
        icon: Network,
        titulo: '¿Qué es?',
        descripcion:
          'El Visualizador muestra la malla (pensum) de tu carrera como un grafo de cursos. ' +
          'Cada nodo es un curso y las flechas indican en qué orden debes llevarlos.',
      },
      {
        icon: CheckCircle2,
        titulo: 'Estados de cada curso',
        descripcion:
          'Los nodos se pintan según su estado: completado, cursando, disponible o bloqueado. ' +
          'Marca tus cursos como completados/cursando para que el grafo se actualice y se calculen tus créditos.',
      },
      {
        icon: ZoomIn,
        titulo: 'Navegación',
        descripcion:
          'Haz zoom con los botones +/− y arrastra el lienzo para moverte. Usa el buscador para localizar ' +
          'cualquier curso al instante y haz clic en un nodo para ver sus detalles.',
      },
      {
        icon: Route,
        titulo: 'Ruta crítica',
        descripcion:
          'Activa la ruta crítica para ver tres formas de completar la carrera: la más rápida, la más flexible ' +
          'y la balanceada. Es una herramienta ilustrativa: no garantiza la planificación exacta de tu carrera.',
      },
      {
        icon: Lock,
        titulo: 'Regla: pre-requisitos y post-requisitos',
        tema: true,
        descripcion:
          'El grafo refleja las reglas de la facultad sobre pre-requisitos y post-requisitos: un curso se desbloquea ' +
          'solo cuando cumples sus requisitos. Por eso las flechas siempre van en una sola dirección.',
      },
    ],
  },

  planificador: {
    key: 'planificador',
    titulo: 'Planificador',
    descripcionCorta: 'Organiza tus cursos por semestre y escuela de vacaciones.',
    pasos: [
      {
        icon: Grid3x3,
        titulo: '¿Qué es?',
        descripcion:
          'El Planificador te permite armar tu carga académica por semestres y periodos de vacaciones, arrastrando ' +
          'los cursos desde el panel de cursos disponibles hasta los bloques.',
      },
      {
        icon: MousePointerClick,
        titulo: 'Cómo usarlo',
        descripcion:
          'Arrastra (drag & drop) un curso al bloque semestre o vacaciones donde lo quieras llevar. Los chips ' +
          'repiten los colores del pensum para que reconozcas cada curso fácilmente.',
      },
      {
        icon: Lock,
        titulo: 'Regla: pre-requisitos y post-requisitos',
        tema: true,
        descripcion:
          'Al soltar un curso, el planificador valida las reglas de la facultad sobre pre-requisitos: no podrás ' +
          'colocar un curso si no has planificado antes sus requisitos.',
      },
      {
        icon: Sparkles,
        titulo: 'Avisos y recomendaciones',
        descripcion:
          'Cada curso muestra avisos inteligentes: si abrió en el último ciclo del periodo, si su sección suele ' +
          'tener traslapes y la reputación del catedrático.',
      },
      {
        icon: Clock,
        titulo: 'Regla: horas magistrales en vacaciones',
        tema: true,
        descripcion:
          'En vacaciones hay un máximo de 4 horas de cursos magistrales por día. El planificador te avisa si ' +
          'estás excediendo el límite.',
      },
      {
        icon: GraduationCap,
        titulo: 'Carrera simultánea',
        descripcion:
          'Puedes planificar un segundo pensum (carrera simultánea) y compartir tu plan con otros estudiantes ' +
          'mediante un enlace.',
      },
    ],
  },

  horarios: {
    key: 'horarios',
    titulo: 'Armador de Horarios',
    descripcionCorta: 'Combina secciones sin traslapes y exporta tu horario.',
    pasos: [
      {
        icon: Calendar,
        titulo: '¿Qué es?',
        descripcion:
          'El Armador de Horarios muestra las secciones disponibles de cada curso por periodo (semestre o ' +
          'vacaciones) en una cuadrícula semanal.',
      },
      {
        icon: MousePointerClick,
        titulo: 'Cómo usarlo',
        descripcion:
          'Elige las secciones de tus cursos; se acomodan en la cuadrícula por día y hora. Puedes filtrar por ' +
          'modalidad y buscar cursos.',
      },
      {
        icon: Clock,
        titulo: 'Regla: traslapes',
        tema: true,
        descripcion:
          'El armador aplica las reglas de la facultad sobre traslapes: un traslape de 50 minutos o más es un ' +
          'error; uno menor es solo una advertencia. Laboratorios y prácticas permiten traslaparse con la ' +
          'magistral.',
      },
      {
        icon: ListChecks,
        titulo: 'Validación de tu horario',
        descripcion:
          'Al armar tu horario verás un resumen de conflictos y traslapes menores, para que lo ajustes antes de ' +
          'inscribirte.',
      },
      {
        icon: Share2,
        titulo: 'Exportar',
        descripcion:
          'Exporta tu horario como imagen con el fondo y colores que prefieras, lista para compartir.',
      },
      {
        icon: Eye,
        titulo: 'Datos del ciclo',
        descripcion:
          'Si el portal de la facultad no publicó el periodo vigente, la app te avisa que muestra los datos del ' +
          'ciclo anterior.',
      },
    ],
  },

  foro: {
    key: 'foro',
    titulo: 'Foro',
    descripcionCorta: 'Comunidad anónima para conversar entre estudiantes.',
    pasos: [
      {
        icon: MessageSquare,
        titulo: '¿Qué es?',
        descripcion:
          'El Foro es una comunidad anónima donde puedes publicar, comentar y responder usando tu alias. ' +
          'También puedes dar "me gusta" a las publicaciones.',
      },
      {
        icon: Hand,
        titulo: 'Cómo usarlo',
        descripcion:
          'Elige un alias al entrar (se guarda en tu dispositivo) y publica con respeto. Puedes reportar ' +
          'contenido inapropiado.',
      },
      {
        icon: Shield,
        titulo: 'Reglas de la comunidad ',
        tema: true,
        descripcion:
          'El contenido pasa por moderación automática: lo inapropiado se oculta del público. Solo el autor y ' +
          'los moderadores pueden ver el contenido bloqueado.',
      },
      {
        icon: Ban,
        titulo: 'Anonimato y moderación',
        tema: true,
        descripcion:
          'Tu alias es tu identidad pública; tu usuario real nunca se muestra. Los moderadores aplican las ' +
          'reglas de convivencia y pueden ocultar o eliminar contenido.',
      },
    ],
  },

  grupos: {
    key: 'grupos',
    titulo: 'Grupos Estudiantiles',
    descripcionCorta: 'Directorio de grupos de WhatsApp por carrera y año.',
    pasos: [
      {
        icon: Users,
        titulo: '¿Qué es?',
        descripcion:
          'Esta sección reúne los grupos de WhatsApp de estudiantes por carrera y año de ingreso, para que ' +
          'encuentres tu comunidad.',
      },
      {
        icon: Search,
        titulo: 'Cómo usarlo',
        descripcion:
          'Busca tu carrera y tu promoción, y usa el enlace para unirte. Puedes dar "me gusta" (upvote) a los ' +
          'grupos que te sirvan.',
      },
      {
        icon: Shield,
        titulo: 'Reglas de la comunidad ',
        tema: true,
        descripcion:
          'Los grupos y sus enlaces pasan por moderación: el contenido inapropiado se oculta y los grupos se ' +
          'limpian automáticamente según fechas definidas.',
      },
      {
        icon: Filter,
        titulo: 'Reportar',
        descripcion:
          'Si un enlace es inválido o el grupo no corresponde, puedes reportarlo para que un moderador lo revise.',
      },
      {
        icon: ThumbsUp,
        titulo: 'Votar',
        descripcion:
          'Los grupos con más "me gusta" suben en el listado, así ayudas a que otros estudiantes encuentren ' +
          'los grupos más activos.',
      },
    ],
  },
};
