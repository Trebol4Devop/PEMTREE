import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu, CheckCircle2, Sun, Moon } from 'lucide-react';

export default function Navbar({ isDarkMode, onToggleTheme }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const location = useLocation();
    const currentView = location.pathname === '/visualizador' ? 'board' : 'home';

    return (
        <nav className="h-12 sm:h-14 border-b border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] sticky top-0 z-40 px-2 sm:px-4 flex items-center justify-between transition-colors duration-300 shrink-0 select-none">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                <Link to="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-sm sm:text-base tracking-tight hover:opacity-85 transition bg-transparent border-none cursor-pointer no-underline shrink-0">
                    <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0">
                        <img src="/images/logo_trebol.png" alt="PEMTREE Logo" className="w-5 h-5 sm:w-6 sm:h-6 logo-trebol-blue" />
                    </span>
                    <span className="font-extrabold tracking-tight text-[#013ea6] dark:text-slate-100 hidden sm:inline">PEMTREE</span>
                </Link>

                <div className="hidden lg:flex items-center gap-2 lg:gap-4 text-xs sm:text-sm font-medium text-[#42526E] dark:text-slate-300">
                    <Link to="/" className={`px-2 sm:px-3 py-1.5 rounded transition cursor-pointer no-underline whitespace-nowrap ${currentView === 'home' ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] font-semibold' : 'hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E]'}`}>
                        Inicio Portal
                    </Link>
                    <Link to="/visualizador" className={`px-2 sm:px-3 py-1.5 rounded transition cursor-pointer no-underline whitespace-nowrap ${currentView === 'board' ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] font-semibold' : 'hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E]'}`}>
                        Visualizador Board
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
                <button 
                    onClick={onToggleTheme} 
                    className="p-1 sm:p-1.5 rounded-full hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] cursor-pointer border-none bg-transparent flex items-center justify-center text-[#5E6C84] dark:text-slate-300"
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? <Sun size={16} className="sm:w-5 sm:h-5 text-yellow-400" /> : <Moon size={16} className="sm:w-5 sm:h-5" />}
                </button>

                <div className="hidden sm:flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-[#EEF2F6] dark:bg-[#0E1624] rounded-full text-[0.65rem] sm:text-xs font-semibold border border-[#E1E6EB] dark:border-[#3E4C5E] whitespace-nowrap">
                    <CheckCircle2 size={11} className="sm:w-3.5 sm:h-3.5 text-[#0052CC] dark:text-[#4C9AFF] flex-shrink-0" />
                    <span className="text-[#172B4D] dark:text-slate-300">PENSUM</span>
                </div>

                {currentView !== 'board' && (
                    <Link to="/visualizador" className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white text-[0.7rem] sm:text-xs font-bold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded transition shadow-sm cursor-pointer no-underline whitespace-nowrap">
                        Abrir Board
                    </Link>
                )}

                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] text-[#172B4D] dark:text-slate-200 cursor-pointer bg-transparent border-none flex items-center justify-center"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="absolute top-12 sm:top-14 left-0 w-full bg-white dark:bg-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-2 px-2 flex flex-col gap-1 text-xs sm:text-sm font-semibold z-30 lg:hidden shadow-lg">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] no-underline ${currentView === 'home' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200'}`}>
                        Inicio Portal
                    </Link>
                    <Link to="/visualizador" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] no-underline ${currentView === 'board' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200'}`}>
                        Visualizador Board
                    </Link>
                </div>
            )}
        </nav>
    );
}