// modules/graph/NodeRenderer.js - Renderizado de nodos

import { TextUtils } from '../utils/TextUtils.js';
import { cursoMap, currentPensumColors } from '../data/cursos.js';
import { getNodeDimensions } from './dimensions.js';

export class NodeRenderer {
    constructor() {
        this.svgNS = "http://www.w3.org/2000/svg";
        this.lastClickData = {
            cursoId: null,
            time: 0
        };
        this.clickThreshold = 300;
        this.clickTimeout = null;
        this.longPressTimer = null;
        this.longPressThreshold = 500;
        this.touchHandled = false;
        this.touchStartPos = null;
    }

    async dibujarNodo(graphGroup, curso, showCriticalPath, temaOscuro, onClickCallback, onDoubleClickCallback, onLongPressCallback, selectedNode = null) {
        const dims = getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;

        const group = document.createElementNS(this.svgNS, "g");
        group.setAttribute("class", "node-group");

        const colors = this.determinarColores(curso, showCriticalPath, temaOscuro);
        const sectionColors = this.getSectionColors(curso, colors, temaOscuro, nodeWidth, nodeHeight);

        const parts = this.crearNodoCompuesto(curso, nodeWidth, nodeHeight, sectionColors);

        const isMobile = window.innerWidth <= 768;

        if (isMobile && onLongPressCallback) {
            group.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.touchHandled = false;
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                this.longPressTimer = setTimeout(() => {
                    this.touchHandled = true;
                    onLongPressCallback(curso);
                    if (navigator.vibrate) navigator.vibrate(15);
                }, this.longPressThreshold);
            }, { passive: true });

            group.addEventListener('touchmove', (e) => {
                if (!this.touchStartPos || !this.longPressTimer) return;
                const dx = e.touches[0].clientX - this.touchStartPos.x;
                const dy = e.touches[0].clientY - this.touchStartPos.y;
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
            }, { passive: true });

            group.addEventListener('touchend', () => {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            });

