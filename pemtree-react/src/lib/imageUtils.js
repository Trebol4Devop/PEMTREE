import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Procesa y comprime una imagen seleccionada por el usuario utilizando un Canvas de HTML5.
 * Devuelve un Data URL (Base64) compacto.
 */
export const processAndCompressImage = (file, maxDimension = 800, quality = 0.75) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('El archivo seleccionado no es una imagen válida.'));
        }

        if (file.size > 15 * 1024 * 1024) {
            return reject(new Error('La imagen es demasiado grande. Por favor selecciona una imagen menor a 15 MB.'));
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    });
};

/**
 * Convierte un Data URL a Blob para poder subirlo a un bucket de Supabase Storage o S3.
 */
const dataURLToBlob = (dataUrl) => {
    const parts = dataUrl.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
};

/**
 * Intenta subir la imagen procesada al bucket de Supabase Storage (ej. 'images', 'public' o 'media').
 * Si el bucket está configurado y accesible, devuelve la URL pública del objeto.
 * Si no está configurado o falla, devuelve la cadena Data URL comprimida para almacenarse en la base de datos de forma segura.
 */
export const uploadOrCompressImage = async (file, folder = 'comunidad') => {
    const compressedDataUrl = await processAndCompressImage(file, 900, 0.8);

    if (isSupabaseConfigured && supabase) {
        try {
            const blob = dataURLToBlob(compressedDataUrl);
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

            // 1. Intentar obtener la lista de buckets creados en el proyecto de Supabase
            let bucketsToTry = ['images', 'public', 'media', 'pemtree', 'storage', 's3'];
            try {
                const { data: bucketList } = await supabase.storage.listBuckets();
                if (bucketList && Array.isArray(bucketList) && bucketList.length > 0) {
                    const existingNames = bucketList.map(b => b.name);
                    bucketsToTry = Array.from(new Set([...existingNames, ...bucketsToTry]));
                }
            } catch {
                // Si listBuckets requiere permisos de admin, usar la lista por defecto
            }

            // 2. Probar subir a cada bucket disponible en el proyecto
            for (const bucket of bucketsToTry) {
                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, blob, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: 'image/jpeg'
                    });

                if (!uploadError) {
                    const { data: publicUrlData } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(fileName);
                    if (publicUrlData && publicUrlData.publicUrl) {
                        console.log(`[Supabase Storage] Imagen subida exitosamente al bucket "${bucket}":`, publicUrlData.publicUrl);
                        return publicUrlData.publicUrl;
                    }
                } else {
                    console.warn(`[Supabase Storage] Intento en bucket "${bucket}" no completado:`, uploadError.message || uploadError);
                }
            }
        } catch (err) {
            console.warn('Fallo general al intentar subir a Supabase Storage, usando Data URL comprimido como alternativa:', err);
        }
    }

    console.info('Utilizando Data URL comprimido como alternativa de almacenamiento local.');
    // Retorno alternativo (Fallback robusto): Data URL Base64
    return compressedDataUrl;
};
