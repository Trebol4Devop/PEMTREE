import { useEffect } from 'react';

/**
 * Cierra el modal cuando se presiona la tecla Escape.
 * Se usa únicamente en los modales de onboarding (anuncios, tutorial y ayuda),
 * para no alterar el comportamiento de los modales apilados del foro/grupos.
 */
export default function useCloseOnEscape(onClose) {
  useEffect(() => {
    if (!onClose) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}
