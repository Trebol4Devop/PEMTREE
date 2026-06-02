// modules/graph/EdgeRenderer.js - Renderizado de aristas

import { getNodeDimensions } from './dimensions.js';

export class EdgeRenderer {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
    }

    dibujarArista(graphGroup, fromNode, toNode, currentLayout, selectedNode, showCriticalPath, temaOscuro) {
        const dims = getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;
        
        const path = document.createElementNS(this.svgNS, "path");
        path.setAttribute("class", "edge-path");
        
        const { d } = this.calcularPath(fromNode, toNode, currentLayout, nodeWidth, nodeHeight);
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        
        this._aplicarEstilo(path, fromNode, toNode, selectedNode, showCriticalPath, temaOscuro);
        
        graphGroup.appendChild(path);
        return path;
    }

    _aplicarEstilo(path, fromNode, toNode, selectedNode, showCriticalPath, temaOscuro) {
        const style = this.determinarEstiloArista(
            fromNode, toNode, selectedNode, showCriticalPath, temaOscuro
        );

        path.setAttribute("stroke", style.stroke);
        path.setAttribute("stroke-width", style.strokeWidth);
        if (style.strokeDasharray) {
            path.setAttribute("stroke-dasharray", style.strokeDasharray);
        } else {
            path.removeAttribute("stroke-dasharray");
        }
        if (style.markerEnd) {
            path.setAttribute("marker-end", style.markerEnd);
        } else {
            path.removeAttribute("marker-end");
        }
        if (style.opacity) {
            path.setAttribute("opacity", style.opacity);
        } else {
            path.removeAttribute("opacity");
        }
    }

    actualizarArista(path, fromNode, toNode, selectedNode, showCriticalPath, temaOscuro) {
        this._aplicarEstilo(path, fromNode, toNode, selectedNode, showCriticalPath, temaOscuro);
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
        const fromEnRuta = showCriticalPath && fromNode.enRuta && !fromNode.enRutaCritica;
        const toEnRuta = showCriticalPath && toNode.enRuta && !toNode.enRutaCritica;
        const aristaSugerida = showCriticalPath && (fromEnRuta || toEnRuta) && fromNode.enRuta && toNode.enRuta;

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
            style.stroke = temaOscuro ? "#0747A6" : "#2c3e50";
            style.strokeWidth = "2";
            style.markerEnd = temaOscuro ? "url(#arrowhead-blue)" : "url(#arrowhead)";
            style.opacity = null;
        } else if (aristaCritica) {
            style.stroke = "#e74c3c";
            style.strokeWidth = "3";
            style.strokeDasharray = "5,5";
            style.opacity = null;
        } else if (aristaSugerida) {
            style.stroke = temaOscuro ? "#fbbf24" : "#d97706";
            style.strokeWidth = "2";
            style.strokeDasharray = "4,4";
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

        // Flecha blanca
        const markerBlue = document.createElementNS(this.svgNS, "marker");
        markerBlue.setAttribute("id", "arrowhead-blue");
        markerBlue.setAttribute("markerWidth", "10");
        markerBlue.setAttribute("markerHeight", "7");
        markerBlue.setAttribute("refX", "9");
        markerBlue.setAttribute("refY", "3.5");
        markerBlue.setAttribute("orient", "auto");

        const polygonBlue = document.createElementNS(this.svgNS, "polygon");
        polygonBlue.setAttribute("points", "0 0, 10 3.5, 0 7");
        polygonBlue.setAttribute("fill", "#0747A6");
        markerBlue.appendChild(polygonBlue);
        
        defs.appendChild(marker);
        defs.appendChild(markerYellow);
        defs.appendChild(markerBlue);
        svg.appendChild(defs);
    }
}