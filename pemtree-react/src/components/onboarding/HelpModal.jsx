import { useState } from 'react';
import { BookOpen, Info, AlertTriangle, Megaphone } from 'lucide-react';
import { Modal } from '../ui';
import { SCREENS } from '../../onboarding/tutorials';
import TutorialSlides from './TutorialSlides';
import AnnouncementsList from './AnnouncementsList';
import NormativoView from './NormativoView';
import DescargoView from './DescargoView';
import useCloseOnEscape from './useCloseOnEscape';

const TABS = [
  { id: 'tutorial', label: 'Tutorial', shortLabel: 'Tuto', icon: Info },
  { id: 'anuncios', label: 'Anuncios', shortLabel: 'Anun', icon: Megaphone },
  { id: 'normativo', label: 'Normativo', shortLabel: 'Norm', icon: BookOpen },
  { id: 'descargo', label: 'Descargo', shortLabel: 'Info', icon: AlertTriangle },
];

/**
 * Centro de ayuda de una pantalla (abierto con el botón "?"):
 * tutorial de la pantalla + anuncios + normativo + descargo.
 */
export default function HelpModal({ screenKey, isDarkMode, onClose }) {
  const [activeTab, setActiveTab] = useState('tutorial');
  const screen = SCREENS[screenKey];

  useCloseOnEscape(onClose);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={screen ? `Ayuda: ${screen.titulo}` : 'Centro de ayuda'}
      icon={Info}
      size="lg"
      className="max-w-[720px]"
    >
      <div className={`flex border-b -mx-5 -mt-5 mb-4 ${isDarkMode ? 'border-[#3E4C5E]' : 'border-[#DFE1E6]'}`}>
        {TABS.map((tab) => {
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
        {activeTab === 'tutorial' && (
          <TutorialSlides screenKey={screenKey} isDarkMode={isDarkMode} onFinish={onClose} />
        )}
        {activeTab === 'anuncios' && <AnnouncementsList isDarkMode={isDarkMode} />}
        {activeTab === 'normativo' && <NormativoView isDarkMode={isDarkMode} />}
        {activeTab === 'descargo' && <DescargoView isDarkMode={isDarkMode} />}
      </div>
    </Modal>
  );
}
