import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu, CheckCircle2, Sun, Moon, Home as HomeIcon, Coffee } from 'lucide-react';

export default function Navbar({ isDarkMode, onToggleTheme }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const location = useLocation();
    const isNotHome = location.pathname !== '/';
    const currentView = (() => {
        if (location.pathname === '/visualizador') {
            const params = new URLSearchParams(location.search);
            const v = params.get('view');
            if (v === 'planner') return 'planner';
            if (v === 'schedule') return 'schedule';
            return 'graph';
        }
        if (location.pathname === '/foro') return 'forum';
        if (location.pathname === '/grupos') return 'groups';
        return 'home';
    })();

    const boardLinkClass = (active) =>
        `px-2 sm:px-3 py-1.5 rounded transition cursor-pointer no-underline whitespace-nowrap text-xs sm:text-sm font-medium ${
            active
                ? 'bg-[#DEEBFF] dark:bg-[#0C295E] text-[#0052CC] dark:text-[#4C9AFF] font-semibold'
                : 'text-[#5E6C84] dark:text-slate-300 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'
        }`;

    const homeLinkClass = 'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded transition cursor-pointer no-underline shrink-0 text-sm sm:text-base tracking-tight font-bold';

    return (
        <nav className="h-12 sm:h-14 border-b border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] sticky top-0 z-40 px-2 sm:px-4 flex items-center justify-between transition-colors duration-300 shrink-0 select-none">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                <Link to="/" className={homeLinkClass}>
                    <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0">
                        <img src="/images/logo_trebol.png" alt="PEMTREE Logo" className="w-5 h-5 sm:w-6 sm:h-6 logo-trebol-blue" />
                    </span>
                    <span className="font-extrabold tracking-tight text-[#0052CC] dark:text-slate-100 hidden sm:inline">PEMTREE</span>
                </Link>

                <div className="hidden lg:flex items-center gap-1 lg:gap-2 text-xs sm:text-sm font-medium">
                    <Link to="/visualizador" className={boardLinkClass(currentView === 'graph')}>
                        Visualizador
                    </Link>
                    <Link to="/visualizador?view=planner" className={boardLinkClass(currentView === 'planner')}>
                        Planificador
                    </Link>
                    <Link to="/visualizador?view=schedule" className={boardLinkClass(currentView === 'schedule')}>
                        Horarios
                    </Link>
                    <Link to="/foro" className={boardLinkClass(currentView === 'forum')}>
                        Foro anonimo
                    </Link>
                    <Link to="/grupos" className={boardLinkClass(currentView === 'groups')}>
                        Grupos Estudiantiles
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
                <a
                    href="https://buymeacoffee.com/trebol4devop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#F4F5F7] dark:bg-[#0E1624] hover:bg-[#EBECF0] dark:hover:bg-[#2E3C50] text-[#172B4D] dark:text-slate-300 border border-[#DFE1E6] dark:border-[#3E4C5E] text-[0.65rem] sm:text-xs font-semibold no-underline transition"
                    title="Donar con Buy Me a Coffee"
                >
                    <Coffee size={12} className="text-[#5E6C84] dark:text-slate-400 shrink-0" />
                    <span className="hidden md:inline">Coffee</span>
                </a>
                <a
                    href="https://www.paypal.com/paypalme/TrebolDevop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#F4F5F7] dark:bg-[#0E1624] hover:bg-[#EBECF0] dark:hover:bg-[#2E3C50] text-[#172B4D] dark:text-slate-300 border border-[#DFE1E6] dark:border-[#3E4C5E] text-[0.65rem] sm:text-xs font-semibold no-underline transition"
                    title="Donar con PayPal"
                >
                    <svg className="w-3 h-3 fill-[#5E6C84] dark:fill-slate-400 shrink-0" viewBox="0 0 24 24">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.641.641 0 0 1 .632-.54H11.2c2.478 0 4.414.53 5.753 1.577 1.343 1.049 1.954 2.651 1.819 4.763-.15 2.34-1.123 4.184-2.894 5.483-1.768 1.298-4.148 1.956-7.074 1.956H7.818l-.742 4.378z"/>
                    </svg>
                    <span className="hidden md:inline">PayPal</span>
                </a>

                <button
                    onClick={onToggleTheme}
                    className="p-1 sm:p-1.5 rounded-full hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] cursor-pointer border-none bg-transparent flex items-center justify-center text-[#5E6C84] dark:text-slate-300"
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? <Sun size={16} className="sm:w-5 sm:h-5 text-yellow-400" /> : <Moon size={16} className="sm:w-5 sm:h-5" />}
                </button>

                <div className="hidden sm:flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-[#F4F5F7] dark:bg-[#0E1624] rounded-full text-[0.65rem] sm:text-xs font-semibold border border-[#E1E6EB] dark:border-[#3E4C5E] whitespace-nowrap">
                    <CheckCircle2 size={11} className="sm:w-3.5 sm:h-3.5 text-[#0052CC] dark:text-[#4C9AFF] flex-shrink-0" />
                    <span className="text-[#172B4D] dark:text-slate-300">PENSUM</span>
                </div>

                {isNotHome ? (
                    <Link to="/" className="flex items-center gap-1 sm:gap-1.5 bg-[#F4F5F7] hover:bg-[#EBECF0] dark:bg-[#0E1624] dark:hover:bg-[#2E3C50] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] text-[0.7rem] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded transition shadow-xs cursor-pointer no-underline whitespace-nowrap">
                        <HomeIcon size={14} className="text-[#0052CC] dark:text-[#4C9AFF]" />
                        <span>Inicio</span>
                    </Link>
                ) : (
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
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded no-underline ${currentView === 'home' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'}`}>
                        Inicio
                    </Link>
                    <Link to="/visualizador" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded no-underline ${currentView === 'graph' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'}`}>
                        Visualizador
                    </Link>
                    <Link to="/visualizador?view=planner" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded no-underline ${currentView === 'planner' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'}`}>
                        Planificador
                    </Link>
                    <Link to="/visualizador?view=schedule" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded no-underline ${currentView === 'schedule' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'}`}>
                        Horarios
                    </Link>
                    <Link to="/foro" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded no-underline ${currentView === 'forum' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'}`}>
                        Foro Anónimo
                    </Link>
                    <Link to="/grupos" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded no-underline ${currentView === 'groups' ? 'text-[#0052CC] dark:text-[#4C9AFF] bg-[#DEEBFF] dark:bg-[#0C295E]' : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] active:bg-[#F4F5F7] dark:active:bg-[#3E4C5E]'}`}>
                        Grupos Estudiantiles
                    </Link>
                    <div className="border-t border-[#DFE1E6] dark:border-[#3E4C5E] my-1 pt-2 px-1 flex items-center gap-1.5">
                        <a
                            href="https://buymeacoffee.com/trebol4devop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs font-semibold no-underline"
                        >
                            <Coffee size={13} className="text-[#5E6C84] dark:text-slate-400 shrink-0" />
                            <span>Buy Me a Coffee</span>
                        </a>
                        <a
                            href="https://www.paypal.com/paypalme/TrebolDevop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-[#F4F5F7] dark:bg-[#0E1624] text-[#172B4D] dark:text-slate-200 border border-[#DFE1E6] dark:border-[#3E4C5E] text-xs font-semibold no-underline"
                        >
                            <svg className="w-3 h-3 fill-[#5E6C84] dark:fill-slate-400 shrink-0" viewBox="0 0 24 24">
                                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.641.641 0 0 1 .632-.54H11.2c2.478 0 4.414.53 5.753 1.577 1.343 1.049 1.954 2.651 1.819 4.763-.15 2.34-1.123 4.184-2.894 5.483-1.768 1.298-4.148 1.956-7.074 1.956H7.818l-.742 4.378z"/>
                            </svg>
                            <span>PayPal</span>
                        </a>
                    </div>
                </div>
            )}
        </nav>
    );
}
