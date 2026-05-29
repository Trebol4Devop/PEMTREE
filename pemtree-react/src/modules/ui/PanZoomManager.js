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
        this.onZoomChange = null;
        this._rafPending = false;
        this._nextX = 0;
        this._nextY = 0;
        this.container = null;
        this.graphGroup = null;
        this._lastTransform = '';
        this._bounds = null;
        this._pinching = false;
        this._pinchStartDist = 0;
        this._pinchStartScale = 1;
        this._pinchCenterX = 0;
        this._pinchCenterY = 0;
    }

    _calcularLimites() {
        const cw = this.container ? this.container.clientWidth : 1000;
        const ch = this.container ? this.container.clientHeight : 800;
        const rawW = this.svg.getAttribute('width') || '';
        const rawH = this.svg.getAttribute('height') || '';
        const parsedW = parseInt(rawW);
        const parsedH = parseInt(rawH);
        const svgW = !isNaN(parsedW) && rawW.indexOf('%') === -1 ? parsedW : (cw * 2);
        const svgH = !isNaN(parsedH) && rawH.indexOf('%') === -1 ? parsedH : (ch * 2);
        const hMargin = 0.15;
        const vMargin = 0.0000625;

        const contentW = svgW * this.scale;
        const contentH = svgH * this.scale;

        if (contentW > cw) {
            this._maxTx = cw * hMargin;
            this._minTx = cw * (1 - hMargin) - contentW;
        } else {
            this._maxTx = cw * hMargin;
            this._minTx = cw - contentW - cw * hMargin;
        }

        if (contentH > ch) {
            this._maxTy = ch * vMargin;
            this._minTy = ch * (1 - vMargin) - contentH;
        } else {
            this._maxTy = ch * vMargin;
            this._minTy = ch - contentH - ch * vMargin;
        }
    }

    _aplicarLimites() {
        if (this._minTx === undefined) return;
        this.translateX = Math.max(this._minTx, Math.min(this._maxTx, this.translateX));
        this.translateY = Math.max(this._minTy, Math.min(this._maxTy, this.translateY));
    }

    // Ahora recibe el contenedor y la función callback
    init(container, onZoomChangeCallback) {
        if (!container) return;
        this.container = container;
        this.graphGroup = document.getElementById('grafica-group');
        this.onZoomChange = onZoomChangeCallback;
        this._calcularLimites();

        this._scheduleTransform = () => {
            if (this._rafPending) return;
            this._rafPending = true;
            requestAnimationFrame(() => {
                this.translateX = this._nextX;
                this.translateY = this._nextY;
                this._aplicarLimites();
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
            if (e.touches.length === 2 && this._pinching) {
                if (e.cancelable) e.preventDefault();
                const t = e.touches;
                const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
                const factor = dist / this._pinchStartDist;
                const newScale = Math.max(0.3, Math.min(3.0, this._pinchStartScale * factor));

                const oldScale = this.scale;
                this.scale = newScale;
                const cx = this._pinchCenterX;
                const cy = this._pinchCenterY;
                this.translateX = this.translateX + (cx - this.translateX) * (1 - newScale / oldScale);
                this.translateY = this.translateY + (cy - this.translateY) * (1 - newScale / oldScale);

                this._calcularLimites();
                this._aplicarLimites();
                this.actualizarTransform();
                return;
            }

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
            if (e.touches.length === 2) {
                this._pinching = true;
                this.isDragging = false;
                const t = e.touches;
                this._pinchStartDist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
                this._pinchStartScale = this.scale;
                this._pinchCenterX = (t[0].clientX + t[1].clientX) / 2;
                this._pinchCenterY = (t[0].clientY + t[1].clientY) / 2;
            } else if (e.touches.length === 1) {
                this.isDragging = true;
                this._pinching = false;
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
            this._pinching = false;
            if (this.container) this.container.classList.remove('is-panning');
        });

        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const rect = container.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                const factor = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.max(0.3, Math.min(3.0, this.scale * factor));
                const oldScale = this.scale;
                this.scale = newScale;
                this.translateX = cx - (cx - this.translateX) * newScale / oldScale;
                this.translateY = cy - (cy - this.translateY) * newScale / oldScale;
                this._calcularLimites();
                this._aplicarLimites();
                this.actualizarTransform();
            } else if (e.shiftKey) {
                e.preventDefault();
                this.translateX -= e.deltaY;
                this._aplicarLimites();
                this.actualizarTransform();
            } else {
                e.preventDefault();
                this.translateY -= e.deltaY;
                this._aplicarLimites();
                this.actualizarTransform();
            }
        }, { passive: false });
    }

    actualizarTransform() {
        if (!this.graphGroup) {
            this.graphGroup = document.getElementById('grafica-group');
        }
        this._aplicarLimites();
        if (this.graphGroup) {
            const transformValue = `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`;
            if (transformValue !== this._lastTransform) {
                this.graphGroup.setAttribute('transform', transformValue);
                this._lastTransform = transformValue;
            }
        }
        
        if (this.onZoomChange) {
            this.onZoomChange(Math.round(this.scale * 100));
        }
    }

    zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        this._calcularLimites();
        this.actualizarTransform();
    }

    zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.3);
        this._calcularLimites();
        this.actualizarTransform();
    }

    zoomReset() {
        const isMobile = window.innerWidth <= 768;
        this.scale = isMobile ? 0.58 : 1.0;
        this._calcularLimites();
        const initTx = isMobile ? 50 : 0;
        const initTy = isMobile ? 50 : 0;
        this.translateX = initTx;
        this.translateY = initTy;
        this._aplicarLimites();
        this.actualizarTransform();
    }

    centrarEnNodo(curso) {
        const container = document.querySelector('.contenedor-grafica');
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
        
        this._calcularLimites();
        this._aplicarLimites();
        this.actualizarTransform();
    }

    setScale(value) { this.scale = value; }
    setTranslate(x, y) {
        this.translateX = x;
        this.translateY = y;
        this._aplicarLimites();
    }
    getTranslate() { return { x: this.translateX, y: this.translateY }; }
}