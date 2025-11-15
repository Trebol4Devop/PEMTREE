class NodoCurso {
    constructor(id, codigo, nombre, creditos, obligatorio, prerequisitos = []) {
        this.id = id;
        this.codigo = codigo;
        this.nombre = nombre;
        this.creditos = creditos;
        this.obligatorio = obligatorio;
        this.prerequisitos = prerequisitos;
        this.posrequisitos = [];
        this.x = 0;
        this.y = 0;
        this.selected = false;
        this.nivel = 0;
        this.highlighted = false;
    }
}

const cursos = [
    new NodoCurso(1, "0005", "Técnicas de Estudio e Investigación", 3, true, []),
    new NodoCurso(2, "0017", "Área Social Humanística 1", 3, true, []),
    new NodoCurso(3, "0101", "Área Matemática Básica 1", 9, true, []),
    new NodoCurso(4, "0006", "Idioma Técnico 1", 3, false, []),
    new NodoCurso(5, "0039", "Deportes 1", 2, false, []),
    new NodoCurso(6, "0019", "Área Social Humanística 2", 3, true, [2]),
    new NodoCurso(7, "0103", "Área Matemática Básica 2", 9, true, [3]),
    new NodoCurso(8, "0147", "Física Básica", 5, true, [3]),
    new NodoCurso(9, "0960", "Matemática para Computación 1", 5, true, [3]),
    new NodoCurso(11, "0008", "Idioma Técnico 2", 3, false, [4]),
    new NodoCurso(12, "0040", "Deportes 2", 2, false, [5]),
    new NodoCurso(13, "0107", "Área Matemática Intermedia 1", 9, true, [7]),
    new NodoCurso(14, "0150", "Física", 5, true, [7,8]),
    new NodoCurso(15, "0770", "Introducción a la Programación y Computación 1", 6, true, [7, 8, 9]),
    new NodoCurso(16, "0795", "Lógica de Sistemas", 3, true, [7, 8, 9]),
    new NodoCurso(17, "0962", "Matemática para Computación 2", 5, true, [7, 8, 9]),
    new NodoCurso(18, "0001", "Ética Profesional", 2, false, [6]),
    new NodoCurso(19, "0009", "Idioma Técnico 3", 3, false, [11]),
    new NodoCurso(20, "0112", "Área Matemática Intermedia 2", 6, true, [13]),
    new NodoCurso(21, "0114", "Área Matemática Intermedia 3", 6, true, [13]),
    new NodoCurso(22, "0152", "Física 2", 6, true, [13, 14]),
    new NodoCurso(23, "0771", "Introducción a la Programación y Computación 2", 6, true, [9, 13, 15, 16]),
    new NodoCurso(24, "0796", "Lenguajes Formales y de Programación", 4, true, [9, 15, 16]),
    new NodoCurso(25, "2025", "Prácticas Iniciales", 0, true, [7, 15]),
    new NodoCurso(26, "0010", "Lógica", 1, false, [6]),
    new NodoCurso(27, "0011", "Idioma Técnico 4", 3, false, [19]),
    new NodoCurso(28, "0116", "Matemática Aplicada 3", 5, true, [20, 21]),
    new NodoCurso(29, "0118", "Matemática Aplicada 1", 5, true, [20, 21]),
    new NodoCurso(30, "0732", "Estadística 1", 5, true, [1, 13]),
    new NodoCurso(31, "0772", "Estructuras de Datos", 6, true, [17, 23, 24]),
    new NodoCurso(32, "0777", "Organización de Lenguajes y Compiladores 1", 6, true, [17, 23, 24]),
    new NodoCurso(33, "0964", "Organización Computacional", 4, true, [17, 22, 23]),
    new NodoCurso(34, "0018", "Filosofía de la Ciencia", 1, false, [6]),
    new NodoCurso(35, "0014", "Economía", 3, true, [30]),
    new NodoCurso(36, "0601", "Investigación de Operaciones 1", 6, true, [23, 30]),
    new NodoCurso(37, "0722", "Teoría de Sistemas 1", 4, true, [28, 29, 30, 31]),
    new NodoCurso(38, "0773", "Manejo e Implementación de Archivos", 5, true, [24, 31]),
    new NodoCurso(39, "0778", "Arquitectura de Computadores y Ensambladores 1", 5, true, [24, 33]),
    new NodoCurso(40, "0781", "Organización de Lenguajes y Compiladores 2", 6, true, [31, 32]),
    new NodoCurso(41, "0120", "Matemática Aplicada 2", 5, false, [29]),
    new NodoCurso(42, "0122", "Matemática Aplicada 4", 5, false, [29]),
    new NodoCurso(43, "0200", "Ingeniería Eléctrica 1", 6, false, [21,22]),
    new NodoCurso(44, "0281", "Sistemas Operativos 1", 6, true, [39, 40]),
    new NodoCurso(45, "0603", "Investigación de Operaciones 2", 6, true, [36]),
    new NodoCurso(46, "0724", "Teoría de Sistemas 2", 4, true, [36, 37]),
    new NodoCurso(47, "0774", "Sistemas de Bases de Datos 1", 6, true, [38]),
    new NodoCurso(48, "0779", "Arquitectura de Computadores y Ensambladores 2", 5, true, [39]),
    new NodoCurso(49, "0970", "Redes de Computadoras 1", 5, true, [38, 39]),
    new NodoCurso(50, "2036", "Prácticas Intermedias", 0, true, [25, 32, 38, 39]),
    new NodoCurso(51, "0734", "Estadística 2", 5, false, [30]),
    new NodoCurso(52, "0283", "Análisis y Diseño de Sistemas 1", 6, true, [47]),
    new NodoCurso(53, "0285", "Sistemas Operativos 2", 4, true, [44]),
    new NodoCurso(54, "0775", "Sistemas de Bases de Datos 2", 7, true, [44, 47]),
    new NodoCurso(55, "0797", "Seminario de Sistemas 1", 5, true, [44, 46, 47]),
    new NodoCurso(56, "0975", "Redes de Computadoras 2", 6, true, [49]),
    new NodoCurso(57, "0700", "Ingeniería Económica 1", 4, false, [30]),
    new NodoCurso(58, "0729", "Modelación y Simulación 1", 5, true, [45, 46]),
    new NodoCurso(59, "0785", "Análisis y Diseño de Sistemas 2", 7, true, [52]),
    new NodoCurso(60, "0786", "Sistemas Organizacionales y Gerenciales 1", 5, true, [37, 52]),
    new NodoCurso(61, "0798", "Seminario de Sistemas 2", 5, true, [53, 55]),
    new NodoCurso(62, "0972", "Inteligencia Artificial 1", 7, true, [40, 46, 47]),
    new NodoCurso(63, "2009", "Prácticas Finales Ingeniería Ciencias y Sistemas", 0, false, [50, 52, 53, 56]),
    new NodoCurso(64, "0776", "Bases de Datos Avanzadas", 5, true, [54]),
    new NodoCurso(65, "0788", "Sistemas Aplicados 1", 5, true, [52]),
    new NodoCurso(66, "0966", "Seguridad y Auditoría de Redes de Computadoras", 3, false, [56]),
    new NodoCurso(67, "0720", "Modelación y Simulación 2", 6, true, [58]),
    new NodoCurso(68, "0780", "Software Avanzado", 8, true, [59]),
    new NodoCurso(69, "0787", "Sistemas Organizacionales y Gerenciales 2", 6, true, [60]),
    new NodoCurso(70, "0799", "Seminario de Investigación", 3, true, [59, 60, 61]),
    new NodoCurso(71, "0735", "Auditoría de Proyectos de Software", 6, false, [59]),
    new NodoCurso(72, "0789", "Sistemas Aplicados 2", 5, false, [59,65]),
    new NodoCurso(73, "0790", "Emprendedores de Negocios Informáticos", 6, false, [60]),
    new NodoCurso(74, "0968", "Inteligencia Artificial 2", 5, false, [62]),
    new NodoCurso(75, "0974", "Redes de Nueva Generación", 3, false, [56]),
    new NodoCurso(76, "7999", "Seminario de Investigación E.P.S. Sistemas", 3, false, [59, 60, 61]),
];