            group.addEventListener('touchcancel', () => {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            });
        }

        group.addEventListener("click", (e) => {
            e.stopPropagation();

            if (this.touchHandled) {
                this.touchHandled = false;
                return;
            }

            const now = Date.now();
            const timeDiff = now - this.lastClickData.time;

            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }

            if (this.lastClickData.cursoId === curso.id && timeDiff < this.clickThreshold) {
                if (onDoubleClickCallback) {
                    onDoubleClickCallback(curso);
                }
                this.lastClickData = { cursoId: null, time: 0 };
            } else {
                this.lastClickData = { cursoId: curso.id, time: now };

                this.clickTimeout = setTimeout(() => {
                    if (onClickCallback) {
                        onClickCallback(curso);
                    }
                    this.clickTimeout = null;
                }, this.clickThreshold);
            }
        });

        if (curso.selected) {
            group.classList.add('node-selected');
        }

        if (selectedNode && !curso.selected && !curso.highlighted) {
            group.classList.add('node-dimmed');
        }

        group.appendChild(parts);

        this.dibujarTextos(group, curso, nodeWidth, nodeHeight, temaOscuro, sectionColors);

        if (showCriticalPath && curso.enRutaCritica && !curso.completado) {
            this.dibujarAdvertencia(group, curso, nodeWidth, nodeHeight);
        }

        graphGroup.appendChild(group);
        return group;
    }

    actualizarNodo(group, curso, showCriticalPath, temaOscuro, selectedNode) {
        const dims = getNodeDimensions();
        const nodeWidth = dims.width;
        const nodeHeight = dims.height;

        const colors = this.determinarColores(curso, showCriticalPath, temaOscuro);
        const sectionColors = this.getSectionColors(curso, colors, temaOscuro, nodeWidth, nodeHeight);

        this._actualizarRects(group, curso, nodeWidth, nodeHeight, sectionColors);
        this._actualizarTextos(group, curso, temaOscuro, sectionColors);

        group.classList.toggle('node-selected', !!curso.selected);
        const isDimmed = !!selectedNode && !curso.selected && !curso.highlighted;
        group.classList.toggle('node-dimmed', isDimmed);

        const showWarning = showCriticalPath && curso.enRutaCritica && !curso.completado;
        const warningEl = group.querySelector('[data-tipo="warning"]');
        if (showWarning && !warningEl) {
            this.dibujarAdvertencia(group, curso, nodeWidth, nodeHeight);
        } else if (!showWarning && warningEl) {
            warningEl.remove();
        }
    }

    _actualizarRects(group, curso, nodeWidth, nodeHeight, sectionColors) {
        const leftTop = group.querySelector('.left-top');
        if (leftTop) leftTop.setAttribute('fill', sectionColors.leftTop.fill);

        const leftBottom = group.querySelector('.left-bottom');
        if (leftBottom) leftBottom.setAttribute('fill', sectionColors.leftBottom.fill);

        const center = group.querySelector('.center');
        if (center) center.setAttribute('fill', sectionColors.center.fill);

        const right = group.querySelector('.right');
        if (right) right.setAttribute('fill', sectionColors.right.fill);
    }

    _actualizarTextos(group, curso, temaOscuro, sectionColors) {
        const codeText = group.querySelector('[data-tipo="codigo"]');
        if (codeText) {
            codeText.textContent = curso.codigo + (curso.completado ? " ✓" : "");
            codeText.setAttribute('fill', curso.completado ? (temaOscuro ? "#2ecc71" : "#1e8449") : sectionColors.text);
        }

        const creditsText = group.querySelector('[data-tipo="creditos"]');
        if (creditsText) {
            creditsText.setAttribute('fill', sectionColors.text);
        }

        group.querySelectorAll('[data-tipo="nombre"]').forEach(t => {
            t.setAttribute('fill', sectionColors.text);
        });

        group.querySelectorAll('[data-tipo="prereq"]').forEach(t => {
            t.setAttribute('fill', sectionColors.text);
        });
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

    getSectionColors(curso, colors, temaOscuro, nodeWidth, nodeHeight) {
        const defaultText = temaOscuro ? '#ecf0f1' : '#333';
        const s = curso.colors || {};
        const stroke = 'none';
        const strokeWidth = '0';

        const pensumColors = this.getPensumColors(curso);

        return {
            leftTop: {
                fill: (s.leftTop && s.leftTop.fill) || pensumColors.primary || '#fc904f',
                stroke, strokeWidth
            },
            leftBottom: {
                fill: (s.leftBottom && s.leftBottom.fill) || pensumColors.secondary || '#ffd0b6',
                stroke, strokeWidth
            },
            center: {
                fill: (s.center && s.center.fill) || pensumColors.secondary || '#ffd0b6',
                stroke, strokeWidth
            },
            right: {
                fill: (s.right && s.right.fill) || pensumColors.primary || '#fc904f',
                stroke, strokeWidth
            },
            text: (s.text && s.text.fill) || defaultText
        };
    }

    getPensumColors(curso) {
        return currentPensumColors;
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

        //console.debug(`[crearNodoCompuesto] Curso: ${curso.codigo}, sectionColors:`, sectionColors);

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


        const center = document.createElementNS(this.svgNS, "rect");
        center.setAttribute("x", centerX);
        center.setAttribute("y", curso.y);
        center.setAttribute("width", centerW);
        center.setAttribute("height", nodeHeight);
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

        const codeText = document.createElementNS(this.svgNS, "text");
        codeText.setAttribute("data-tipo", "codigo");
        codeText.setAttribute("x", leftX + lateralWidth / 2);
        codeText.setAttribute("y", curso.y + halfH / 2 + (isMobile ? 3 : 5));
        codeText.setAttribute("font-family", "Segoe UI, Arial");
        codeText.setAttribute("font-size", isMobile ? "8" : "10");
        codeText.setAttribute("text-anchor", "middle");
        codeText.setAttribute("font-weight", "bold");
        codeText.setAttribute("fill", curso.completado ? (temaOscuro ? "#2ecc71" : "#1e8449") : sectionColors.text);
        codeText.textContent = curso.codigo + (curso.completado ? " ✓" : "");
        group.appendChild(codeText);

        const creditsText = document.createElementNS(this.svgNS, "text");
        creditsText.setAttribute("data-tipo", "creditos");
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
            ln.setAttribute("data-tipo", "nombre");
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
                t.setAttribute("data-tipo", "prereq");
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
        warning.setAttribute("data-tipo", "warning");
        warning.setAttribute("x", centerX + centerW - (isMobile ? 12 : 16));
        warning.setAttribute("y", curso.y + (isMobile ? 12 : 16));
        warning.setAttribute("fill", "#e74c3c");
        warning.setAttribute("font-size", isMobile ? "12" : "16");
        warning.setAttribute("font-weight", "bold");
        warning.textContent = "⚠️";
        group.appendChild(warning);
    }
}