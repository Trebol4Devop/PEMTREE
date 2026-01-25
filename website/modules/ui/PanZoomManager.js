// modules/ui/PanZoomManager.js - Gestión de pan y zoom

export class PanZoomManager {
    constructor(svg) {
        this.svg = svg;
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
    }

    init() {
        const container = document.querySelector('.contenedor-grafica');
        if (!container) return;

        // Click en área vacía para cerrar info
        container.addEventListener('click', (e) => {
            if(e.target.tagName !== 'rect' && e.target.tagName !== 'text' && !e.target.closest('.floating-card')) {
                const infoCard = document.getElementById('infoCard');
                if (infoCard) {
                    window.cerrarInfo();
                }
            }
        });

        // Pan con mouse
        container.addEventListener('mousedown', (e) => {
            if(e.target.closest('.floating-card')) return;
            if(e.target.tagName === 'rect' || e.target.tagName === 'text') return;
            
            e.preventDefault();
            this.isDragging = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            container.style.cursor = 'grab';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.translateX = e.clientX - this.startX;
            this.translateY = e.clientY - this.startY;
            this.actualizarTransform();
        });
    }

    actualizarTransform() {
        const graphGroup = document.getElementById('grafica-group');
        if(graphGroup) {
            graphGroup.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
        }
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.scale * 100)}%`;
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
        const container = document.querySelector('.contenedor-grafica');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.scale = 1.2;
        
        const nodeWidth = window.innerWidth <= 768 ? 100 : 140;
        const nodeHeight = window.innerWidth <= 768 ? 65 : 90;
        
        const nodeCenterX = curso.x + nodeWidth / 2;
        const nodeCenterY = curso.y + nodeHeight / 2;
        
        this.translateX = (width / 2) - (nodeCenterX * this.scale);
        this.translateY = (height / 2) - (nodeCenterY * this.scale);
        
        this.actualizarTransform();
    }

    setScale(value) {
        this.scale = value;
    }

    setTranslate(x, y) {
        this.translateX = x;
        this.translateY = y;
    }

    getTranslate() {
        return { x: this.translateX, y: this.translateY };
    }

    getScale() {
        return this.scale;
    }
}