let selectedNode = null;
let showOptional = true;
let currentLayout = 'horizontal';
let nodeWidth = 140;
let nodeHeight = 90;
let horizontalGap = 320;
let verticalGap = 20;
let scale = 1.0;

const cursoMap = new Map();
cursos.forEach(curso => cursoMap.set(curso.id, curso));

function calcularPosrequisitos() {
    cursos.forEach(curso => {
        curso.prerequisitos.forEach(prereqId => {
            const prereq = cursoMap.get(prereqId);
            if (prereq && !prereq.posrequisitos.includes(curso.id)) {
                prereq.posrequisitos.push(curso.id);
            }
        });
    });
}

calcularPosrequisitos();

function calcularNivelesTopologicos() {
    const indegree = new Map();
    const niveles = new Map();
    const queue = [];
    
    const cursosVisibles = cursos.filter(curso => showOptional || curso.obligatorio);
    
    cursosVisibles.forEach(curso => {
        const prerequisitosVisibles = curso.prerequisitos.filter(id => 
            cursosVisibles.some(c => c.id === id)
        );
        indegree.set(curso.id, prerequisitosVisibles.length);
    });
    
    cursosVisibles.forEach(curso => {
        if (indegree.get(curso.id) === 0) {
            queue.push({ curso, nivel: 0 });
        }
    });
    
    while (queue.length > 0) {
        const { curso, nivel } = queue.shift();
        
        if (!niveles.has(nivel)) {
            niveles.set(nivel, []);
        }
        niveles.get(nivel).push(curso.id);
        curso.nivel = nivel;
        
        curso.posrequisitos.forEach(posreqId => {
            const posreq = cursoMap.get(posreqId);
            if (!posreq || (!showOptional && !posreq.obligatorio)) return;
            
            indegree.set(posreqId, indegree.get(posreqId) - 1);
            if (indegree.get(posreqId) === 0) {
                queue.push({ curso: posreq, nivel: nivel + 1 });
            }
        });
    }
    
    return niveles;
}

