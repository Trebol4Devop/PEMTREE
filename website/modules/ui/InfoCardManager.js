// modules/ui/InfoCardManager.js - Gestión de tarjeta de información

export class InfoCardManager {
    constructor(graphManager, storageManager) {
        this.graphManager = graphManager;
        this.storageManager = storageManager;
        this.infoCard = document.getElementById('infoCard');
    }

    mostrar(curso) {
        if (!this.infoCard) return;
        
        const content = this.infoCard.querySelector('.node-details-content');
        this.infoCard.classList.remove('hidden');
        
        const cursoMap = this.graphManager.cursoMap;
        
        const getNames = (ids) => ids.map(id => {
            const c = cursoMap.get(id);
            const statusColor = c.completado ? '#27ae60' : (c.disponible ? '#f39c12' : '#7f8c8d');
            return c ? `<span class="badge" data-id="${c.id}" style="color:${statusColor}; border:1px solid ${statusColor}20" title="${c.nombre}">${c.codigo}</span>` : '';
        }).join(' ') || '<span style="color:#999; font-size:0.8em">Ninguno</span>';
        
        const estadoTexto = curso.completado ? 'Completado' : (curso.disponible ? 'Disponible' : 'Bloqueado');
        const estadoClase = curso.completado ? 'estado-disponible' : (curso.disponible ? 'estado-disponible' : 'estado-bloqueado');
        
        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                <h3 style="margin:0; border:none;">${curso.codigo}</h3>
                <span class="estado-badge ${estadoClase}">${estadoTexto}</span>
            </div>
            <div style="color:var(--primary); font-weight:bold; margin-bottom:10px; font-size:1.1em; line-height:1.2;">
                ${curso.nombre}
            </div>

            <div class="detail-row">
                <span><strong>Créditos:</strong> ${curso.creditos}</span>
                <span><strong>Semestre:</strong> ${curso.semestre}</span>
            </div>
            
            <button class="btn-completar ${curso.completado ? 'completado' : 'no-completado'}" 
                    data-curso-id="${curso.id}">
                ${curso.completado ? 
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Completado' : 
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg> Marcar como Ya Cursado'}
            </button>

            <div style="margin-top:15px;">
                <strong style="font-size:0.85rem">Prerrequisitos:</strong>
                <div class="badges">${getNames(curso.prerequisitos)}</div>
            </div>
            
            <div style="margin-top:8px;">
                <strong style="font-size:0.85rem">Habilita:</strong>
                <div class="badges">${getNames(curso.posrequisitos)}</div>
            </div>
            
            ${curso.enRutaCritica && !curso.completado ? '<div class="alert-critical" style="margin-top:10px;">⚠️ Curso Crítico Pendiente</div>' : ''}
        `;

        // Configurar evento del botón completar
        const btnCompletar = content.querySelector('.btn-completar');
        if (btnCompletar) {
            btnCompletar.addEventListener('click', () => {
                this.storageManager.toggleCompletado(curso.id, this.graphManager, this);
            });
        }

        // Configurar tooltips en badges
        content.querySelectorAll('.badge').forEach(badge => {
            const tooltipManager = this.graphManager.tooltipManager;
            if (!tooltipManager) return;
            
            badge.addEventListener('mouseenter', (e) => {
                const id = badge.getAttribute('data-id');
                const cursoMap = this.graphManager.cursoMap;
                const cursoRel = cursoMap.get(parseInt(id));
                if(cursoRel) tooltipManager.mostrar(e, cursoRel);
            });
            badge.addEventListener('mousemove', (e) => tooltipManager.mover(e));
            badge.addEventListener('mouseleave', () => tooltipManager.ocultar());
        });
    }

    ocultar() {
        if (!this.infoCard) return;
        this.infoCard.classList.add('hidden');
        this.graphManager.desseleccionarNodo();
    }
}