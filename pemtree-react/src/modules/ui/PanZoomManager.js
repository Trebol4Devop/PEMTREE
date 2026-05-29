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
        this._rafPending = false;
        this._nextX = 0;
        this._nextY = 0;
        this.container = null;
        this.graphGroup = null;
        this._lastTransform = '';
    }

    // Ahora recibe el contenedor y la función callback
    init(container, onZoomChangeCallback) {
        if (!container) return;
        this.container = container;
        this.graphGroup = document.getElementById('grafica-group');
        this.onZoomChange = onZoomChangeCallback;

        this._scheduleTransform = () => {
            if (this._rafPending) return;
            this._rafPending = true;
            requestAnimationFrame(() => {
                this.translateX = this._nextX;
                this.translateY = this._nextY;
                this.actualizarTransform();
                this._rafPending = false;
            });
        };

        this._onMouseMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this._nextX = e.clientX - this.startX;
            this._nextY = e.clientY - this.startY;
            this._scheduleTransform();
        };

        this._onTouchMove = (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            if (e.cancelable) e.preventDefault();
            this._nextX = e.touches[0].clientX - this.startX;
            this._nextY = e.touches[0].clientY - this.startY;
            this._scheduleTransform();
        };

        container.addEventListener('mousedown', (e) => {
            if(e.target.closest('.floating-card') || e.target.closest('.fade-in')) return;
            
            e.preventDefault();
            this.isDragging = true;
            this.container.classList.add('is-panning');
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
            window.addEventListener('mousemove', this._onMouseMove);
        });

        container.addEventListener('touchstart', (e) => {
            if(e.target.closest('.floating-card') || e.target.closest('.fade-in')) return;
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.container.classList.add('is-panning');
                this.startX = e.touches[0].clientX - this.translateX;
                this.startY = e.touches[0].clientY - this.translateY;
            }
        }, { passive: false });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                if (this.container) this.container.classList.remove('is-panning');
                window.removeEventListener('mousemove', this._onMouseMove);
            }
        });

        window.addEventListener('touchmove', this._onTouchMove, { passive: false });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
            if (this.container) this.container.classList.remove('is-panning');
        });
    }

    actualizarTransform() {
        if (!this.graphGroup) {
            this.graphGroup = document.getElementById('grafica-group');
        }
        if (this.graphGroup) {
            const transformValue = `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`;
            if (transformValue !== this._lastTransform) {
                this.graphGroup.setAttribute('transform', transformValue);
                this._lastTransform = transformValue;
            }
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
        this.scale = isMobile ? 0.58 : 1.0;
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
}