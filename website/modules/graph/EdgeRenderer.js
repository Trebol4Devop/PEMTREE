// modules/graph/EdgeRenderer.js - Renderizado de aristas

export class EdgeRenderer {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
    }

    getNodeDimensions() {
        const isMobile = window.innerWidth <= 768;
        return {
            width: isMobile ? 100 : 140,
            height: isMobile ? 65 : 90
        };
    }

    dibujarArista(graphGroup, fromNode, toNode, currentLayout, selectedNode, showCriticalPath, temaOscuro) {
        const dims = this.getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;
        
        const path = document.createElementNS(this.svgNS, "path");
        
        // Calcular puntos de conexión
        const { d } = this.calcularPath(fromNode, toNode, currentLayout, nodeWidth, nodeHeight);
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        
        // Determinar estilo de la arista
        const style = this.determinarEstiloArista(
            fromNode,
            toNode,
            selectedNode,
            showCriticalPath,
            temaOscuro
        );
        
        path.setAttribute("stroke", style.stroke);
        path.setAttribute("stroke-width", style.strokeWidth);
        if (style.strokeDasharray) {
            path.setAttribute("stroke-dasharray", style.strokeDasharray);
        }
        if (style.markerEnd) {
            path.setAttribute("marker-end", style.markerEnd);
        }
        if (style.opacity) {
            path.setAttribute("opacity", style.opacity);
        }
        
        graphGroup.appendChild(path);
    }

    calcularPath(fromNode, toNode, currentLayout, nodeWidth, nodeHeight) {
        let fromX, fromY, toX, toY, d;

        if (currentLayout === 'vertical') {
            fromX = fromNode.x + nodeWidth / 2;
            fromY = fromNode.y + nodeHeight;
            toX = toNode.x + nodeWidth / 2;
            toY = toNode.y;
            
            const controlY1 = fromY + (toY - fromY) * 0.4;
            const controlY2 = fromY + (toY - fromY) * 0.6;
            d = `M ${fromX} ${fromY} C ${fromX} ${controlY1}, ${toX} ${controlY2}, ${toX} ${toY}`;
        } else {
            fromX = fromNode.x + nodeWidth;
            fromY = fromNode.y + nodeHeight / 2;
            toX = toNode.x;
            toY = toNode.y + nodeHeight / 2;
            
            const controlX1 = fromX + (toX - fromX) * 0.4;
            const controlX2 = fromX + (toX - fromX) * 0.6;
            d = `M ${fromX} ${fromY} C ${controlX1} ${fromY}, ${controlX2} ${toY}, ${toX} ${toY}`;
        }

        return { d };
    }

    determinarEstiloArista(fromNode, toNode, selectedNode, showCriticalPath, temaOscuro) {
        const fromHighlighted = fromNode.highlighted || fromNode.selected;
        const toHighlighted = toNode.highlighted || toNode.selected;
        const aristaEnRutaActiva = fromHighlighted && toHighlighted;
        const aristaCritica = showCriticalPath && fromNode.enRutaCritica && toNode.enRutaCritica;

        let style = {
            stroke: temaOscuro ? "#7f8c8d" : "#bdc3c7",
            strokeWidth: "1",
            strokeDasharray: null,
            markerEnd: null,
            opacity: temaOscuro ? "0.5" : "0.4"
        };

        if (selectedNode && fromNode.id === selectedNode.id) {
            style.stroke = "#f39c12";
            style.strokeWidth = "2";
            style.strokeDasharray = "5,5";
            style.markerEnd = "url(#arrowhead-yellow)";
            style.opacity = null;
        } else if (selectedNode && aristaEnRutaActiva) {
            style.stroke = temaOscuro ? "#95a5a6" : "#2c3e50";
            style.strokeWidth = "2";
            style.markerEnd = "url(#arrowhead)";
            style.opacity = null;
        } else if (aristaCritica) {
            style.stroke = "#e74c3c";
            style.strokeWidth = "3";
            style.strokeDasharray = "5,5";
            style.opacity = null;
        }

        return style;
    }

    crearFlechas(svg) {
        const defs = document.createElementNS(this.svgNS, "defs");
        
        // Flecha normal
        const marker = document.createElementNS(this.svgNS, "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");
        
        const polygon = document.createElementNS(this.svgNS, "polygon");
        polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
        polygon.setAttribute("fill", "#2c3e50");
        marker.appendChild(polygon);
        
        // Flecha amarilla
        const markerYellow = document.createElementNS(this.svgNS, "marker");
        markerYellow.setAttribute("id", "arrowhead-yellow");
        markerYellow.setAttribute("markerWidth", "10");
        markerYellow.setAttribute("markerHeight", "7");
        markerYellow.setAttribute("refX", "9");
        markerYellow.setAttribute("refY", "3.5");
        markerYellow.setAttribute("orient", "auto");
        
        const polygonYellow = document.createElementNS(this.svgNS, "polygon");
        polygonYellow.setAttribute("points", "0 0, 10 3.5, 0 7");
        polygonYellow.setAttribute("fill", "#f39c12");
        markerYellow.appendChild(polygonYellow);
        
        defs.appendChild(marker);
        defs.appendChild(markerYellow);
        svg.appendChild(defs);
    }
}