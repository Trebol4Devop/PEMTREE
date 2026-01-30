// modules/graph/NodeRenderer.js - Renderizado de nodos

import { TextUtils } from '../utils/TextUtils.js';
import { cursoMap } from '../data/cursos.js';

export class NodeRenderer {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
    }

    getNodeDimensions() {
        const isMobile = window.innerWidth <= 768;
        // Base original (antes reducción): 48 (móvil) / 90 (desktop)
        const baseHeight = isMobile ? 48 : 90;
        // Reducir tamaño en 40% -> mantener 60% del original
        const height = Math.round(baseHeight * 0.6);
        const width = height * 6; // formato 6:1
        return {
            width: width,
            height: height
        };
    }

    dibujarNodo(graphGroup, curso, showCriticalPath, temaOscuro, onClickCallback) {
        const dims = this.getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;

        const group = document.createElementNS(this.svgNS, "g");
        group.setAttribute("class", "node-group");

        // Determinar colores base y por secciones (modulares)
        const colors = this.determinarColores(curso, showCriticalPath, temaOscuro);
        const sectionColors = this.getSectionColors(curso, colors, temaOscuro, nodeWidth, nodeHeight);

        // Dibujar las 5 partes (izq arriba, izq abajo, centro, der arriba, der abajo)
        const parts = this.crearNodoCompuesto(curso, nodeWidth, nodeHeight, sectionColors);

        // Click en todo el nodo
        group.addEventListener("click", (e) => {
            e.stopPropagation();
            if (onClickCallback) onClickCallback(curso);
        });

        // Si está seleccionado, aplicar clase para aumentar tamaño y sombra
        if (curso.selected) {
            group.classList.add('node-selected');
        }

        group.appendChild(parts);

        // Dibujar textos en sus secciones
        this.dibujarTextos(group, curso, nodeWidth, nodeHeight, temaOscuro, sectionColors);

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

    // Devuelve colores para cada sección (permitir overrides en curso.colors)
    // Nuevos colores base solicitados: #fc904f, #ffd0b6
    getSectionColors(curso, colors, temaOscuro) {
        const defaultText = temaOscuro ? '#ecf0f1' : '#333';
        const s = curso.colors || {};
        // Eliminamos bordes: siempre stroke = 'none' y strokeWidth = '0'
        const stroke = 'none';
        const strokeWidth = '0';

        return {
            leftTop: {
                fill: (s.leftTop && s.leftTop.fill) || '#fc904f',
                stroke, strokeWidth
            },
            leftBottom: {
                fill: (s.leftBottom && s.leftBottom.fill) || '#ffd0b6',
                stroke, strokeWidth
            },
            center: {
                fill: (s.center && s.center.fill) || '#ffd0b6',
                stroke, strokeWidth
            },
            right: {
                fill: (s.right && s.right.fill) || (s.rightTop && s.rightTop.fill) || (s.rightBottom && s.rightBottom.fill) || '#fc904f',
                stroke, strokeWidth
            },
            text: (s.text && s.text.fill) || defaultText
        };
    }

    // Crea el conjunto de rects que conforman el nodo
    // Los laterales están formados por dos rectángulos (cada uno height/2) y ancho = nodeHeight,
    // de modo que al unirse verticalmente forman un cuadrado de lado = nodeHeight
    crearNodoCompuesto(curso, nodeWidth, nodeHeight, sectionColors) {
        const g = document.createElementNS(this.svgNS, "g");
        const leftX = curso.x;
        const lateralWidth = nodeHeight; // ancho de cada lateral para formar un cuadrado
        const halfH = nodeHeight / 2; // altura de cada rectángulo lateral
        const centerX = leftX + lateralWidth;
        const centerW = nodeWidth - (2 * lateralWidth);
        const rightX = centerX + centerW;

        // Izquierda - arriba
        const leftTop = document.createElementNS(this.svgNS, "rect");
        leftTop.setAttribute("x", leftX);
        leftTop.setAttribute("y", curso.y);
        leftTop.setAttribute("width", lateralWidth);
        leftTop.setAttribute("height", halfH);
        leftTop.setAttribute("fill", sectionColors.leftTop.fill);
        leftTop.setAttribute("stroke", "none");
        leftTop.setAttribute("stroke-width", "0");
        leftTop.setAttribute("class", "node-section left-top");
        g.appendChild(leftTop);

        // Izquierda - abajo
        const leftBottom = document.createElementNS(this.svgNS, "rect");
        leftBottom.setAttribute("x", leftX);
        leftBottom.setAttribute("y", curso.y + halfH);
        leftBottom.setAttribute("width", lateralWidth);
        leftBottom.setAttribute("height", halfH);
        leftBottom.setAttribute("fill", sectionColors.leftBottom.fill);
        leftBottom.setAttribute("stroke", "none");
        leftBottom.setAttribute("stroke-width", "0");
        leftBottom.setAttribute("class", "node-section left-bottom");
        g.appendChild(leftBottom);

        // Centro (con esquinas ligeramente redondeadas)
        const center = document.createElementNS(this.svgNS, "rect");
        center.setAttribute("x", centerX);
        center.setAttribute("y", curso.y);
        center.setAttribute("width", centerW);
        center.setAttribute("height", nodeHeight);
        center.setAttribute("rx", Math.max(2, lateralWidth * 0.08));
        center.setAttribute("ry", Math.max(2, lateralWidth * 0.08));
        center.setAttribute("fill", sectionColors.center.fill);
        center.setAttribute("stroke", "none");
        center.setAttribute("stroke-width", "0");
        center.setAttribute("class", "node-section center");
        g.appendChild(center);

        // Derecha (un solo rectángulo que muestra todos los prerrequisitos)
        const rightRect = document.createElementNS(this.svgNS, "rect");
        rightRect.setAttribute("x", rightX);
        rightRect.setAttribute("y", curso.y);
        rightRect.setAttribute("width", lateralWidth);
        rightRect.setAttribute("height", nodeHeight);
        rightRect.setAttribute("fill", sectionColors.right.fill);
        rightRect.setAttribute("stroke", "none");
        rightRect.setAttribute("stroke-width", "0");
        rightRect.setAttribute("class", "node-section right");
        g.appendChild(rightRect);

        // Añadir clase para estilos si se desea
        g.setAttribute("class", "node-composite");

        return g;
    }

    dibujarTextos(group, curso, nodeWidth, nodeHeight, temaOscuro, sectionColors) {
        const isMobile = window.innerWidth <= 768;
        const leftX = curso.x;
        const lateralWidth = nodeHeight; // coincide con crearNodoCompuesto
        const halfH = nodeHeight / 2;
        const centerX = leftX + lateralWidth;
        const centerW = nodeWidth - (2 * lateralWidth);
        const rightX = centerX + centerW;

        // Texto en izquierda superior: código (centrado dentro del rectángulo ancho = lateralWidth)
        const codeText = document.createElementNS(this.svgNS, "text");
        codeText.setAttribute("x", leftX + lateralWidth / 2);
        codeText.setAttribute("y", curso.y + halfH / 2 + (isMobile ? 3 : 5));
        codeText.setAttribute("font-family", "Segoe UI, Arial");
        codeText.setAttribute("font-size", isMobile ? "8" : "10");
        codeText.setAttribute("text-anchor", "middle");
        codeText.setAttribute("font-weight", "bold");
        codeText.setAttribute("fill", curso.completado ? (temaOscuro ? "#2ecc71" : "#1e8449") : sectionColors.text);
        codeText.textContent = curso.codigo + (curso.completado ? " ✓" : "");
        group.appendChild(codeText);

        // Texto en izquierda inferior: créditos
        const creditsText = document.createElementNS(this.svgNS, "text");
        creditsText.setAttribute("x", leftX + lateralWidth / 2);
        creditsText.setAttribute("y", curso.y + halfH + halfH / 2 + (isMobile ? 3 : 5));
        creditsText.setAttribute("font-family", "Segoe UI, Arial");
        creditsText.setAttribute("font-size", isMobile ? "7" : "9");
        creditsText.setAttribute("text-anchor", "middle");
        creditsText.setAttribute("fill", sectionColors.text);
        creditsText.textContent = String(curso.creditos);
        group.appendChild(creditsText);

        // Nombre del curso en centro (centrado verticalmente)
        const nameFontSize = isMobile ? 8 : 11;
        const maxCharsPerLine = Math.max(6, Math.floor((centerW - 12) / (isMobile ? 6 : 7)));
        const nombreLines = TextUtils.dividirTextoEnLineas(curso.nombre, maxCharsPerLine);

        const lineHeight = isMobile ? 10 : 12;
        const totalHeight = nombreLines.length * lineHeight;
        let startY = curso.y + (nodeHeight / 2) - (totalHeight / 2) + (isMobile ? 4 : 5);

        nombreLines.forEach((line, index) => {
            const ln = document.createElementNS(this.svgNS, "text");
            ln.setAttribute("x", centerX + centerW / 2);
            ln.setAttribute("y", startY + (index * lineHeight));
            ln.setAttribute("font-family", "Segoe UI, Arial");
            ln.setAttribute("font-size", String(nameFontSize));
            ln.setAttribute("text-anchor", "middle");
            ln.setAttribute("fill", sectionColors.text);
            ln.textContent = line;
            group.appendChild(ln);
        });

        // Punto pequeño en esquina superior derecha del centro si es obligatorio
        if (curso.obligatorio) {
            const dot = document.createElementNS(this.svgNS, "circle");
            const dotR = isMobile ? 2 : 3;
            dot.setAttribute("cx", centerX + centerW - (dotR + 4));
            dot.setAttribute("cy", curso.y + (dotR + 4));
            dot.setAttribute("r", dotR);
            dot.setAttribute("fill", "#e74c3c");
            group.appendChild(dot);
        }

        // Prerrequisitos en la columna derecha (lista vertical dentro de un único rectángulo)
        const prereqIds = curso.prerequisitos || [];
        const prereqCodes = prereqIds.map(id => {
            const c = cursoMap.get(id);
            return c ? c.codigo : '';
        }).filter(Boolean);

        if (prereqCodes.length > 0) {
            const lineHeightReq = isMobile ? 9 : 11;
            // Mostrar todos los prerrequisitos apilados verticalmente (el usuario pidió mostrar todos)
            const startYReq = curso.y + (nodeHeight / 2) - ((prereqCodes.length - 1) * lineHeightReq / 2) + (isMobile ? 3 : 5);
            prereqCodes.forEach((code, idx) => {
                const t = document.createElementNS(this.svgNS, "text");
                t.setAttribute("x", rightX + lateralWidth / 2);
                t.setAttribute("y", startYReq + idx * lineHeightReq);
                t.setAttribute("font-family", "Segoe UI, Arial");
                t.setAttribute("font-size", isMobile ? "7" : "9");
                t.setAttribute("text-anchor", "middle");
                t.setAttribute("fill", sectionColors.text);
                t.textContent = code;
                group.appendChild(t);
            });
        }
    }

    dibujarAdvertencia(group, curso, nodeWidth, nodeHeight) {
        const isMobile = window.innerWidth <= 768;
        const squareSize = nodeHeight / 2;
        const centerX = curso.x + squareSize;
        const centerW = nodeWidth - (2 * squareSize);

        const warning = document.createElementNS(this.svgNS, "text");
        warning.setAttribute("x", centerX + centerW - (isMobile ? 12 : 16));
        warning.setAttribute("y", curso.y + (isMobile ? 12 : 16));
        warning.setAttribute("fill", "#e74c3c");
        warning.setAttribute("font-size", isMobile ? "12" : "16");
        warning.setAttribute("font-weight", "bold");
        warning.textContent = "⚠️";
        group.appendChild(warning);
    }
}