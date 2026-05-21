// modules/utils/TextUtils.js - Utilidades de texto

export class TextUtils {
    static dividirTextoEnLineas(texto, maxChars) {
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
        return lineas.slice(0, 3);
    }

    static normalizarTexto(texto) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }
}