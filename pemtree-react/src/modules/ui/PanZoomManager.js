import { getNodeDimensions } from '../graph/dimensions.js';

export class PanZoomManager {
    constructor(svg) {
        this.svg = svg;
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.onZoomChange = null; // Callback para React
    }

    // Ahora recibe el contenedor y la función callback
    init(container, onZoomChangeCallback) {
        if (!container) return;
        this.onZoomChange = onZoomChangeCallback;

        this._onMouseMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.translateX = e.clientX - this.startX;
            this.translateY = e.clientY - this.startY;
            this.actualizarTransform();
        };

        container.addEventListener('mousedown', (e) => {
            if(e.target.closest('.floating-card') || e.target.closest('.fade-in')) return;
            if(e.target.tagName === 'rect' || e.target.tagName === 'text') return;
            
            e.preventDefault();
            this.isDragging = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
            window.addEventListener('mousemove', this._onMouseMove);
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                window.removeEventListener('mousemove', this._onMouseMove);
            }
        });
    }

    actualizarTransform() {
        const graphGroup = document.getElementById('grafica-group');
        if(graphGroup) {
            graphGroup.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
        }
        
        // Enviamos el nuevo valor a React en lugar de buscar #zoomLevel en el DOM
        if (this.onZoomChange) {
            this.onZoomChange(Math.round(this.scale * 100));
        }
    }

    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        this.actualizarTransform();
    }

    zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.3);
        this.actualizarTransform();
    }

    zoomReset() {
        const isMobile = window.innerWidth <= 768;
        this.scale = isMobile ? 0.5 : 1.0;
        this.translateX = isMobile ? 50 : 0;
        this.translateY = isMobile ? 50 : 0;
        this.actualizarTransform();
    }

    centrarEnNodo(curso) {
        const container = document.querySelector('.contenedor-grafica'); // fallback
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.scale = 1.2;
        
        const dims = getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;
        
        const nodeCenterX = curso.x + nodeWidth / 2;
        const nodeCenterY = curso.y + nodeHeight / 2;
        
        this.translateX = (width / 2) - (nodeCenterX * this.scale);
        this.translateY = (height / 2) - (nodeCenterY * this.scale);
        
        this.actualizarTransform();
    }

    setScale(value) { this.scale = value; }
    setTranslate(x, y) { this.translateX = x; this.translateY = y; }
    getTranslate() { return { x: this.translateX, y: this.translateY }; }
    getScale() { return this.scale; }
}