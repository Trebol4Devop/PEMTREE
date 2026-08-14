// Claves de localStorage del sistema de bienvenida/anuncios.
// - ANUNCIOS_KEY: la ventana global de anuncios se muestra UNA sola vez en
//   cualquiera de las 5 pantallas (no en la Home).
// - BIENVENIDA_KEY(pantalla): el tutorial de cada pantalla se muestra una vez.

export const ANUNCIOS_KEY = 'pemtree_anuncios_visto';

export function BIENVENIDA_KEY(screenKey) {
  return `pemtree_bienvenida_${screenKey}`;
}
