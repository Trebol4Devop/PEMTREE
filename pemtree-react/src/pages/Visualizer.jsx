import { useState, useEffect, useRef } from 'react';
import { Search, Grid, Compass, LayoutTemplate, Layers, RotateCcw, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { cursos, cursoMap, initializeCursos, listAvailablePensums, loadPensum } from '../modules/data/cursos';
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
    const dragStateRef = useRef({
        isDown: false,
        moved: false,
        startX: 0,
        startY: 0
    });
    const [graphManager, setGraphManager] = useState(null);
    const [panZoom, setPanZoom] = useState(null);
    const [pensums, setPensums] = useState([]);
    
    const [zoom, setZoom] = useState(100);
    const [showOptional, setShowOptional] = useState(true);
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [viewMode, setViewMode] = useState('semester');
    const [layout, setLayout] = useState('horizontal');
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('pemtree_theme');
        return saved === 'dark';
    });
    
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [creditosAprobados, setCreditosAprobados] = useState(0);
    const [showGuia, setShowGuia] = useState(() => {
        return !localStorage.getItem('pemtree_guia_visto');
    });

    const guiaLightSrc = '/images/Guia_de_uso.png';
    const guiaDarkSrc = '/images/Guia_de_uso_dark.png';
    const guiaFallbackSrc = '/images/Guia_de_uso.png';

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

                // Si hay un pensum guardado, cargarlo
                if (pensumGuardado) {
                    try {
                        await loadPensum(pensumGuardado);
                    } catch (error) {
                        console.warn(`No se pudo cargar el pensum guardado (${pensumGuardado}), usando el por defecto:`, error);
                    }
                }

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
                
                if (typeof gm.setCurrentLayout === 'function') gm.setCurrentLayout(layout);
                else gm.currentLayout = layout;
                
                if (typeof gm.setTemaOscuro === 'function') gm.setTemaOscuro(isDarkMode);
                else gm.temaOscuro = isDarkMode;

                if (gm.edgeRenderer && typeof gm.edgeRenderer.crearFlechas === 'function') {
                    gm.edgeRenderer.crearFlechas(svg);
                }

                gm.infoCardManager = {
                    mostrar: (curso) => setSelectedCourse({...curso}),
                    ocultar: () => setSelectedCourse(null)
                };

                graphManagerRef.current = gm;
                setGraphManager(gm);
                await gm.dibujarGrafo();

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
    }, [isDarkMode, layout]);

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

    const handleCambiarVista = () => {
        const gm = graphManagerRef.current;
        if (gm) {
            const newMode = viewMode === 'semester' ? 'free' : 'semester';
            setViewMode(newMode);
            gm.setViewMode(newMode);
        }
    };

    const handleLayoutChange = async () => {
        const newLayout = layout === 'vertical' ? 'horizontal' : 'vertical';
        setLayout(newLayout);
        const gm = graphManagerRef.current;
        if (gm) {
            gm.setCurrentLayout(newLayout);
            await gm.dibujarGrafo();
            if (panZoom) applyInitialView(panZoom, graficaRef.current);
        }
    };

    const handlePensumChange = async (e) => {
        const relPath = e.target.value;
        const gm = graphManagerRef.current;
        if (!relPath || !gm) return;
        try {
            await loadPensum(relPath);
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
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleCompletado = (cursoId) => {
        const gm = graphManagerRef.current;
        if (!gm || !gm.storageManager) return;
        
        gm.storageManager.toggleCompletado(cursoId, gm, { 
            mostrar: () => {} 
        });
        
        actualizarCreditos();
        const updatedCourse = cursoMap.get(cursoId);
        setSelectedCourse({...updatedCourse});
        gm.dibujarGrafo();
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
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectSearch = (curso) => {
        setSearchTerm('');
        setSearchResults([]);
        const gm = graphManagerRef.current;
        if (gm) {
            gm.seleccionarNodo(curso, document.getElementById('grafica-group'));
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
            const statusColor = c.completado ? '#36B37E' : (c.disponible ? '#0052CC' : '#5E6C84');
            const bgStatus = c.completado ? '#E3FCEF' : (c.disponible ? '#DEEBFF' : '#EBECF0');
            const darkBgStatus = c.completado ? '#0A3622' : (c.disponible ? '#0C295E' : '#2D333B');

            const handleBadgeEnter = (e) => {
                tooltipManagerRef.current?.mostrar(e, c);
            };

            const handleBadgeLeave = (e) => {
                tooltipManagerRef.current?.ocultar();
            };

            const handleBadgeClick = (e) => {
                const gm = graphManagerRef.current;
                if (gm) {
                    gm.seleccionarNodo(c, document.getElementById('grafica-group'));
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
            
            <div className="flex flex-col md:flex-row items-center justify-between p-3 max-md:p-2 border-b border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] shadow-sm z-20 shrink-0 gap-3 max-md:gap-2 select-none">
                
                <div className="flex items-stretch sm:items-center gap-2 max-md:gap-1 bg-black/5 dark:bg-white/5 p-1 max-md:p-0.5 rounded-lg w-full md:w-auto overflow-x-auto hide-scrollbar">
                    <button onClick={handleCambiarVista} className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 max-md:py-1 text-xs max-md:text-[0.7rem] font-bold rounded-md transition border-none cursor-pointer whitespace-nowrap w-auto shrink-0 ${viewMode === 'semester' ? (isDarkMode ? 'bg-[#3E4C5E] text-white' : 'bg-white text-[#0052CC] shadow-sm') : 'text-current hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] bg-transparent'}`}>
                        <Grid size={14} /> <span>Semestral</span>
                    </button>
                    <button onClick={handleToggleRutaCritica} className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 max-md:py-1 text-xs max-md:text-[0.7rem] font-bold rounded-md transition border-none cursor-pointer whitespace-nowrap w-auto shrink-0 ${showCriticalPath ? (isDarkMode ? 'bg-[#3E4C5E] text-white' : 'bg-white text-[#0052CC] shadow-sm') : 'text-current hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] bg-transparent'}`}>
                        <Compass size={14} /> <span>Ruta Crítica</span>
                    </button>
                    <button onClick={handleToggleOptativos} className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 max-md:py-1 text-xs max-md:text-[0.7rem] font-bold rounded-md transition border-none cursor-pointer whitespace-nowrap w-auto shrink-0 ${showOptional ? (isDarkMode ? 'bg-[#3E4C5E] text-white' : 'bg-white text-[#0052CC] shadow-sm') : 'text-current hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] bg-transparent'}`}>
                        <Layers size={14} /> <span>Optativos</span>
                    </button>
                    <button onClick={handleLayoutChange} className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 max-md:py-1 text-xs max-md:text-[0.7rem] font-bold rounded-md transition border-none cursor-pointer whitespace-nowrap w-auto shrink-0 text-current hover:bg-[#F4F5F7] dark:hover:bg-[#3E4C5E] bg-transparent`}>
                        <LayoutTemplate size={14} /> <span>{layout === 'vertical' ? 'Vertical' : 'Horizontal'}</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center md:justify-end gap-2 md:gap-3 w-full md:w-auto shrink-0">
                    <div className="grid grid-cols-2 gap-2 max-md:gap-1 w-full md:contents">
                        <select
                            onChange={handlePensumChange}
                            className="bg-[#FAFBFC] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-white rounded px-2.5 py-1.5 max-md:py-1 text-xs max-md:text-[0.7rem] focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF] cursor-pointer w-full truncate"
                        >
                            <option value="">Seleccione Pensum...</option>
                            {pensums.map(p => (
                                <option key={p.id} value={p.file}>{p.name}</option>
                            ))}
                        </select>

                        <div className="relative w-full">
                            <Search size={14} className="absolute inset-y-0 left-2.5 top-1.5 flex items-center pointer-events-none text-[#5E6C84] dark:text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar curso..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="bg-[#FAFBFC] dark:bg-[#0E1624] border border-[#DFE1E6] dark:border-[#3E4C5E] text-[#172B4D] dark:text-white rounded px-2.5 py-1 max-md:py-1 pl-8 text-xs max-md:text-[0.7rem] focus:outline-none focus:border-[#0052CC] dark:focus:border-[#4C9AFF] w-full transition-all"
                            />
                            {searchResults.length > 0 && (
                                <div className="absolute top-[100%] right-0 sm:left-0 w-full sm:w-48 mt-[4px] shadow-lg rounded-md overflow-hidden z-[5000] bg-white dark:bg-[#1C2636] border border-[#DFE1E6] dark:border-[#3E4C5E]">
                                    {searchResults.map(curso => (
                                        <button
                                            key={curso.id}
                                            onClick={() => handleSelectSearch(curso)}
                                            className="w-full text-left px-[10px] py-[8px] text-[0.85rem] transition-colors border-b border-[#F4F5F7] dark:border-[#3E4C5E] last:border-0 text-[#172B4D] dark:text-slate-200 bg-white dark:bg-[#1C2636] hover:bg-[#DEEBFF] dark:hover:bg-[#0C295E] hover:text-[#0052CC] dark:hover:text-[#4C9AFF] cursor-pointer"
                                        >
                                            <span className="font-bold mr-[5px] text-xs">{curso.codigo}</span>
                                            <span className="text-xs">{curso.nombre}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-[auto,1fr,1fr] gap-2 max-md:gap-1 w-full items-center md:contents">
                        <button
                            type="button"
                            onClick={() => setShowGuia(true)}
                            className="w-8 h-8 min-w-[32px] min-h-[32px] p-0 flex-none rounded-full border border-[#DFE1E6] dark:border-[#3E4C5E] bg-white dark:bg-[#1C2636] text-[#0052CC] dark:text-[#4C9AFF] font-extrabold text-sm flex items-center justify-center hover:bg-[#F4F5F7] dark:hover:bg-[#2D333B] transition"
                            aria-label="Ayuda"
                            title="Ayuda"
                        >
                            ?
                        </button>

                        <div className="flex items-center justify-center space-x-1.5 bg-[#DEEBFF] dark:bg-[#0C295E] px-2 py-1 max-md:py-0.5 rounded border border-[#0052CC]/20 dark:border-[#4C9AFF]/20 shadow-sm">
                            <span className="text-[10px] max-md:text-[0.6rem] font-bold text-[#0052CC] dark:text-[#4C9AFF] uppercase tracking-wider">Créditos:</span>
                            <span className="text-xs max-md:text-[0.7rem] font-extrabold text-[#0052CC] dark:text-[#4C9AFF]">{creditosAprobados}</span>
                        </div>

                        <button onClick={handleLimpiar} className="flex items-center justify-center gap-2 px-3 py-1.5 max-md:py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-[#BF2600] dark:text-red-400 transition border-none cursor-pointer text-xs max-md:text-[0.7rem] font-bold" title="Limpiar Selección">
                            <RotateCcw size={14} />
                            Reiniciar
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={`flex-1 relative overflow-hidden contenedor-grafica transition-colors duration-300 ${isDarkMode ? 'bg-[#0E1624] tema-oscuro' : 'bg-[#FAFBFC]'}`}
                ref={graficaRef}
                id="grafo-canvas"
                onPointerDown={handleGraphPointerDown}
                onPointerMove={handleGraphPointerMove}
                onPointerUp={handleGraphPointerUp}
            ></div>


            <div className="flex justify-center items-center gap-[6px] absolute bottom-[24px] right-[24px] z-[2100] max-md:top-auto max-md:bottom-[calc(78px+env(safe-area-inset-bottom))] max-md:right-[12px] max-md:z-[700] select-none">
                <button onClick={handleZoomOut} className={`backdrop-blur-md rounded-[8px] font-semibold text-[1rem] transition-all flex items-center justify-center shadow-sm w-[36px] h-[36px] p-0 active:scale-[0.95] border cursor-pointer ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300 hover:bg-[#2D333B]' : 'bg-white/90 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]'}`}>
                    −
                </button>
                <span className={`text-[0.82rem] font-semibold w-[44px] text-center backdrop-blur-md py-[7px] rounded-[8px] shadow-sm select-none border ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300' : 'bg-white/90 border-[#DFE1E6] text-[#42526E]'}`}>
                    {zoom}%
                </span>
                <button onClick={handleZoomIn} className={`backdrop-blur-md rounded-[8px] font-semibold text-[1rem] transition-all flex items-center justify-center shadow-sm w-[36px] h-[36px] p-0 active:scale-[0.95] border cursor-pointer ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300 hover:bg-[#2D333B]' : 'bg-white/90 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]'}`}>
                    +
                </button>
                <button onClick={handleZoomReset} className={`backdrop-blur-md rounded-[8px] font-semibold text-[1rem] transition-all flex items-center justify-center shadow-sm w-[36px] h-[36px] p-0 active:scale-[0.95] border cursor-pointer ${isDarkMode ? 'bg-[#1C2636]/90 border-[#3E4C5E] text-slate-300 hover:bg-[#2D333B]' : 'bg-white/90 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]'}`}>
                    ↺
                </button>
            </div>

            {showGuia && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/45 backdrop-blur-sm">
                    <button
                        onClick={handleCerrarGuia}
                        className="absolute top-[20px] right-[20px] w-[36px] h-[36px] rounded-full bg-white/90 text-[#172B4D] border border-white/60 hover:bg-white transition"
                        aria-label="Cerrar guia"
                    >
                        ×
                    </button>
                    <img
                        src={isDarkMode ? guiaDarkSrc : guiaLightSrc}
                        onError={(e) => { e.currentTarget.src = guiaFallbackSrc; }}
                        alt="Guia de uso"
                        className="max-w-[92vw] max-h-[86vh] object-contain shadow-2xl"
                    />
                </div>
            )}

            {selectedCourse && (
                <div className={`absolute top-[80px] right-[20px] w-[340px] max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:rounded-b-none max-md:rounded-t-[15px] backdrop-blur-md rounded-[12px] shadow-xl p-[20px] z-[950] border fade-in max-md:p-[16px] max-md:pb-[66px] select-none ${isDarkMode ? 'bg-[#1C2636]/95 border-[#3E4C5E] text-slate-100' : 'bg-white/95 border-[#DFE1E6] text-[#172B4D]'}`}>
                    <button onClick={handleCerrarInfo} className={`absolute top-[12px] right-[12px] border-none text-[1rem] cursor-pointer w-[28px] h-[28px] rounded flex items-center justify-center p-0 transition-all ${isDarkMode ? 'bg-[#2D333B] text-slate-400 hover:text-white hover:bg-[#3E4C5E]' : 'bg-[#F4F5F7] text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D]'}`}>
                        ×
                    </button>
                    
                    <div className="flex justify-between items-start mb-[10px] pr-[30px]">
                        <h3 className="m-0 border-none text-[1.2rem] max-md:text-[1rem] font-extrabold">{selectedCourse.codigo}</h3>
                    </div>

                    <div className="flex items-center gap-2 mb-[12px]">
                        <span className={`px-[8px] py-[4px] rounded-[4px] text-[0.70rem] font-bold uppercase tracking-wider border ${selectedCourse.completado ? 'bg-[#E3FCEF] text-[#006644] border-[#36B37E]' : (selectedCourse.disponible ? 'bg-[#DEEBFF] text-[#0052CC] border-[#4C9AFF]' : 'bg-[#FFEBE6] text-[#BF2600] border-[#FF5630]')}`}>
                            {selectedCourse.completado ? 'Completado' : (selectedCourse.disponible ? 'Disponible' : 'Bloqueado')}
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

                    <div className={`flex justify-between mb-[15px] text-[0.85rem] font-medium p-[10px] rounded-[6px] border ${isDarkMode ? 'bg-[#0E1624] border-[#3E4C5E] text-slate-300' : 'bg-[#FAFBFC] border-[#DFE1E6] text-[#5E6C84]'}`}>
                        <span><strong>Créditos:</strong> {selectedCourse.creditos}</span>
                        <span><strong>Semestre:</strong> {selectedCourse.semestre}</span>
                    </div>
                    
                    <button 
                        onClick={() => handleToggleCompletado(selectedCourse.id)}
                        className={`w-full p-[10px] mt-[5px] rounded-[6px] font-bold cursor-pointer transition-all flex items-center justify-center gap-[8px] border-none shadow-sm
                        ${selectedCourse.completado 
                            ? 'bg-[#10b981] hover:bg-[#059669] text-white' 
                            : (isDarkMode ? 'bg-[#60a5fa] hover:bg-[#3b82f6] text-white' : 'bg-[#0052CC] hover:bg-[#0747A6] text-white')}`}
                    >
                        {selectedCourse.completado ? (
                            <><CheckCircle2 size={16} /> Quitar Aprobación</>
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