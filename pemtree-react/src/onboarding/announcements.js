// Anuncios de la aplicación. Este contenido es estático (hardcoded en el repo).
// Para publicar un anuncio nuevo: agrega un objeto al array. El modal global
// muestra estos anuncios UNA sola vez por usuario (ver `pemtree_anuncios_visto`).

export const ANUNCIOS = [
  {
    id: 'bienvenida-nuevo-sistema',
    titulo: '¡Bienvenido al nuevo sistema de tutoriales!',
    fecha: '2026-08-14',
    cuerpo:
      'Cada sección de PEMTREE cuenta con su propia guía paso a paso para que aprendas a usarla: ' +
      'Visualizador, Planificador y Armador de Horarios. ' +
      'Abre el tutorial de la pantalla en la que estés y, si tienes dudas, usa el botón de ayuda (?).',
  },
  {
    id: 'sistema-recomendaciones',
    titulo: 'Sistema de recomendaciones',
    fecha: '2026-08-14',
    cuerpo:
      'El planificador te avisa cuándo conviene llevar un curso: apertura en el ciclo, traslapes ' +
      'de sección, reputación de catedráticos y el límite de horas magistrales en vacaciones.',
  },
];
