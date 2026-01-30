import { NodoCurso, cursos, cursoMap } from './modules/data/cursos.js';
import { GraphManager } from './modules/graph/GraphManager.js';
import { UIController } from './modules/ui/UIController.js';
import { StorageManager } from './modules/storage/StorageManager.js';
import { TextUtils } from './modules/utils/TextUtils.js';

// Instancia del gestor de grafo
const graphManager = new GraphManager(cursos, cursoMap);
// Instancia del gestor de almacenamiento
const storageManager = new StorageManager();
// Instancia del controlador general de UI
const uiController = new UIController(graphManager, storageManager);

document.addEventListener('DOMContentLoaded', () => uiController.init());