import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu, Sun, Moon, Coffee, CircleUserRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cargarCatalogo, getCarreraDePensum, getPensumInfo } from '../modules/data/catalogo';
import { getPensumKey, STARTUP_LOADED_PENSUM } from '../modules/data/cursos';
import AuthModal from './AuthModal';

export default function Navbar({ isDarkMode, onToggleTheme }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [carreraTitulo, setCarreraTitulo] = useState('');
    const [carreraColor, setCarreraColor] = useState('');

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleOpenAuth = () => setAuthModalOpen(true);
        window.addEventListener('pemtree-open-auth-modal', handleOpenAuth);
        return () => window.removeEventListener('pemtree-open-auth-modal', handleOpenAuth);
    }, []);

    const location = useLocation();
    const isVisualizerRoute = location.pathname === '/visualizador';

    useEffect(() => {
        if (!isVisualizerRoute) return;
        let active = true;
        const updateCarrera = () => {
            cargarCatalogo()
                .then(() => {
                    if (!active) return;
                    const file = getPensumKey() || STARTUP_LOADED_PENSUM || '';
                    const info = getPensumInfo(file);
                    const carrera = getCarreraDePensum(file);
                    setCarreraTitulo(info ? info.nombre : (carrera ? carrera.nombre : ''));
                    setCarreraColor((carrera && carrera.colores && carrera.colores.color1) || '');
                })
                .catch(() => {});
        };
        updateCarrera();
        window.addEventListener('pemtree-pensum-ready', updateCarrera);
        window.addEventListener('storage', updateCarrera);
        return () => {
            active = false;
            window.removeEventListener('pemtree-pensum-ready', updateCarrera);
            window.removeEventListener('storage', updateCarrera);
        };
    }, [isVisualizerRoute, location.search]);
    const currentView = (() => {
        if (location.pathname === '/visualizador') {
            const params = new URLSearchParams(location.search);
            const v = params.get('view');
            if (v === 'planner') return 'planner';
            if (v === 'schedule') return 'schedule';
            return 'graph';
        }
        if (location.pathname === '/recuento') return 'recuento';
        return 'home';
    })();

    const boardLinkClass = (active) =>
        `px-2.5 sm:px-3 py-1.5 rounded-lg border-0 transition-all duration-150 active:scale-[0.96] cursor-pointer no-underline whitespace-nowrap text-xs sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6988]/30 dark:focus-visible:ring-[#6BA3C8]/30 ${
            active
                ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8] font-semibold'
                : 'bg-transparent text-[#5E6C84] dark:text-slate-300 font-medium hover:text-[#172B4D] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#253247]/60'
        }`;

    const homeLinkClass = 'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-transform duration-150 active:scale-[0.96] cursor-pointer no-underline shrink-0 text-sm sm:text-base tracking-tight font-bold';

    return (
        <>
        <nav className="h-12 sm:h-14 border-b border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] sticky top-0 z-40 px-2 sm:px-4 flex items-center justify-between gap-2 transition-colors duration-300 shrink-0 select-none">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
                    <Link to="/recuento" className={boardLinkClass(currentView === 'recuento')}>
                        Recuento
                    </Link>
                </div>
            </div>

            {isVisualizerRoute && carreraTitulo && (
                <span
                    className="flex items-center min-w-0 text-xs sm:text-sm lg:text-base font-extrabold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis px-1 sm:px-2"
                    style={{ color: carreraColor }}
                    title="Carrera actual"
                >
                    {carreraTitulo}
                </span>
            )}

            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
                <a
                    href="https://buymeacoffee.com/trebol4devop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-transparent text-[#172B4D] dark:text-slate-300 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] border-0 text-[0.65rem] sm:text-xs font-semibold no-underline transition-transform duration-150 active:scale-[0.96]"
                    title="Donar con Buy Me a Coffee"
                >
                    <Coffee size={12} className="text-[#5E6C84] dark:text-slate-400 shrink-0" />
                    <span className="hidden md:inline">Coffee</span>
                </a>
                <a
                    href="https://www.paypal.com/paypalme/TrebolDevop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-transparent text-[#172B4D] dark:text-slate-300 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] border-0 text-[0.65rem] sm:text-xs font-semibold no-underline transition-transform duration-150 active:scale-[0.96]"
                    title="Donar con PayPal"
                >
                    <svg className="w-3 h-3 fill-[#5E6C84] dark:fill-slate-400 shrink-0" viewBox="0 0 24 24">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.641.641 0 0 1 .632-.54H11.2c2.478 0 4.414.53 5.753 1.577 1.343 1.049 1.954 2.651 1.819 4.763-.15 2.34-1.123 4.184-2.894 5.483-1.768 1.298-4.148 1.956-7.074 1.956H7.818l-.742 4.378z"/>
                    </svg>
                    <span className="hidden md:inline">PayPal</span>
                </a>

                <button
                    onClick={onToggleTheme}
                    className="p-1 sm:p-1.5 rounded-full cursor-pointer border-none bg-transparent flex items-center justify-center text-[#5E6C84] dark:text-slate-300 hover:opacity-80 transition-transform duration-150 active:scale-[0.96]"
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? <Sun size={17} className="sm:w-5 sm:h-5 text-yellow-400" /> : <Moon size={17} className="sm:w-5 sm:h-5" />}
                </button>

                <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="relative flex items-center justify-center p-1 sm:p-1.5 rounded-full bg-transparent text-[#5E6C84] dark:text-slate-300 border-0 transition-transform duration-150 active:scale-[0.96] hover:opacity-80 cursor-pointer"
                    aria-label={user ? 'Mi Cuenta · Recomendaciones' : 'Iniciar sesión para recomendar'}
                    title={user ? 'Mi Cuenta · Recomendaciones activas' : 'Iniciar sesión para opinar y recomendar'}
                >
                    <CircleUserRound size={18} className={`sm:w-5 sm:h-5 ${user ? 'text-[#4A7C6A] dark:text-[#6BA892]' : 'text-[#0052CC] dark:text-[#4C9AFF]'}`} />
                    {user && (
                        <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#4A7C6A] dark:bg-[#6BA892]" />
                    )}
                </button>

                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1 rounded text-[#172B4D] dark:text-slate-200 cursor-pointer bg-transparent border-none flex items-center justify-center"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="absolute top-12 sm:top-14 left-0 w-full bg-white dark:bg-[#1C2636] border-b border-[#DFE1E6] dark:border-[#3E4C5E] py-2 px-2 flex flex-col gap-1 text-xs sm:text-sm font-semibold z-30 lg:hidden shadow-lg max-h-[calc(100dvh-3rem)] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[#5E6C84] dark:text-slate-400 bg-transparent rounded-lg border-0 text-center mb-1">
                        Espacio estudiantil independiente no oficial
                    </div>
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded-lg no-underline focus:outline-none ${currentView === 'home' ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8] font-semibold' : 'bg-transparent text-slate-700 dark:text-slate-200 hover:text-[#3B6988] dark:hover:text-[#6BA3C8]'}`}>
                        Inicio
                    </Link>
                    <Link to="/visualizador" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded-lg no-underline focus:outline-none ${currentView === 'graph' ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8] font-semibold' : 'bg-transparent text-slate-700 dark:text-slate-200 hover:text-[#3B6988] dark:hover:text-[#6BA3C8]'}`}>
                        Visualizador
                    </Link>
                    <Link to="/visualizador?view=planner" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded-lg no-underline focus:outline-none ${currentView === 'planner' ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8] font-semibold' : 'bg-transparent text-slate-700 dark:text-slate-200 hover:text-[#3B6988] dark:hover:text-[#6BA3C8]'}`}>
                        Planificador
                    </Link>
                    <Link to="/visualizador?view=schedule" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded-lg no-underline focus:outline-none ${currentView === 'schedule' ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8] font-semibold' : 'bg-transparent text-slate-700 dark:text-slate-200 hover:text-[#3B6988] dark:hover:text-[#6BA3C8]'}`}>
                        Horarios
                    </Link>
                    <Link to="/recuento" onClick={() => setMobileMenuOpen(false)} className={`w-full text-left py-2 px-2 sm:px-3 rounded-lg no-underline focus:outline-none ${currentView === 'recuento' ? 'bg-[#E6EFF5] dark:bg-[#1A2B38] text-[#3B6988] dark:text-[#6BA3C8] font-semibold' : 'bg-transparent text-slate-700 dark:text-slate-200 hover:text-[#3B6988] dark:hover:text-[#6BA3C8]'}`}>
                        Recuento
                    </Link>
                    <button
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}
                        className="w-full text-left py-2 px-2 sm:px-3 rounded text-slate-700 dark:text-slate-200 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] bg-transparent border-none cursor-pointer text-xs sm:text-sm font-semibold flex items-center justify-between"
                    >
                        <span>{user ? 'Mi Cuenta (Recomendaciones)' : 'Iniciar sesión / Recomendaciones'}</span>
                        {user && <span className="w-2 h-2 rounded-full bg-[#4A7C6A] dark:bg-[#6BA892]" />}
                    </button>
                    <div className="border-t border-[#DFE1E6] dark:border-[#3E4C5E] my-1 pt-2 px-1 flex items-center gap-1.5">
                        <a
                            href="https://buymeacoffee.com/trebol4devop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-transparent text-[#172B4D] dark:text-slate-200 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] border-0 text-xs font-semibold no-underline"
                        >
                            <Coffee size={13} className="text-[#5E6C84] dark:text-slate-400 shrink-0" />
                            <span>Buy Me a Coffee</span>
                        </a>
                        <a
                            href="https://www.paypal.com/paypalme/TrebolDevop"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-transparent text-[#172B4D] dark:text-slate-200 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] border-0 text-xs font-semibold no-underline"
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
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
}
