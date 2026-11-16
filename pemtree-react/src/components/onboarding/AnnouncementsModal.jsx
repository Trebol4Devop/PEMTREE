import { Megaphone } from 'lucide-react';
import { Modal, Button } from '../ui';
import AnnouncementsList from './AnnouncementsList';
import useCloseOnEscape from './useCloseOnEscape';

/**
 * Ventana global de anuncios. Se muestra UNA sola vez al usuario, en la
 * primera de las 5 pantallas que abra.
 */
export default function AnnouncementsModal({ isDarkMode, onClose }) {
  useCloseOnEscape(onClose);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Anuncios"
      icon={Megaphone}
      size="lg"
      className="max-w-[640px]"
      footer={
        <Button onClick={onClose} variant="primary" className="max-sm:w-full">
          Entendido
        </Button>
      }
    >
      <AnnouncementsList isDarkMode={isDarkMode} />
    </Modal>
  );
}