function ordenarNodosEnNivel(nivel) {
    return nivel.sort((a, b) => {
        const cursoA = cursoMap.get(a);
        const cursoB = cursoMap.get(b);
        return cursoA.codigo.localeCompare(cursoB.codigo);
    });
}

function calcularLayoutHorizontal() {
    const nivelesMap = calcularNivelesTopologicos();
    const niveles = Array.from(nivelesMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, nodos]) => ordenarNodosEnNivel(nodos));
    
    const maxNodosEnNivel = Math.max(...niveles.map(nivel => nivel.length));
    const graphHeight = maxNodosEnNivel * (nodeHeight + verticalGap);
    
    niveles.forEach((nivel, levelIndex) => {
        const nodesInLevel = nivel.length;
        const levelHeight = nodesInLevel * (nodeHeight + verticalGap);
        const startY = 50 + (graphHeight - levelHeight) / 2;
        
        nivel.forEach((nodeId, nodeIndex) => {
            const curso = cursoMap.get(nodeId);
            curso.x = 50 + levelIndex * (nodeWidth + horizontalGap);
            curso.y = startY + nodeIndex * (nodeHeight + verticalGap);
        });
    });
}

function calcularLayoutVertical() {
    const nivelesMap = calcularNivelesTopologicos();
    const niveles = Array.from(nivelesMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, nodos]) => ordenarNodosEnNivel(nodos));
    
    const svg = document.getElementById('svg-graph');
    const svgRect = svg.getBoundingClientRect();
    
    niveles.forEach((nivel, levelIndex) => {
        const nodesInLevel = nivel.length;
        const levelWidth = nodesInLevel * (nodeWidth + 80);
        const startX = 50 + (svgRect.width - levelWidth) / 2;
        
        nivel.forEach((nodeId, nodeIndex) => {
            const curso = cursoMap.get(nodeId);
            curso.x = startX + nodeIndex * (nodeWidth + 80);
            curso.y = 50 + levelIndex * (nodeHeight + verticalGap);
        });
    });
}

function dividirTextoEnLineas(texto, maxChars) {
    const palabras = texto.split(' ');
    const lineas = [];
    let lineaActual = '';
    
    palabras.forEach(palabra => {
        if ((lineaActual + ' ' + palabra).length <= maxChars) {
            lineaActual += (lineaActual ? ' ' : '') + palabra;
        } else {
            if (lineaActual) lineas.push(lineaActual);
            lineaActual = palabra;
        }
    });
    
    if (lineaActual) lineas.push(lineaActual);
    
    if (lineas.length > 3) {
        return [lineas[0], lineas[1], lineas[2].substring(0, maxChars - 3) + '...'];
    }
    
    return lineas;
}

