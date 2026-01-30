// modules/ui/UIController.js - Controlador de interfaz

import { PanZoomManager } from './PanZoomManager.js';
import { InfoCardManager } from './InfoCardManager.js';
import { TooltipManager } from './TooltipManager.js';
import { ThemeManager } from './ThemeManager.js';
import { SearchManager } from './SearchManager.js';
import { listAvailablePensums, loadPensum, cursos, cursoMap } from '../data/cursos.js';

export class UIController {
    constructor(graphManager, storageManager) {
        this.graphManager = graphManager;
        this.storageManager = storageManager;
        
        this.panZoomManager = null;
        this.infoCardManager = null;
        this.tooltipManager = null;
        this.themeManager = null;
        this.searchManager = null;
    }

    init() {
        this.inicializarGrafo();
        // Inicializar selector de pensum en la barra de herramientas
        this.setupPensumSelector();
        this.setupMobileUI();
    }

    inicializarGrafo() {
        const graphContainer = document.getElementById('grafica');
        if (!graphContainer) return;
        
        graphContainer.innerHTML = '';
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("id", "svg-grafica");
        graphContainer.appendChild(svg);
        
        const graphGroup = document.createElementNS(svgNS, "g");
        graphGroup.setAttribute("id", "grafica-group");
        svg.appendChild(graphGroup);
        
        // Crear flechas
        const edgeRenderer = this.graphManager.edgeRenderer;
        edgeRenderer.crearFlechas(svg);
        
        // Inicializar componentes UI
        this.panZoomManager = new PanZoomManager(svg);
        this.infoCardManager = new InfoCardManager(this.graphManager, this.storageManager);
        this.tooltipManager = new TooltipManager();
        this.themeManager = new ThemeManager(this.graphManager);
        this.searchManager = new SearchManager(this.graphManager, this.panZoomManager);
        
        // Zoom inicial para móviles
        if (window.innerWidth <= 768) {
            this.panZoomManager.setScale(0.5);
            this.panZoomManager.setTranslate(50, 50);
            this.panZoomManager.actualizarTransform();
        }
        
        // Cargar tema guardado
        this.themeManager.cargarPreferenciaTema();
        
        // Inicializar pan/zoom
        this.panZoomManager.init();
        
        // Configurar eventos de resize
        this.setupResizeHandler();
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth <= 768) {
                    this.panZoomManager.setScale(0.5);
                    this.panZoomManager.setTranslate(50, 50);
                    this.panZoomManager.actualizarTransform();
                }
                this.graphManager.dibujarGrafo();
            }, 300);
        });
    }

    setupMobileUI() {
        this.setupMobileMenus();
        this.setupTouchEvents();
    }

    setupMobileMenus() {
        const navToggle = document.getElementById('nav-toggle');
        const navLinks = document.getElementById('nav-links');
        
        if(navToggle && navLinks) {
            navToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navLinks.classList.toggle('active');
            });
        }

        const toolsToggle = document.getElementById('tools-toggle');
        const barraHerramienta = document.getElementById('barraHerramienta');
        const closeToolsBtn = document.getElementById('close-tools-btn');

        if(toolsToggle && barraHerramienta) {
            toolsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                barraHerramienta.classList.add('active');
            });

            if(closeToolsBtn) {
                closeToolsBtn.addEventListener('click', () => {
                    barraHerramienta.classList.remove('active');
                });
            }
        }

        document.addEventListener('click', (e) => {
            if(navLinks && navLinks.classList.contains('active')) {
                if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
                    navLinks.classList.remove('active');
                }
            }

            if(barraHerramienta && barraHerramienta.classList.contains('active')) {
                if (!barraHerramienta.contains(e.target) && !toolsToggle.contains(e.target)) {
                    barraHerramienta.classList.remove('active');
                }
            }
        });
    }

    setupTouchEvents() {
        const container = document.querySelector('.contenedor-grafica');
        if (!container) return;
        
        let isDragging = false;
        let startX, startY;
        
        container.addEventListener('touchstart', (e) => {
            if(e.target.closest('.floating-card')) return;
            if(e.target.tagName === 'rect' || e.target.tagName === 'text') return;

            if (e.touches.length === 1) {
                isDragging = true;
                const currentTranslate = this.panZoomManager.getTranslate();
                startX = e.touches[0].clientX - currentTranslate.x;
                startY = e.touches[0].clientY - currentTranslate.y;
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            if (e.cancelable) e.preventDefault();
            
            const translateX = e.touches[0].clientX - startX;
            const translateY = e.touches[0].clientY - startY;
            this.panZoomManager.setTranslate(translateX, translateY);
            this.panZoomManager.actualizarTransform();
        }, { passive: false });

        window.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    /**
     * Inicializa el selector de pensum y maneja el cambio de pensum
     */
    setupPensumSelector() {
        const select = document.getElementById('pensumSelect');
        if (!select) return;

        // Poblar opciones
        try {
            const pensums = listAvailablePensums();
            console.debug('Pensums cargados:', pensums); // Debug: mostrar pensums cargados
            select.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '-- Selecciona pensum --';
            select.appendChild(defaultOpt);

            pensums.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.file;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
        } catch (err) {
            console.warn('No se pudieron listar pensums:', err);
            select.innerHTML = '<option value="">Error</option>';
            return;
        }

        select.addEventListener('change', async () => {
            const relPath = select.value;
            if (!relPath) return;

            try {
                await loadPensum(relPath);

                // Actualizar estructura del grafo
                if (this.graphManager && typeof this.graphManager.updateCursos === 'function') {
                    this.graphManager.updateCursos(cursos, cursoMap);
                }

                // Volver a cargar progreso (si aplica)
                if (this.storageManager && typeof this.storageManager.cargarProgreso === 'function') {
                    this.storageManager.cargarProgreso(cursos, cursoMap);
                }

                // Redibujar grafo
                this.graphManager.dibujarGrafo();

            } catch (err) {
                console.error('Error al cargar pensum:', err);
                alert('No se pudo cargar el pensum seleccionado. Revisa la consola para más detalles.');
            }
        });
    }

    getInfoCardManager() {
        return this.infoCardManager;
    }

    getTooltipManager() {
        return this.tooltipManager;
    }

    getThemeManager() {
        return this.themeManager;
    }

    getSearchManager() {
        return this.searchManager;
    }

    getPanZoomManager() {
        return this.panZoomManager;
    }
}