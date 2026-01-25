// modules/ui/TooltipManager.js - Gestión de tooltips

export class TooltipManager {
    constructor() {
        this.tooltipEl = this.crearTooltip();
    }

    crearTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'curso-tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    mostrar(e, curso) {
        // No mostrar tooltip en móviles
        if (window.innerWidth <= 768) return;
        if (!this.tooltipEl) return;
        
        this.tooltipEl.textContent = `${curso.codigo} - ${curso.nombre}`;
        this.tooltipEl.style.display = 'block';
        this.mover(e);
    }

    mover(e) {
        if (!this.tooltipEl) return;
        
        const offset = 15;
        this.tooltipEl.style.left = (e.clientX + offset) + 'px';
        this.tooltipEl.style.top = (e.clientY + offset) + 'px';
    }

    ocultar() {
        if (this.tooltipEl) {
            this.tooltipEl.style.display = 'none';
        }
    }
}