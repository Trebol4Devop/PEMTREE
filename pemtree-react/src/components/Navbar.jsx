import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu, CheckCircle2, Sun, Moon } from 'lucide-react';

export default function Navbar({ isDarkMode, onToggleTheme }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const location = useLocation();
    const currentView = location.pathname === '/visualizador' ? 'board' : 'home';

    return (
        <nav className="h-14 border-b border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] sticky top-0 z-40 px-4 flex items-center justify-between transition-colors duration-300 shrink-0 select-none">
            <div className="flex items-center space-x-6">
                <Link to="/" className="flex items-center space-x-2 font-bold text-[19px] tracking-tight hover:opacity-85 transition bg-transparent border-none cursor-pointer no-underline">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center">
                        <img src="/images/logo_trebol.png" alt="PEMTREE Logo" className="w-6 h-6 logo-trebol-blue" />
                    </span>
                    <span className="font-extrabold tracking-tight text-[#013ea6] dark:text-slate-100">PEMTREE</span>
                </Link>

                <div className="hidden lg:flex items-center space-x-4 text-sm font-medium text-[#42526E] dark:text-slate-300">
                    <Link to="/" className={`px-3 py-1.5 rounded transition cursor-pointer no-underline ${currentView === 'home' ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] font-semibold' : 'hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E]'}`}>
                        Inicio Portal
                    </Link>
                    <Link to="/visualizador" className={`px-3 py-1.5 rounded transition cursor-pointer no-underline ${currentView === 'board' ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] font-semibold' : 'hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E]'}`}>
                        Visualizador Board
                    </Link>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                <button 
                    onClick={onToggleTheme} 
                    className="p-1.5 rounded-full hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] cursor-pointer border-none bg-transparent flex items-center justify-center text-[#5E6C84] dark:text-slate-300"
                >
                    {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
                </button>

                <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-[#EEF2F6] dark:bg-[#0E1624] rounded-full text-xs font-semibold border border-[#E1E6EB] dark:border-[#3E4C5E]">
                    <CheckCircle2 size={13} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                    <span className="text-[#172B4D] dark:text-slate-300">PENSUM CLAR</span>
                </div>

                {currentView !== 'board' && (
                    <Link to="/visualizador" className="bg-[#0052CC] hover:bg-[#0747A6] dark:bg-[#4C9AFF] dark:hover:bg-[#2684FF] dark:text-[#0E1624] text-white text-xs font-bold px-3.5 py-1.5 rounded transition shadow-sm cursor-pointer no-underline">
                        Abrir Board
                    </Link>
                )}

                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] text-[#172B4D] dark:text-slate-200 cursor-pointer bg-transparent border-none flex items-center justify-center">
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="absolute top-14 left-0 w-full bg-white dark:bg-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-3 px-4 flex flex-col space-y-2 text-sm font-semibold z-30 lg:hidden shadow-lg">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-3 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] no-underline ${currentView === 'home' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200'}`}>
                        Inicio Portal
                    </Link>
                    <Link to="/visualizador" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-3 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] no-underline ${currentView === 'board' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200'}`}>
                        Visualizador Board
                    </Link>
                </div>
            )}
        </nav>
    );
}