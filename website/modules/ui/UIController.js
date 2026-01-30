// modules/ui/UIController.js - Controlador de interfaz

import { PanZoomManager } from './PanZoomManager.js';
import { InfoCardManager } from './InfoCardManager.js';
import { TooltipManager } from './TooltipManager.js';
import { ThemeManager } from './ThemeManager.js';
import { SearchManager } from './SearchManager.js';

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
        
        // Crear overlay si no existe
        let navOverlay = document.querySelector('.nav-overlay');
        if (!navOverlay && navToggle && navLinks) {
            navOverlay = document.createElement('div');
            navOverlay.className = 'nav-overlay';
            document.body.appendChild(navOverlay);
        }
        
        if(navToggle && navLinks) {
            navToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navLinks.classList.toggle('active');
                if (navOverlay) {
                    navOverlay.classList.toggle('active');
                }
            });
            
            // Cerrar menú al hacer clic en un enlace
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    if (navOverlay) {
                        navOverlay.classList.remove('active');
                    }
                });
            });
            
            // Cerrar menú al hacer clic en overlay
            if (navOverlay) {
                navOverlay.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    navOverlay.classList.remove('active');
                });
            }
        }

        const toolsToggle = document.getElementById('tools-toggle');
        const barraHerramienta = document.getElementById('barraHerramienta');
        const closeToolsBtn = document.getElementById('close-tools-btn');

        // Crear overlay para toolbar si no existe
        let toolbarOverlay = document.querySelector('.toolbar-overlay');
        if (!toolbarOverlay && toolsToggle && barraHerramienta) {
            toolbarOverlay = document.createElement('div');
            toolbarOverlay.className = 'toolbar-overlay';
            document.body.appendChild(toolbarOverlay);
        }

        if(toolsToggle && barraHerramienta) {
            // Abrir toolbar
            toolsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                barraHerramienta.classList.add('active');
                toolsToggle.style.display = 'none';
                if (toolbarOverlay) {
                    toolbarOverlay.classList.add('active');
                }
            });

            // Cerrar con botón X
            if(closeToolsBtn) {
                closeToolsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    barraHerramienta.classList.remove('active');
                    if (toolsToggle) {
                        toolsToggle.style.display = 'flex';
                    }
                    if (toolbarOverlay) {
                        toolbarOverlay.classList.remove('active');
                    }
                });
            }

            // Cerrar SOLO al hacer clic en overlay (área oscura)
            if (toolbarOverlay) {
                toolbarOverlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    barraHerramienta.classList.remove('active');
                    if (toolsToggle) {
                        toolsToggle.style.display = 'flex';
                    }
                    toolbarOverlay.classList.remove('active');
                });
            }

            // Prevenir que clics dentro del sidebar lo cierren
            barraHerramienta.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Solo cerrar navLinks cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if(navLinks && navLinks.classList.contains('active')) {
                if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
                    navLinks.classList.remove('active');
                    if (navOverlay) {
                        navOverlay.classList.remove('active');
                    }
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