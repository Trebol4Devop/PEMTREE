import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Visualizer from './pages/Visualizer';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('pemtree_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pemtree_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pemtree_theme', 'light');
    }
    window.dispatchEvent(new Event('themeChanged'));
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-100 font-sans antialiased transition-colors duration-300">
        <Navbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />
        <main className="flex-grow flex flex-col overflow-hidden w-full h-[calc(100vh-56px)] relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/visualizador" element={<Visualizer />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;