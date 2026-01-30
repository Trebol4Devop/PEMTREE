import { NodoCurso, cursos, cursoMap, initializeCursos } from './modules/data/cursos.js';
import { GraphManager } from './modules/graph/GraphManager.js';
import { UIController } from './modules/ui/UIController.js';
import { StorageManager } from './modules/storage/StorageManager.js';
import { TextUtils } from './modules/utils/TextUtils.js';

// Inicializar la aplicación cuando el DOM esté listo y los cursos cargados
document.addEventListener('DOMContentLoaded', async () => {
    await initializeCursos();

    // Instancia del gestor de grafo
    const graphManager = new GraphManager(cursos, cursoMap);
    // Instancia del gestor de almacenamiento
    const storageManager = new StorageManager();
    // Instancia del controlador general de UI
    const uiController = new UIController(graphManager, storageManager);

    uiController.init();
});