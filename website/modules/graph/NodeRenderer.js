// modules/graph/NodeRenderer.js - Renderizado de nodos

import { TextUtils } from '../utils/TextUtils.js';

export class NodeRenderer {
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

    dibujarNodo(graphGroup, curso, showCriticalPath, temaOscuro, onClickCallback) {
        const dims = this.getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;
        
        const group = document.createElementNS(this.svgNS, "g");
        
        // Determinar colores
        const colors = this.determinarColores(curso, showCriticalPath, temaOscuro);
        
        // Dibujar rectángulo
        const rect = this.crearRectangulo(curso, nodeWidth, nodeHeight, colors);
        
        rect.addEventListener("click", (e) => {
            e.stopPropagation();
            if (onClickCallback) onClickCallback(curso);
        });
        
        group.appendChild(rect);
        
        // Dibujar texto
        this.dibujarTextos(group, curso, nodeWidth, nodeHeight, temaOscuro);
        
        // Dibujar advertencia si es curso crítico
        if (showCriticalPath && curso.enRutaCritica && !curso.completado) {
            this.dibujarAdvertencia(group, curso, nodeWidth, nodeHeight);
        }

        graphGroup.appendChild(group);
    }

    determinarColores(curso, showCriticalPath, temaOscuro) {
        const baseColors = this.getBaseColors(temaOscuro);
        const isCriticalView = showCriticalPath && curso.enRutaCritica;
        
        let fillColor, strokeColor, strokeWidth, strokeDasharray = null;

        if (curso.selected) {
            fillColor = temaOscuro ? "#34495e" : "#fff";
            strokeColor = baseColors.selected;
            strokeWidth = "3";
        } else if (curso.completado) {
            fillColor = temaOscuro ? "#1e4d40" : "#d4efdf";
            strokeColor = baseColors.completado;
            strokeWidth = "2";
        } else if (curso.disponible) {
            fillColor = temaOscuro ? "#2c3e50" : "#fff";
            strokeColor = baseColors.highlighted;
            strokeWidth = "3";
            strokeDasharray = "5,2";
        } else if (curso.highlighted) {
            fillColor = temaOscuro ? "#2c4f4a" : "#e8f6f3";
            strokeColor = temaOscuro ? "#3fa688" : "#14ab85";
            strokeWidth = "2";
        } else if (isCriticalView) {
            fillColor = temaOscuro ? "#4a2626" : "#fdedec";
            strokeColor = baseColors.critical;
            strokeWidth = "2";
        } else {
            fillColor = temaOscuro ? "#34495e" : "#f4f6f7";
            strokeColor = baseColors.bloqueado;
            strokeWidth = "1";
        }

        return { fillColor, strokeColor, strokeWidth, strokeDasharray };
    }

    getBaseColors(temaOscuro) {
        return temaOscuro ? {
            fill: '#2c3e50',
            stroke: '#34495e',
            text: '#ecf0f1',
            completado: '#27ae60',
            disponible: '#3498db',
            bloqueado: '#7f8c8d',
            selected: '#e67e22',
            highlighted: '#f39c12',
            critical: '#e74c3c'
        } : {
            fill: 'white',
            stroke: '#ccc',
            text: '#555',
            completado: '#1e8449',
            disponible: '#3498db',
            bloqueado: '#bdc3c7',
            selected: '#e67e22',
            highlighted: '#f39c12',
            critical: '#e74c3c'
        };
    }

    crearRectangulo(curso, nodeWidth, nodeHeight, colors) {
        const rect = document.createElementNS(this.svgNS, "rect");
        rect.setAttribute("x", curso.x);
        rect.setAttribute("y", curso.y);
        rect.setAttribute("width", nodeWidth);
        rect.setAttribute("height", nodeHeight);
        rect.setAttribute("rx", "8");
        rect.setAttribute("ry", "8");
        rect.setAttribute("fill", colors.fillColor);
        rect.setAttribute("stroke", colors.strokeColor);
        rect.setAttribute("stroke-width", colors.strokeWidth);
        rect.setAttribute("class", "node-rect");
        
        if (colors.strokeDasharray) {
            rect.setAttribute("stroke-dasharray", colors.strokeDasharray);
        }

        return rect;
    }

    dibujarTextos(group, curso, nodeWidth, nodeHeight, temaOscuro) {
        const isMobile = window.innerWidth <= 768;
        
        // Código del curso
        const textCodigo = document.createElementNS(this.svgNS, "text");
        textCodigo.setAttribute("x", curso.x + nodeWidth / 2);
        textCodigo.setAttribute("y", curso.y + (isMobile ? 15 : 20));
        textCodigo.setAttribute("font-family", "Segoe UI, Arial");
        textCodigo.setAttribute("font-size", isMobile ? "10" : "12");
        textCodigo.setAttribute("text-anchor", "middle");
        textCodigo.setAttribute("font-weight", "bold");
        textCodigo.setAttribute("fill", curso.completado ? 
            (temaOscuro ? "#2ecc71" : "#1e8449") : 
            (temaOscuro ? "#ecf0f1" : "#555"));
        textCodigo.textContent = curso.codigo + (curso.completado ? " ✓" : "");
        group.appendChild(textCodigo);
        
        // Nombre del curso (múltiples líneas)
        const maxCharsPerLine = isMobile ? 12 : 18;
        const nombreLines = TextUtils.dividirTextoEnLineas(curso.nombre, maxCharsPerLine);
        nombreLines.forEach((line, index) => {
            const textLine = document.createElementNS(this.svgNS, "text");
            textLine.setAttribute("x", curso.x + nodeWidth / 2);
            textLine.setAttribute("y", curso.y + (isMobile ? 28 : 35) + (index * (isMobile ? 10 : 14)));
            textLine.setAttribute("font-family", "Segoe UI, Arial");
            textLine.setAttribute("font-size", isMobile ? "7" : "9");
            textLine.setAttribute("text-anchor", "middle");
            textLine.setAttribute("fill", temaOscuro ? "#bdc3c7" : "#555");
            textLine.textContent = line;
            group.appendChild(textLine);
        });
    }

    dibujarAdvertencia(group, curso, nodeWidth, nodeHeight) {
        const isMobile = window.innerWidth <= 768;
        const warning = document.createElementNS(this.svgNS, "text");
        warning.setAttribute("x", curso.x + nodeWidth - (isMobile ? 8 : 10));
        warning.setAttribute("y", curso.y + (isMobile ? 12 : 15));
        warning.setAttribute("fill", "#e74c3c");
        warning.setAttribute("font-size", isMobile ? "12" : "16");
        warning.setAttribute("font-weight", "bold");
        warning.textContent = "⚠️";
        group.appendChild(warning);
    }
}