function encontrarRutaHastaCurso(cursoObjetivo) {
    const visitados = new Set();
    const ruta = new Set();
    
    function buscarPrerequisitos(curso) {
        if (visitados.has(curso.id)) return;
        visitados.add(curso.id);
        ruta.add(curso.id);
        
        curso.prerequisitos.forEach(prereqId => {
            const prereq = cursoMap.get(prereqId);
            if (prereq) {
                buscarPrerequisitos(prereq);
            }
        });
    }
    
    buscarPrerequisitos(cursoObjetivo);
    return ruta;
}

function limpiarResaltados() {
    cursos.forEach(curso => {
        curso.highlighted = false;
    });
}

function resaltarRuta(cursoObjetivo) {
    limpiarResaltados();
    const ruta = encontrarRutaHastaCurso(cursoObjetivo);
    
    ruta.forEach(cursoId => {
        const curso = cursoMap.get(cursoId);
        if (curso) {
            curso.highlighted = true;
        }
    });
}

function dibujarArista(graphGroup, fromNode, toNode) {
    const svgNS = "http://www.w3.org/2000/svg";
    const path = document.createElementNS(svgNS, "path");
    
    let fromX, fromY, toX, toY, d;

    const fromHighlighted = fromNode.highlighted || fromNode.selected;
    const toHighlighted = toNode.highlighted || toNode.selected;
    const aristaEnRuta = fromHighlighted && toHighlighted;

    if (currentLayout === 'vertical') {
        fromX = fromNode.x + nodeWidth / 2;
        fromY = fromNode.y + nodeHeight;
        toX = toNode.x + nodeWidth / 2;
        toY = toNode.y;
        
        const controlY1 = fromY + (toY - fromY) * 0.3;
        const controlY2 = fromY + (toY - fromY) * 0.7;
        d = `M ${fromX} ${fromY} C ${fromX} ${controlY1}, ${toX} ${controlY2}, ${toX} ${toY}`;
    } else {
        fromX = fromNode.x + nodeWidth;
        fromY = fromNode.y + nodeHeight / 2;
        toX = toNode.x;
        toY = toNode.y + nodeHeight / 2;
        
        const controlX1 = fromX + (toX - fromX) * 0.3;
        const controlX2 = fromX + (toX - fromX) * 0.7;
        d = `M ${fromX} ${fromY} C ${controlX1} ${fromY}, ${controlX2} ${toY}, ${toX} ${toY}`;
    }
    
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    
    if (selectedNode && aristaEnRuta) {
        path.setAttribute("stroke", "#666");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("marker-end", "url(#arrowhead)");
    } else {
        path.setAttribute("stroke", "transparent");
        path.setAttribute("stroke-width", "0");
        path.setAttribute("marker-end", "none");
    }
    
    graphGroup.appendChild(path);
}

