import { useState, useEffect, useRef } from 'react';
import { Search, Compass, Layers, RotateCcw, CheckCircle2, Lock, Unlock, Calendar } from 'lucide-react';
import Planner from '../components/Planner';
import WelcomeModal from '../components/WelcomeModal';
import { cursos, cursoMap, initializeCursos, listAvailablePensums, loadPensum, STARTUP_LOADED_PENSUM } from '../modules/data/cursos';
import { GraphManager } from '../modules/graph/GraphManager';
import { getNodeDimensions } from '../modules/graph/dimensions';
import { PanZoomManager } from '../modules/ui/PanZoomManager';
import { StorageManager } from '../modules/storage/StorageManager';
import { TooltipManager } from '../modules/ui/TooltipManager';

export default function Visualizer() {
    const graficaRef = useRef(null);
    const tooltipManagerRef = useRef(null);
    const initialViewRef = useRef(null);
    const graphManagerRef = useRef(null);
    const searchContainerRef = useRef(null);
    const dragStateRef = useRef({
        isDown: false,
        moved: false,
        startX: 0,
        startY: 0
    });
    const [graphManager, setGraphManager] = useState(null);
    const [panZoom, setPanZoom] = useState(null);
    const [pensums, setPensums] = useState([]);
    const [currentPensum, setCurrentPensum] = useState('');
    
    const [zoom, setZoom] = useState(100);
    const [showOptional, setShowOptional] = useState(true);
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('pemtree_theme');
        return saved === 'dark';
    });
    
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchFocused, setSearchFocused] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const [creditosAprobados, setCreditosAprobados] = useState(0);
    const [showGuia, setShowGuia] = useState(() => {
        return !localStorage.getItem('pemtree_guia_visto');
    });
    const [activeView, setActiveView] = useState('graph');

    const guiaLightSrc = '/images/Guia_de_uso.png';
    const guiaDarkSrc = '/images/Guia_de_uso_dark.png';

    const actualizarCreditos = () => {
        let total = 0;
        if (cursoMap) {
            cursoMap.forEach(curso => {
                if (curso.completado) {
                    total += parseInt(curso.creditos) || 0;
                }
            });
        }
        setCreditosAprobados(total);
    };

    const applyInitialView = (pz, container) => {
        if (!pz || !container) return;
        const isMobile = window.innerWidth <= 768;
        const initialScale = isMobile ? 0.58 : 1.0;
        const semestreMax = isMobile ? 2 : 3;
        const cursosTarget = cursos.filter(c => c.semestre <= semestreMax);
        const dims = getNodeDimensions();

        if (cursosTarget.length === 0) {
            pz.zoomReset();
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        cursosTarget.forEach(curso => {
            minX = Math.min(minX, curso.x);
            maxX = Math.max(maxX, curso.x + dims.width);
            minY = Math.min(minY, curso.y);
            maxY = Math.max(maxY, curso.y + dims.height);
        });

        const targetCenterX = (minX + maxX) / 2;
        const targetCenterY = (minY + maxY) / 2;
        const translateX = (width / 2) - (targetCenterX * initialScale);
        const translateY = (height / 2) - (targetCenterY * initialScale);

        pz.setScale(initialScale);
        pz.setTranslate(translateX, translateY);
        pz.actualizarTransform();

        initialViewRef.current = {
            scale: initialScale,
            translateX,
            translateY
        };
    };

    useEffect(() => {
        const handleThemeChange = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
            const gm = graphManagerRef.current;
            if (gm) {
                if (typeof gm.setTemaOscuro === 'function') gm.setTemaOscuro(isDark);
                else gm.temaOscuro = isDark;
                gm.dibujarGrafo();
            }
        };

        window.addEventListener('themeChanged', handleThemeChange);
        handleThemeChange();
        return () => window.removeEventListener('themeChanged', handleThemeChange);
    }, [graphManager]);

    useEffect(() => {
        let isMounted = true;

        const initApp = async () => {
            try {
                // Crear StorageManager y cargar pensum guardado
                const storageManager = new StorageManager();
                const pensumGuardado = storageManager.cargarPensumGuardado();

                await initializeCursos();

                // Determinar qué pensum cargar (guardado o default)
                let pensumToLoad = pensumGuardado || STARTUP_LOADED_PENSUM;

                // Siempre pasar por loadPensum() para el mismo comportamiento que el combobox
                try {
                    await loadPensum(pensumToLoad);
                } catch (error) {
                    console.warn(`No se pudo cargar el pensum (${pensumToLoad}), usando default:`, error);
                    pensumToLoad = STARTUP_LOADED_PENSUM;
                    await loadPensum(pensumToLoad);
                }

                // Persistir pensum actual
                storageManager.guardarPensumActual(pensumToLoad);
                setCurrentPensum(pensumToLoad);

                const availablePensums = await listAvailablePensums();

                if (!isMounted) return;
                setPensums(availablePensums);

                const container = graficaRef.current;
                container.innerHTML = '';

                const svgNS = "http://www.w3.org/2000/svg";
                const svg = document.createElementNS(svgNS, "svg");
                svg.setAttribute("width", "100%");
                svg.setAttribute("height", "100%");
                svg.setAttribute("id", "svg-grafica");
                container.appendChild(svg);

                const graphGroup = document.createElementNS(svgNS, "g");
                graphGroup.setAttribute("id", "grafica-group");
                svg.appendChild(graphGroup);

                storageManager.cargarProgreso(cursos, cursoMap);
                actualizarCreditos();

                const gm = new GraphManager(cursos, cursoMap);
                gm.storageManager = storageManager;
                gm.tooltipManager = new TooltipManager();
                tooltipManagerRef.current = gm.tooltipManager;
                gm.onCreditsChange = actualizarCreditos;
                
                gm.currentLayout = 'horizontal';
                
                if (typeof gm.setTemaOscuro === 'function') gm.temaOscuro = isDarkMode;
                else gm.temaOscuro = isDarkMode;

                if (gm.edgeRenderer && typeof gm.edgeRenderer.crearFlechas === 'function') {
                    gm.edgeRenderer.crearFlechas(svg);
                }

                gm.infoCardManager = {
                    mostrar: (curso) => setSelectedCourse({...curso}),
                    ocultar: () => setSelectedCourse(null)
                };

                graphManagerRef.current = gm;
                await gm.dibujarGrafo();
                setGraphManager(gm);

                const pz = new PanZoomManager(svg);
                pz.init(container, (newZoom) => setZoom(newZoom));
                applyInitialView(pz, container);
                setPanZoom(pz);

            } catch (error) {
                console.error(error);
            }
        };

        initApp();
        return () => { isMounted = false; };
    }, [isDarkMode]);

    const handleLimpiar = () => {
        const gm = graphManagerRef.current;
        if (!gm) return;
        gm.desseleccionarNodo();
        if (gm.storageManager) {
            gm.storageManager.limpiarProgreso(gm.cursos);
            actualizarCreditos();
            gm.dibujarGrafo();
        }
        setSelectedCourse(null);
    };

    const handleCerrarInfo = () => {
        if (window.innerWidth <= 768) {
            setSelectedCourse(null);
            return;
        }
        const gm = graphManagerRef.current;
        if (gm) gm.desseleccionarNodo();
        setSelectedCourse(null);
    };

    const handleCerrarGuia = () => {
        setShowGuia(false);
        localStorage.setItem('pemtree_guia_visto', 'true');
    };

    const handleToggleOptativos = () => {
        const gm = graphManagerRef.current;
        if (gm) {
            const newValue = !showOptional;
            setShowOptional(newValue);
            gm.setShowOptional(newValue);
        }
    };

    const handleToggleRutaCritica = () => {
        const gm = graphManagerRef.current;
        if (gm) {
            const newValue = !showCriticalPath;
            setShowCriticalPath(newValue);
            gm.setShowCriticalPath(newValue);
        }
    };

    const handlePensumChange = async (e) => {
        const relPath = e.target.value;
        const gm = graphManagerRef.current;
        if (!relPath || !gm) return;
        try {
            await loadPensum(relPath);
            setCurrentPensum(relPath);
            // Guardar el pensum seleccionado
            if (gm.storageManager) {
                gm.storageManager.guardarPensumActual(relPath);
                gm.storageManager.cargarProgreso(cursos, cursoMap);
            }
            actualizarCreditos();
            gm.updateCursos(cursos, cursoMap);
            await gm.dibujarGrafo();
            if (panZoom) applyInitialView(panZoom, graficaRef.current);
            setSelectedCourse(null);
            setSearchTerm('');
            setSearchResults([]);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCycleEstado = async (cursoId) => {
        const gm = graphManagerRef.current;
        if (!gm || !gm.storageManager) return;

        await gm.storageManager.cycleEstado(cursoId, gm, {
            mostrar: () => {}
        });

        actualizarCreditos();
        const updatedCourse = cursoMap.get(cursoId);
        setSelectedCourse({...updatedCourse});
    };

    const handleZoomIn = () => { if (panZoom) panZoom.zoomIn(); };
    const handleZoomOut = () => { if (panZoom) panZoom.zoomOut(); };
    const handleZoomReset = () => {
        if (!panZoom) return;
        if (initialViewRef.current) {
            panZoom.setScale(initialViewRef.current.scale);
            panZoom.setTranslate(initialViewRef.current.translateX, initialViewRef.current.translateY);
            panZoom.actualizarTransform();
        } else {
            panZoom.zoomReset();
        }
    };

    const handleSearchChange = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        if (term.trim().length > 1) {
            const results = cursos.filter(c =>
                c.nombre.toLowerCase().includes(term) ||
                c.codigo.toLowerCase().includes(term)
            ).slice(0, 6);
            setSearchResults(results);
        } else if (term.trim().length === 0) {
            setSearchResults([]);
        } else {
            setSearchResults([]);
        }
    };

    const handleSearchFocus = () => {
        setSearchFocused(true);
        if (searchContainerRef.current) {
            const rect = searchContainerRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 224),
                zIndex: 5000
            });
        }
    };

    const handleSearchBlur = () => {
        setTimeout(() => setSearchFocused(false), 200);
    };

    const handleSelectSearch = (curso) => {
        setSearchTerm('');
        setSearchResults([]);
        setSearchFocused(false);
        const gm = graphManagerRef.current;
        if (gm) {
            gm.seleccionarNodo(curso);
            setSelectedCourse(curso);
            if (panZoom) {
                panZoom.centrarEnNodo(curso);
            }
        }
    };

    const handleGraphPointerDown = (e) => {
        dragStateRef.current.isDown = true;
        dragStateRef.current.moved = false;
        dragStateRef.current.startX = e.clientX;
        dragStateRef.current.startY = e.clientY;
    };

    const handleGraphPointerMove = (e) => {
        if (!dragStateRef.current.isDown) return;
        const dx = Math.abs(e.clientX - dragStateRef.current.startX);
        const dy = Math.abs(e.clientY - dragStateRef.current.startY);
        if (dx > 6 || dy > 6) {
            dragStateRef.current.moved = true;
        }
    };

    const handleGraphPointerUp = (e) => {
        const { moved } = dragStateRef.current;
        dragStateRef.current.isDown = false;

        if (moved) return;

        const target = e.target;
        if (target && target.closest && target.closest('.node-group')) {
            return;
        }
        const gm = graphManagerRef.current;
        if (gm) {
            gm.desseleccionarNodo();
        }
        setSelectedCourse(null);
    };

    const renderBadges = (ids) => {
        if (!ids || ids.length === 0) return <span className="text-slate-400 dark:text-slate-500 text-[0.8em]">Ninguno</span>;
        return ids.map(id => {
            const c = cursoMap.get(id);
            if (!c) return null;
            const statusColor = c.completado ? '#36B37E' : (c.cursando ? '#B45309' : (c.disponible ? '#0052CC' : '#5E6C84'));
            const bgStatus = c.completado ? '#E3FCEF' : (c.cursando ? '#FEF9E7' : (c.disponible ? '#DEEBFF' : '#EBECF0'));
            const darkBgStatus = c.completado ? '#0A3622' : (c.cursando ? '#3d2e00' : (c.disponible ? '#0C295E' : '#2D333B'));

            const handleBadgeEnter = (e) => {
                tooltipManagerRef.current?.mostrar(e, c);
            };

            const handleBadgeLeave = () => {
                tooltipManagerRef.current?.ocultar();
            };

            const handleBadgeClick = () => {
                const gm = graphManagerRef.current;
                if (gm) {
                    gm.seleccionarNodo(c);
                    setSelectedCourse({...c});
                    if (panZoom) {
                        panZoom.centrarEnNodo(c);
                    }
                }
                tooltipManagerRef.current?.ocultar();
            };

            return (
                <span 
                    key={id} 
                    className="px-[6px] py-[2px] rounded-[4px] text-[0.75rem] max-md:text-[0.7rem] font-bold cursor-pointer border transition-colors hover:opacity-80" 
                    style={{ color: statusColor, backgroundColor: isDarkMode ? darkBgStatus : bgStatus, borderColor: `${statusColor}40` }} 
                    onMouseEnter={handleBadgeEnter}
                    onMouseMove={(e) => tooltipManagerRef.current?.mover(e)}
                    onMouseLeave={handleBadgeLeave}
                    onClick={handleBadgeClick}
                >
                    {c.codigo}
                </span>
            );
        });
    };

    return (
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-[#FAFBFC] dark:bg-[#121924] text-[#172B4D] dark:text-slate-100 font-sans transition-colors duration-300">
            
            <div className="flex flex-col lg:flex-row items-center justify-between p-3 max-sm:p-2 sm:p-2.5 border-b border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] shadow-sm z-20 shrink-0 gap-2 sm:gap-2.5 lg:gap-3 select-none overflow-x-auto transition-colors duration-300">
                
                {/* Botones de vista y opciones */}
                <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 bg-black/5 dark:bg-white/5 p-1.5 sm:p-2 rounded-lg shrink-0">
                    <button onClick={handleToggleRutaCritica} className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 max-sm:py-1 text-[0.65rem] sm:text-[0.75rem] lg:text-xs font-bold rounded-md transition border-none cursor-pointer whitespace-nowrap ${showCriticalPath ? (isDarkMode ? 'bg-[#3E4C5E] text-white' : 'bg-white text-[#0052CC] shadow-sm') : 'text-current hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] bg-transparent'} ${activeView === 'planner' ? 'hidden' : ''}`}>
                        <Compass size={12} className="max-sm:hidden" /> <Compass size={10} className="sm:hidden" /> <span className="max-sm:hidden">Ruta Crítica</span><span className="sm:hidden">RC</span>
                    </button>
                    <button onClick={handleToggleOptativos} className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 max-sm:py-1 text-[0.65rem] sm:text-[0.75rem] lg:text-xs font-bold rounded-md transition border-none cursor-pointer whitespace-nowrap ${showOptional ? (isDarkMode ? 'bg-[#3E4C5E] text-white' : 'bg-white text-[#0052CC] shadow-sm') : 'text-current hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] bg-transparent'} ${activeView === 'planner' ? 'hidden' : ''}`}>
                        <Layers size={12} className="max-sm:hidden" /> <Layers size={10} className="sm:hidden" /> <span className="max-sm:hidden">Optativos</span><span className="sm:hidden">Opt</span>
                    </button>

                    {/* Planificador toggle — always visible, prominent style */}
                    <button onClick={() => setActiveView(activeView === 'planner' ? 'graph' : 'planner')} className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 max-sm:py-1 text-[0.65rem] sm:text-[0.75rem] lg:text-xs font-bold rounded-md transition cursor-pointer whitespace-nowrap ${activeView === 'planner' ? 'bg-[#0052CC] text-white shadow-md dark:bg-[#4C9AFF] dark:text-[#0E1624]' : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#0052CC]/10 text-[#0052CC] hover:bg-[#0052CC]/20')}`}>
                        <Calendar size={12} className="max-sm:hidden" /> <Calendar size={10} className="sm:hidden" /> <span className="max-sm:hidden">Planificador</span><span className="sm:hidden">Plan</span>
                    </button>
                </div>

                {/* Selectors y búsqueda */}
                <div className={`flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-2 w-full lg:w-auto min-w-0 ${activeView === 'planner' ? 'hidden' : ''}`}>
                    <select
                        value={currentPensum}
                        onChange={handlePensumChange}
                        className="bg-[#FAFBFC] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-white rounded px-2 sm:px-2.5 py-1.5 max-sm:py-1 text-[0.65rem] sm:text-xs max-lg:text-[0.65rem] focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF] cursor-pointer min-w-0"
                    >
                        <option value="">Seleccione Pensum...</option>
                        {pensums.map(p => (
                            <option key={p.id} value={p.file}>{p.name}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-1.5 min-w-0 sm:flex-1 lg:w-48 bg-[#FAFBFC] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] rounded px-2 sm:px-2.5 py-1.5 max-sm:py-1 transition-all focus-within:border-[#0052CC] dark:focus-within:border-[#4C9AFF]" ref={searchContainerRef}>
                        <Search size={12} className="shrink-0 text-[#5E6C84] dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            className="bg-transparent border-none text-[#172B4D] dark:text-white text-[0.65rem] sm:text-xs max-lg:text-[0.65rem] focus:outline-none w-full min-w-0 p-0"
                        />
                    </div>
                </div>

                {/* Botones de ayuda, créditos y reiniciar */}
                <div className={`flex items-center gap-1.5 sm:gap-2 lg:gap-3 ml-auto shrink-0 ${activeView === 'planner' ? 'hidden' : ''}`}>
                    <button
                        type="button"
                        onClick={() => setShowGuia(true)}
                        className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] sm:min-w-[32px] min-h-[28px] sm:min-h-[32px] p-0 flex-none rounded-full border border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] font-extrabold text-xs sm:text-sm flex items-center justify-center hover:bg-[#F4F5F7] dark:hover:bg-[#2D333B] transition"
                        aria-label="Ayuda"
                        title="Ayuda"
                    >
                        ?
                    </button>

                    <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 bg-[#DEEBFF] dark:bg-[#0C295E] px-1.5 sm:px-2 py-1 max-sm:py-0.5 rounded border border-[#0052CC]/20 dark:border-[#4C9AFF]/20 shadow-sm transition-colors duration-300">
                        <span className="text-[0.6rem] sm:text-[10px] lg:text-[10px] font-bold text-[#0052CC] dark:text-[#4C9AFF] uppercase tracking-wider whitespace-nowrap">Créditos:</span>
                        <span className="text-[0.65rem] sm:text-xs lg:text-xs font-extrabold text-[#0052CC] dark:text-[#4C9AFF]">{creditosAprobados}</span>
                    </div>

                    <button onClick={handleLimpiar} className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 max-sm:py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-[#BF2600] dark:text-red-400 transition border-none cursor-pointer text-[0.65rem] sm:text-xs lg:text-xs font-bold whitespace-nowrap" title="Limpiar Selección">
                        <RotateCcw size={12} className="max-sm:hidden" /> <RotateCcw size={11} className="sm:hidden" />
                        <span className="max-sm:hidden">Reiniciar</span><span className="sm:hidden">Reset</span>
                    </button>
                </div>
            </div>

            {searchFocused && (searchTerm.trim().length === 0 || searchResults.length > 0 || searchTerm.trim().length > 1) && (
                <div style={dropdownStyle} className="shadow-lg rounded-md overflow-hidden bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E]">
                    {searchTerm.trim().length === 0 && searchResults.length === 0 ? (
                        <>
                            <div className="px-[10px] py-[5px] text-[0.6rem] uppercase tracking-wider text-[#5E6C84] dark:text-slate-400 border-b border-[#F4F5F7] dark:border-[#3E4C5E]">Sugerencias</div>
                            {cursos.slice(0, 6).map(curso => (
                                <button
                                    key={curso.id}
                                    onClick={() => handleSelectSearch(curso)}
                                    className="w-full text-left px-[10px] py-[8px] text-[0.75rem] sm:text-[0.85rem] transition-colors border-b border-[#F4F5F7] dark:border-[#3E4C5E] last:border-0 text-[#172B4D] dark:text-slate-200 bg-white dark:bg-[#1C2636] hover:bg-[#DEEBFF] dark:hover:bg-[#0C295E] hover:text-[#0052CC] dark:hover:text-[#4C9AFF] cursor-pointer"
                                >
                                    <span className="font-bold mr-[5px] text-[0.65rem] sm:text-xs">{curso.codigo}</span>
                                    <span className="text-[0.65rem] sm:text-xs">{curso.nombre}</span>
                                </button>
                            ))}
                        </>
                    ) : searchResults.length > 0 ? (
                        searchResults.map(curso => (
                            <button
                                key={curso.id}
                                onClick={() => handleSelectSearch(curso)}
                                className="w-full text-left px-[10px] py-[8px] text-[0.75rem] sm:text-[0.85rem] transition-colors border-b border-[#F4F5F7] dark:border-[#3E4C5E] last:border-0 text-[#172B4D] dark:text-slate-200 bg-white dark:bg-[#1C2636] hover:bg-[#DEEBFF] dark:hover:bg-[#0C295E] hover:text-[#0052CC] dark:hover:text-[#4C9AFF] cursor-pointer"
                            >
                                <span className="font-bold mr-[5px] text-[0.65rem] sm:text-xs">{curso.codigo}</span>
                                <span className="text-[0.65rem] sm:text-xs">{curso.nombre}</span>
                            </button>
                        ))
                    ) : searchTerm.trim().length > 1 ? (
                        <div className="px-[10px] py-[8px] text-[0.75rem] sm:text-[0.85rem] text-[#5E6C84] dark:text-slate-400 text-center">
                            Sin resultados
                        </div>
                    ) : null}
                </div>
            )}

            {activeView === 'planner' ? (
                <Planner key={currentPensum} currentPensum={currentPensum} />
            ) : null}

            <div
                className={`flex-1 relative overflow-hidden contenedor-grafica transition-colors duration-300 ${activeView === 'planner' ? 'hidden' : ''} ${isDarkMode ? 'bg-[#0E1624] tema-oscuro' : 'bg-[#FAFBFC]'}`}
                ref={graficaRef}
                id="grafo-canvas"
                onPointerDown={handleGraphPointerDown}
                onPointerMove={handleGraphPointerMove}
                onPointerUp={handleGraphPointerUp}
            ></div>

                    <div className="flex justify-center items-center gap-1 sm:gap-1.5 absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-[2100] max-sm:hidden select-none">
                        <button onClick={handleZoomOut} className={`backdrop-blur-md rounded-lg font-semibold transition-all flex items-center justify-center shadow-sm w-8 h-8 sm:w-9 sm:h-9 p-0 active:scale-95 border cursor-pointer text-sm sm:text-base ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300 hover:bg-[#2D333B]' : 'bg-white/90 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]'}`}>
                            −
                        </button>
                        <span className={`text-[0.75rem] sm:text-sm font-semibold w-10 sm:w-11 text-center backdrop-blur-md py-1 sm:py-1.5 rounded-lg shadow-sm select-none border ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300' : 'bg-white/90 border-[#DFE1E6] text-[#42526E]'}`}>
                            {zoom}%
                        </span>
                        <button onClick={handleZoomIn} className={`backdrop-blur-md rounded-lg font-semibold transition-all flex items-center justify-center shadow-sm w-8 h-8 sm:w-9 sm:h-9 p-0 active:scale-95 border cursor-pointer text-sm sm:text-base ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300 hover:bg-[#2D333B]' : 'bg-white/90 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]'}`}>
                            +
                        </button>
                        <button onClick={handleZoomReset} className={`backdrop-blur-md rounded-lg font-semibold transition-all flex items-center justify-center shadow-sm w-8 h-8 sm:w-9 sm:h-9 p-0 active:scale-95 border cursor-pointer text-sm sm:text-base ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300 hover:bg-[#2D333B]' : 'bg-white/90 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]'}`}>
                            ↺
                        </button>
                    </div>

            {showGuia && (
                <WelcomeModal
                    isDarkMode={isDarkMode}
                    guiaSrc={isDarkMode ? guiaDarkSrc : guiaLightSrc}
                    onClose={handleCerrarGuia}
                />
            )}

            {selectedCourse && activeView === 'graph' && (
                <div className={`absolute top-[80px] right-[20px] w-[340px] max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:rounded-b-none max-md:rounded-t-[15px] backdrop-blur-md rounded-[12px] shadow-xl p-[20px] z-[950] border fade-in max-md:p-[16px] max-md:pb-[66px] select-none transition-colors duration-300 ${isDarkMode ? 'bg-[#1C2636]/95 border-[#3E4C5E] text-slate-100' : 'bg-white/95 border-[#DFE1E6] text-[#172B4D]'}`}>
                    <button onClick={handleCerrarInfo} className={`absolute top-[12px] right-[12px] border-none text-[1rem] cursor-pointer w-[28px] h-[28px] rounded flex items-center justify-center p-0 transition-all ${isDarkMode ? 'bg-[#2D333B] text-slate-400 hover:text-white hover:bg-[#3E4C5E]' : 'bg-[#F4F5F7] text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D]'}`}>
                        ×
                    </button>
                    
                    <div className="flex justify-between items-start mb-[10px] pr-[30px]">
                        <h3 className="m-0 border-none text-[1.2rem] max-md:text-[1rem] font-extrabold">{selectedCourse.codigo}</h3>
                    </div>

                    <div className="flex items-center gap-2 mb-[12px]">
                        <span className={`px-[8px] py-[4px] rounded-[4px] text-[0.70rem] font-bold uppercase tracking-wider border ${selectedCourse.completado ? 'bg-[#E3FCEF] text-[#006644] border-[#36B37E]' : (selectedCourse.cursando ? 'bg-[#FEF9E7] text-[#B45309] border-[#F59E0B]' : (selectedCourse.disponible ? 'bg-[#DEEBFF] text-[#0052CC] border-[#4C9AFF]' : 'bg-[#FFEBE6] text-[#BF2600] border-[#FF5630]'))}`}>
                            {selectedCourse.completado ? 'Completado' : (selectedCourse.cursando ? 'Cursando' : (selectedCourse.disponible ? 'Disponible' : 'Bloqueado'))}
                        </span>
                        {!selectedCourse.completado && selectedCourse.enRutaCritica && (
                            <span className="bg-[#FFFAE6] text-[#FF8B00] border border-[#FFAB00] px-[8px] py-[4px] rounded-[4px] text-[0.70rem] font-bold uppercase tracking-wider flex items-center gap-1">
                                ⚠️ Crítico
                            </span>
                        )}
                    </div>

                    <div className={`font-bold mb-[12px] text-[1.1rem] leading-[1.3] ${isDarkMode ? 'text-white' : 'text-[#172B4D]'}`}>
                        {selectedCourse.nombre}
                    </div>

                    <div className={`flex justify-between mb-[15px] text-[0.85rem] font-medium p-[10px] rounded-[6px] border transition-colors duration-300 ${isDarkMode ? 'bg-[#0E1624] border-[#3E4C5E] text-slate-300' : 'bg-[#FAFBFC] border-[#DFE1E6] text-[#5E6C84]'}`}>
                        <span><strong>Créditos:</strong> {selectedCourse.creditos}</span>
                        <span><strong>Semestre:</strong> {selectedCourse.semestre}</span>
                    </div>
                    
                    <button 
                        onClick={() => handleCycleEstado(selectedCourse.id)}
                        className={`w-full p-[10px] mt-[5px] rounded-[6px] font-bold cursor-pointer transition-all flex items-center justify-center gap-[8px] border-none shadow-sm
                        ${selectedCourse.completado 
                            ? 'bg-[#10b981] hover:bg-[#059669] text-white' 
                            : selectedCourse.cursando
                            ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                            : (isDarkMode ? 'bg-[#60a5fa] hover:bg-[#3b82f6] text-white' : 'bg-[#0052CC] hover:bg-[#0747A6] text-white')}`}
                    >
                        {selectedCourse.completado ? (
                            <><CheckCircle2 size={16} /> Completado</>
                        ) : selectedCourse.cursando ? (
                            <>● Cursando</>
                        ) : (
                            <><Lock size={16} className={selectedCourse.disponible ? 'hidden' : 'block'} /><Unlock size={16} className={selectedCourse.disponible ? 'block' : 'hidden'} /> Marcar Aprobado</>
                        )}
                    </button>

                    <div className="mt-[20px]">
                        <strong className={`text-[0.80rem] uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-[#5E6C84]'}`}>Prerrequisitos:</strong>
                        <div className="flex flex-wrap gap-[6px] mt-[6px]">
                            {renderBadges(selectedCourse.prerequisitos)}
                        </div>
                    </div>
                    
                    <div className="mt-[15px]">
                        <strong className={`text-[0.80rem] uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-[#5E6C84]'}`}>Habilita:</strong>
                        <div className="flex flex-wrap gap-[6px] mt-[6px]">
                            {renderBadges(selectedCourse.posrequisitos)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}