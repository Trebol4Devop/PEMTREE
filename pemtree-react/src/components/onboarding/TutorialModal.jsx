import { Modal } from '../ui';
import { SCREENS } from '../../onboarding/tutorials';
import TutorialSlides from './TutorialSlides';
import useCloseOnEscape from './useCloseOnEscape';

/**
 * Asistente paso a paso (slides) de una pantalla.
 * Se muestra la primera vez que se entra a cada pantalla y también se puede
 * reabrir desde el botón de ayuda (?).
 */
export default function TutorialModal({ screenKey, isDarkMode, onClose, onOpenHelp }) {
  const screen = SCREENS[screenKey];

  useCloseOnEscape(onClose);

  if (!screen) {
    return null;
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={screen.titulo}
      size="lg"
      className="max-w-[640px]"
    >
      <TutorialSlides
        screenKey={screenKey}
        isDarkMode={isDarkMode}
        onFinish={onClose}
        onOpenHelp={onOpenHelp}
      />
    </Modal>
  );
}
