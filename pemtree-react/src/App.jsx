import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Visualizer from './pages/Visualizer';
import Forum from './pages/Forum';

function AppLayout() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      <Navbar isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
      <main className="flex-grow flex flex-col overflow-hidden w-full h-[calc(100vh-56px)] relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/visualizador" element={<Visualizer />} />
          <Route path="/foro" element={<Forum />} />
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
          <AppLayout />
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
