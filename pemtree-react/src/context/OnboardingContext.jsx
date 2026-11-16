/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { ANUNCIOS_KEY, BIENVENIDA_KEY } from '../onboarding/storage';
import AnnouncementsModal from '../components/onboarding/AnnouncementsModal';
import TutorialModal from '../components/onboarding/TutorialModal';
import HelpModal from '../components/onboarding/HelpModal';

const OnboardingContext = createContext(null);

/**
 * Sistema global de bienvenida:
 * - La ventana de anuncios se muestra UNA sola vez, en la primera de las
 *   5 pantallas que se abra (nunca en la Home).
 * - Cada pantalla tiene su tutorial, que se muestra una vez (primera visita).
 * - El botón de ayuda (?) reabre el centro de ayuda (tutorial + anuncios +
 *   normativo + descargo).
 *
 * Las pantallas se "registran" llamando a `useScreenWelcome(key)` en el
 * montaje; el provider renderiza los modales a nivel global.
 */
export function OnboardingProvider({ children }) {
  const { isDarkMode } = useTheme();
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [tutorialScreen, setTutorialScreen] = useState(null);
  const [helpScreen, setHelpScreen] = useState(null);
  const currentScreenRef = useRef(null);

  const registerScreen = useCallback((key) => {
    currentScreenRef.current = key;
    let anunciosVistos = false;
    try {
      anunciosVistos = localStorage.getItem(ANUNCIOS_KEY) === 'true';
    } catch {
      /* localStorage no disponible */
    }

    if (!anunciosVistos) {
      setAnnouncementsOpen(true);
      return;
    }

    let bienvenidaVista = false;
    try {
      bienvenidaVista = localStorage.getItem(BIENVENIDA_KEY(key)) === 'true';
    } catch {
      /* localStorage no disponible */
    }
    if (!bienvenidaVista) {
      setTutorialScreen(key);
    }
  }, []);

  const dismissAnnouncements = useCallback(() => {
    try {
      localStorage.setItem(ANUNCIOS_KEY, 'true');
    } catch {
      /* localStorage no disponible */
    }
    setAnnouncementsOpen(false);
    const key = currentScreenRef.current;
    if (key) {
      let bienvenidaVista = false;
      try {
        bienvenidaVista = localStorage.getItem(BIENVENIDA_KEY(key)) === 'true';
      } catch {
        /* localStorage no disponible */
      }
      if (!bienvenidaVista) {
        setTutorialScreen(key);
      }
    }
  }, []);

  const dismissTutorial = useCallback((key) => {
    if (key) {
      try {
        localStorage.setItem(BIENVENIDA_KEY(key), 'true');
      } catch {
        /* localStorage no disponible */
      }
    }
    setTutorialScreen(null);
  }, []);

  const openHelp = useCallback((key) => {
    setHelpScreen(key || currentScreenRef.current);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpScreen(null);
  }, []);

  const value = useMemo(
    () => ({
      registerScreen,
      dismissAnnouncements,
      dismissTutorial,
      openHelp,
      closeHelp,
    }),
    [registerScreen, dismissAnnouncements, dismissTutorial, openHelp, closeHelp],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}

      {announcementsOpen && (
        <AnnouncementsModal
          isDarkMode={isDarkMode}
          onClose={dismissAnnouncements}
        />
      )}

      {tutorialScreen && (
        <TutorialModal
          screenKey={tutorialScreen}
          isDarkMode={isDarkMode}
          onClose={() => dismissTutorial(tutorialScreen)}
          onOpenHelp={() => {
            dismissTutorial(tutorialScreen);
            openHelp(tutorialScreen);
          }}
        />
      )}

      {helpScreen && (
        <HelpModal
          screenKey={helpScreen}
          isDarkMode={isDarkMode}
          onClose={closeHelp}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding debe usarse dentro de <OnboardingProvider>');
  }
  return ctx;
}

/**
 * Registra la pantalla en el sistema de bienvenida y expone `openHelp`,
 * para el botón de ayuda de cada pantalla.
 * `key` debe ser una de `SCREEN_KEYS`.
 */
export function useScreenWelcome(key) {
  const { registerScreen, openHelp } = useOnboarding();

  useEffect(() => {
    registerScreen(key);
  }, [key, registerScreen]);

  return useMemo(() => ({ openHelp: () => openHelp(key) }), [openHelp, key]);
}
