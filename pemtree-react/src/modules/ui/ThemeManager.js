// modules/ui/ThemeManager.js - Gestión de tema claro/oscuro

export class ThemeManager {
    constructor(graphManager) {
        this.graphManager = graphManager;
    }

    toggle() {
        const nuevoTema = !this.graphManager.temaOscuro;
        this.graphManager.setTemaOscuro(nuevoTema);
        this.aplicarTema(nuevoTema);
        this.guardarPreferencia(nuevoTema);
    }

    aplicarTema(temaOscuro) {
        const container = document.querySelector('.contenedor-grafica');
        const barraHerramienta = document.querySelector('.barraHerramienta');
        const floatingCard = document.querySelector('.floating-card');
        const btnTema = document.getElementById('toggleTema');
        
        if (temaOscuro) {
            if (container) container.classList.add('tema-oscuro');
            if (barraHerramienta) barraHerramienta.classList.add('tema-oscuro');
            if (floatingCard) floatingCard.classList.add('tema-oscuro');
            if (btnTema) btnTema.classList.add('active');
        } else {
            if (container) container.classList.remove('tema-oscuro');
            if (barraHerramienta) barraHerramienta.classList.remove('tema-oscuro');
            if (floatingCard) floatingCard.classList.remove('tema-oscuro');
            if (btnTema) btnTema.classList.remove('active');
        }
    }

    guardarPreferencia(temaOscuro) {
        localStorage.setItem('pemtree_tema', temaOscuro ? 'oscuro' : 'claro');
    }

    cargarPreferenciaTema() {
        const temaGuardado = localStorage.getItem('pemtree_tema');
        if (temaGuardado === 'oscuro') {
            this.graphManager.setTemaOscuro(true);
            this.aplicarTema(true);
        }
    }
}