function dibujarNodo(graphGroup, curso) {
    const svgNS = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(svgNS, "g");
    
    let fillColor, strokeColor, strokeWidth, textColor, tipoColor;
    
    if (curso.selected || curso.highlighted) {
        fillColor = curso.obligatorio ? "#ffd8b0" : "#e0f7fa";
        strokeColor = curso.selected ? "#ff0000" : (curso.obligatorio ? "#cc8a3a" : "#0097a7");
        strokeWidth = curso.selected ? "4" : "2";
        textColor = "#333";
        tipoColor = curso.obligatorio ? "#cc8a3a" : "#0097a7";
    } else {
        fillColor = "#f5f5f5";
        strokeColor = "#cccccc";
        strokeWidth = "1";
        textColor = "#999999";
        tipoColor = "#999999";
    }
    
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", curso.x);
    rect.setAttribute("y", curso.y);
    rect.setAttribute("width", nodeWidth);
    rect.setAttribute("height", nodeHeight);
    rect.setAttribute("rx", "6");
    rect.setAttribute("ry", "6");
    rect.setAttribute("fill", fillColor);
    rect.setAttribute("stroke", strokeColor);
    rect.setAttribute("stroke-width", strokeWidth);
    rect.setAttribute("cursor", "pointer");
    
    rect.addEventListener("click", (e) => {
        e.stopPropagation();
        seleccionarNodo(curso, graphGroup);
    });
    
    group.appendChild(rect);
    
    const textCodigo = document.createElementNS(svgNS, "text");
    textCodigo.setAttribute("x", curso.x + nodeWidth / 2);
    textCodigo.setAttribute("y", curso.y + 20);
    textCodigo.setAttribute("font-family", "Arial, sans-serif");
    textCodigo.setAttribute("font-size", "12");
    textCodigo.setAttribute("text-anchor", "middle");
    textCodigo.setAttribute("font-weight", "bold");
    textCodigo.setAttribute("fill", textColor);
    textCodigo.textContent = curso.codigo;
    group.appendChild(textCodigo);
    
    const nombreLines = dividirTextoEnLineas(curso.nombre, 15);
    nombreLines.forEach((line, index) => {
        const textLine = document.createElementNS(svgNS, "text");
        textLine.setAttribute("x", curso.x + nodeWidth / 2);
        textLine.setAttribute("y", curso.y + 40 + (index * 12));
        textLine.setAttribute("font-family", "Arial, sans-serif");
        textLine.setAttribute("font-size", "9");
        textLine.setAttribute("text-anchor", "middle");
        textLine.setAttribute("fill", textColor);
        textLine.textContent = line;
        group.appendChild(textLine);
    });
    
    const textTipo = document.createElementNS(svgNS, "text");
    textTipo.setAttribute("x", curso.x + nodeWidth / 2);
    textTipo.setAttribute("y", curso.y + nodeHeight - 20);
    textTipo.setAttribute("font-family", "Arial, sans-serif");
    textTipo.setAttribute("font-size", "8");
    textTipo.setAttribute("text-anchor", "middle");
    textTipo.setAttribute("fill", tipoColor);
    textTipo.setAttribute("font-style", "italic");
    textTipo.textContent = curso.obligatorio ? "Obligatorio" : "Optativo";
    group.appendChild(textTipo);
    
    const textCreditos = document.createElementNS(svgNS, "text");
    textCreditos.setAttribute("x", curso.x + nodeWidth / 2);
    textCreditos.setAttribute("y", curso.y + nodeHeight - 8);
    textCreditos.setAttribute("font-family", "Arial, sans-serif");
    textCreditos.setAttribute("font-size", "9");
    textCreditos.setAttribute("text-anchor", "middle");
    textCreditos.setAttribute("fill", textColor);
    textCreditos.textContent = `${curso.creditos} crédito${curso.creditos !== 1 ? 's' : ''}`;
    group.appendChild(textCreditos);
    
    graphGroup.appendChild(group);
}

function dibujarGrafo(graphGroup) {
    while (graphGroup.firstChild) {
        graphGroup.removeChild(graphGroup.firstChild);
    }
    
    if (currentLayout === 'vertical') {
        calcularLayoutVertical();
    } else {
        calcularLayoutHorizontal();
    }
    
    cursos.forEach(curso => {
        if (!showOptional && !curso.obligatorio) return;
        
        curso.posrequisitos.forEach(posreqId => {
            const posreq = cursoMap.get(posreqId);
            if (!posreq || (!showOptional && !posreq.obligatorio)) return;
            dibujarArista(graphGroup, curso, posreq);
        });
    });
    
    cursos.forEach(curso => {
        if (!showOptional && !curso.obligatorio) return;
        dibujarNodo(graphGroup, curso);
    });
}

function seleccionarNodo(curso, graphGroup) {
    if (selectedNode) {
        selectedNode.selected = false;
    }
    
    curso.selected = true;
    selectedNode = curso;
    
    resaltarRuta(curso);
    actualizarInfoNodo(curso);
    
    dibujarGrafo(graphGroup);
}

