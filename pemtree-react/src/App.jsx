import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { OnboardingProvider } from './context/OnboardingContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Visualizer from './pages/Visualizer';
import Forum from './pages/Forum';
import WhatsAppGroups from './pages/WhatsAppGroups';
import Normas from './pages/Normas';
import MyPosts from './pages/MyPosts';
import Notifications from './pages/Notifications';

function AppLayout() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      <Navbar isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
      <main className="flex-grow flex flex-col overflow-hidden w-full h-[calc(100dvh-56px)] max-md:h-[calc(100dvh-48px)] relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/visualizador" element={<Visualizer />} />
          <Route path="/foro" element={<Forum />} />
          <Route path="/grupos" element={<WhatsAppGroups />} />
          <Route path="/normas" element={<Normas />} />
          <Route path="/mis-publicaciones" element={<MyPosts />} />
          <Route path="/notificaciones" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <NotificationsProvider>
            <OnboardingProvider>
              <AppLayout />
            </OnboardingProvider>
          </NotificationsProvider>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
