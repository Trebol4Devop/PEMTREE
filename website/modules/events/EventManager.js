// modules/events/EventManager.js - Gestión de eventos

export class EventManager {
    constructor(graphManager, uiController, storageManager) {
        this.graphManager = graphManager;
        this.uiController = uiController;
        this.storageManager = storageManager;
    }

    init() {
        this.setupToolbarControls();
        this.setupZoomControls();
        this.setupLayoutControls();
        this.setupViewModeControls();
        this.setupFullscreenControls();
        this.setupCreditsCounter();
        this.setupCloseInfoCard();
    }

    setupCreditsCounter() {
        const barra = document.querySelector('.barraHerramienta');
        if(!barra) return;
        
        if(!document.getElementById('creditos-display')) {
            const divCreditos = document.createElement('div');
            divCreditos.id = 'creditos-display';
            divCreditos.className = 'creditos-counter';
            divCreditos.innerHTML = '<span>Créditos: 0</span>';
            
            const zoomGroup = barra.querySelector('.zoom-group');
            if(zoomGroup) {
                barra.insertBefore(divCreditos, zoomGroup);
            } else {
                barra.appendChild(divCreditos);
            }
        }
    }

    setupToolbarControls() {
        // Tema
        const btnTema = document.getElementById('toggleTema');
        if (btnTema) {
            btnTema.addEventListener('click', () => {
                this.uiController.getThemeManager().toggle();
            });
        }

        // Limpiar
        const btnLimpiar = document.getElementById('vistaRecetear');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarVista());
        }

        // Optativos
        const btnOptativos = document.getElementById('cursosObligatorios');
        if (btnOptativos) {
            btnOptativos.addEventListener('click', (e) => {
                const nuevoEstado = !this.graphManager.showOptional;
                this.graphManager.setShowOptional(nuevoEstado);
                e.target.innerHTML = nuevoEstado ? "Optativos" : "Optativos (Ocultos)";
            });
        }
    }

    setupViewModeControls() {
        // Ruta crítica
        const btnRutaCritica = document.getElementById('btnRutaCritica');
        if (btnRutaCritica) {
            btnRutaCritica.addEventListener('click', (e) => {
                const nuevoEstado = !this.graphManager.showCriticalPath;
                this.graphManager.setShowCriticalPath(nuevoEstado);
                e.target.classList.toggle('active');
            });
        }

        // Vista por semestres
        const btnVistaSemestre = document.getElementById('btnVistaSemestre');
        if (btnVistaSemestre) {
            btnVistaSemestre.addEventListener('click', (e) => {
                const nuevoModo = this.graphManager.viewMode === 'topological' ? 'semester' : 'topological';
                this.graphManager.setViewMode(nuevoModo);
                e.target.classList.toggle('active');
            });
        }
    }

    setupLayoutControls() {
        const btnVertical = document.getElementById('disposicionVertical');
        if (btnVertical) {
            btnVertical.addEventListener('click', () => {
                this.graphManager.setCurrentLayout('vertical');
            });
        }

        const btnHorizontal = document.getElementById('disposicionHorizontal');
        if (btnHorizontal) {
            btnHorizontal.addEventListener('click', () => {
                this.graphManager.setCurrentLayout('horizontal');
            });
        }
    }

    setupZoomControls() {
        const panZoomManager = this.uiController.getPanZoomManager();
        
        const btnZoomIn = document.getElementById('zoomIn');
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => panZoomManager.zoomIn());
        }

        const btnZoomOut = document.getElementById('zoomOut');
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => panZoomManager.zoomOut());
        }

        const btnZoomReset = document.getElementById('zoomReset');
        if (btnZoomReset) {
            btnZoomReset.addEventListener('click', () => panZoomManager.zoomReset());
        }
    }

    setupFullscreenControls() {
        const btnEntrar = document.getElementById('btnEntrarGrafo');
        const btnSalir = document.getElementById('btnSalirGrafo');
        const contenedorApp = document.getElementById('contenedorApp');
        
        if (btnEntrar) {
            btnEntrar.addEventListener('click', () => {
                if (!contenedorApp) return;
                contenedorApp.style.display = 'flex';
                
                setTimeout(() => {
                    contenedorApp.classList.add('pantalla-completa');
                    document.body.classList.add('no-scroll');
                    this.graphManager.ajustarTamanioSVG();
                }, 10);
            });
        }

        if (btnSalir) {
            btnSalir.addEventListener('click', () => {
                if (!contenedorApp) return;
                contenedorApp.classList.remove('pantalla-completa');
                document.body.classList.remove('no-scroll');
                
                setTimeout(() => {
                    contenedorApp.style.display = 'none';
                }, 200);
            });
        }
    }

    setupCloseInfoCard() {
        // Función global para cerrar info card
        window.cerrarInfo = () => {
            this.uiController.getInfoCardManager().ocultar();
        };
    }

    limpiarVista() {
        if(!confirm("¿Estás seguro de que quieres borrar todo el progreso y reiniciar la vista?")) {
            return;
        }

        this.storageManager.limpiarProgreso(this.graphManager.cursos);
        
        // Cerrar info card
        this.uiController.getInfoCardManager().ocultar();
        
        // Resetear vistas
        this.graphManager.setShowOptional(true);
        this.graphManager.setShowCriticalPath(false);
        this.graphManager.setViewMode('topological');
        this.graphManager.setCurrentLayout('horizontal');
        
        // Actualizar botones
        const btnOptativos = document.getElementById('cursosObligatorios');
        if (btnOptativos) btnOptativos.innerHTML = "Optativos";
        
        const btnRutaCritica = document.getElementById('btnRutaCritica');
        if (btnRutaCritica) btnRutaCritica.classList.remove('active');
        
        const btnVistaSemestre = document.getElementById('btnVistaSemestre');
        if (btnVistaSemestre) btnVistaSemestre.classList.remove('active');
        
        // Limpiar búsqueda
        const searchInput = document.getElementById('buscadorCurso');
        if(searchInput) searchInput.value = '';
        
        // Resetear zoom
        this.uiController.getPanZoomManager().zoomReset();
    }
}