function actualizarInfoNodo(curso) {
    const nodeDetails = document.querySelector('.node-details');
    
    const prerequisitosNombres = curso.prerequisitos
        .map(id => {
            const prereq = cursoMap.get(id);
            return prereq ? `${prereq.codigo} - ${prereq.nombre}` : 'N/A';
        })
        .join(', ') || 'Ninguno';
        
    const posrequisitosNombres = curso.posrequisitos
        .map(id => {
            const posreq = cursoMap.get(id);
            return posreq ? `${posreq.codigo} - ${posreq.nombre}` : 'N/A';
        })
        .join(', ') || 'Ninguno';
    
    const rutaCursos = Array.from(encontrarRutaHastaCurso(curso))
        .map(id => {
            const cursoRuta = cursoMap.get(id);
            return cursoRuta ? `${cursoRuta.codigo} - ${cursoRuta.nombre}` : 'N/A';
        })
        .join(' → ');
    
    nodeDetails.innerHTML = `
        <p><strong>Código:</strong> ${curso.codigo}</p>
        <p><strong>Nombre:</strong> ${curso.nombre}</p>
        <p><strong>Créditos:</strong> ${curso.creditos}</p>
        <p><strong>Tipo:</strong> ${curso.obligatorio ? 'Obligatorio' : 'Optativo'}</p>
        <p><strong>Prerrequisitos:</strong> ${prerequisitosNombres}</p>
        <p><strong>Posrequisitos:</strong> ${posrequisitosNombres}</p>
        <p><strong>Ruta completa:</strong> ${rutaCursos}</p>
    `;
}

function crearFlecha(svg) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");
    
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
    polygon.setAttribute("fill", "#666");
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
}

function ajustarTamanioSVG(svg) {
    const nivelesMap = calcularNivelesTopologicos();
    const numNiveles = nivelesMap.size;
    const maxNodosEnNivel = Math.max(...Array.from(nivelesMap.values()).map(nivel => nivel.length));
    
    if (currentLayout === 'horizontal') {
        const width = 100 + numNiveles * (nodeWidth + horizontalGap);
        const height = 100 + maxNodosEnNivel * (nodeHeight + verticalGap);
        svg.setAttribute("width", `${width}px`);
        svg.setAttribute("height", `${height}px`);
    } else {
        const width = 100 + maxNodosEnNivel * (nodeWidth + 80);
        const height = 100 + numNiveles * (nodeHeight + verticalGap);
        svg.setAttribute("width", `${width}px`);
        svg.setAttribute("height", `${height}px`);
    }
}

function aplicarZoom() {
    const graphGroup = document.getElementById('graph-group');
    if (graphGroup) {
        graphGroup.setAttribute('transform', `scale(${scale})`);
    }
}

function inicializarGrafo() {
    const graphContainer = document.getElementById('graph');
    
    if (!graphContainer) {
        return;
    }
    
    graphContainer.innerHTML = '';
    
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("id", "svg-graph");
    graphContainer.appendChild(svg);
    
    const graphGroup = document.createElementNS(svgNS, "g");
    graphGroup.setAttribute("id", "graph-group");
    svg.appendChild(graphGroup);
    
    crearFlecha(svg);
    
    ajustarTamanioSVG(svg);
    
    dibujarGrafo(graphGroup);
    
    configurarControles(graphGroup);
}

function configurarControles(graphGroup) {
    document.getElementById('resetView').addEventListener('click', () => {
        if (selectedNode) {
            selectedNode.selected = false;
            selectedNode = null;
        }
        limpiarResaltados();
        document.querySelector('.node-details').innerHTML = 
            '<p><strong>Selecciona un curso para ver detalles</strong></p>';
        dibujarGrafo(graphGroup);
    });

    document.getElementById('toggleObligatory').addEventListener('click', () => {
        showOptional = !showOptional;
        if (selectedNode) {
            limpiarResaltados();
        }
        dibujarGrafo(graphGroup);
    });

    document.getElementById('layoutVertical').addEventListener('click', () => {
        currentLayout = 'vertical';
        if (selectedNode) {
            limpiarResaltados();
        }
        dibujarGrafo(graphGroup);
    });

    document.getElementById('layoutHorizontal').addEventListener('click', () => {
        currentLayout = 'horizontal';
        if (selectedNode) {
            limpiarResaltados();
        }
        dibujarGrafo(graphGroup);
    });

    document.getElementById('zoomIn').addEventListener('click', () => {
        scale = Math.min(scale * 1.2, 3.0);
        aplicarZoom();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        scale = Math.max(scale / 1.2, 0.3);
        aplicarZoom();
    });

    document.getElementById('zoomReset').addEventListener('click', () => {
        scale = 1.0;
        aplicarZoom();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    inicializarGrafo();
});