// main.js - Punto de entrada principal
import { cursos, cursoMap, initializeCursos } from './modules/data/cursos.js';
import { GraphManager } from './modules/graph/GraphManager.js';
import { UIController } from './modules/ui/UIController.js';
import { StorageManager } from './modules/storage/StorageManager.js';
import { EventManager } from './modules/events/EventManager.js';

class PemtreeApp {
    constructor() {
        this.graphManager = null;
        this.uiController = null;
        this.storageManager = null;
        this.eventManager = null;
    }

    async init() {
        // Inicializar cursos desde JSON (o fallback)
        await initializeCursos();

        // Inicializar managers
        this.storageManager = new StorageManager();
        this.graphManager = new GraphManager(cursos, cursoMap);
        this.uiController = new UIController(this.graphManager, this.storageManager);
        this.eventManager = new EventManager(this.graphManager, this.uiController, this.storageManager);

        // Cargar progreso guardado
        this.storageManager.cargarProgreso(cursos, cursoMap);

        // Inicializar UI
        this.uiController.init();
        
        // Configurar eventos
        this.eventManager.init();

        // Entrar directo al visualizador en pantalla completa
        const rutasVista = document.getElementById('rutas-vista');
        const contenedorApp = document.getElementById('contenedorApp');
        if (rutasVista) rutasVista.style.display = 'none';
        if (contenedorApp) {
            contenedorApp.style.display = 'flex';
            contenedorApp.classList.add('pantalla-completa');
            document.body.classList.add('no-scroll');
        }

        // Dibujar gráfica inicial
        this.graphManager.dibujarGrafo();
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new PemtreeApp();
    app.init();
});

export default PemtreeApp;