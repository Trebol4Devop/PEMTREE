import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { OnboardingProvider } from './context/OnboardingContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Visualizer from './pages/Visualizer';
import Maintenance from './pages/Maintenance';
import AuthCallback from './pages/AuthCallback';
import Normas from './pages/Normas';

function AppLayout() {
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Si el proveedor OAuth o la web comunitaria nos redirigió con ?code= a otra ruta (o con /**)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('code') && location.pathname !== '/auth/callback') {
      navigate(`/auth/callback${location.search}${location.hash}`, { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      <Navbar isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
      <main className="flex-grow flex flex-col overflow-hidden w-full h-[calc(100dvh-56px)] max-md:h-[calc(100dvh-48px)] relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/visualizador" element={<Visualizer />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/foro" element={<Maintenance />} />
          <Route path="/grupos" element={<Maintenance />} />
          <Route path="/normas" element={<Normas />} />
          <Route path="/mis-publicaciones" element={<Maintenance />} />
          <Route path="/notificaciones" element={<Maintenance />} />
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
          <OnboardingProvider>
            <AppLayout />
          </OnboardingProvider>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
