# 📊 Auditoría de Rendimiento - PEMTREE

## Resumen Ejecutivo

**Proyecto:** PEMTREE - Grafo de Estudios USAC  
**Fecha:** Junio 2026  
**Tecnología:** React + Vite + TailwindCSS

---

## 🔍 Análisis Realizado

### 1. **Estado Actual del Build**

Basado en el build realizado:
- **Bundle JS:** 413.39 KB (126.09 KB gzipped)
- **Bundle CSS:** 77.47 kB (14.84 kB gzipped)
- **HTML:** 1.87 kB (0.74 kB gzipped)
- **Tiempo de build:** 6.44s

### 2. **Puntos Críticos Identificados**

#### 🔴 ALTA PRIORIDAD

##### 2.1 Bundle JavaScript Grande (413 KB)
**Problema:** El bundle principal es demasiado grande para una aplicación web.
**Impacto:** 
- Tiempo de carga inicial lento en conexiones móviles
- Mayor consumo de datos para usuarios
- Penalización en Core Web Vitals

**Causas probables:**
- `Visualizer.jsx` (51KB) contiene demasiada lógica
- `ScheduleBuilder.jsx` (56KB) podría ser code-split
- Posible falta de tree-shaking efectivo
- Librerías como `html2canvas` se incluyen completas

**Recomendaciones:**
```javascript
// vite.config.js - Optimizaciones sugeridas
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'html2canvas'],
          'graph-module': ['./src/modules/graph/GraphManager'],
          'planner': ['./src/components/Planner'],
          'schedule': ['./src/components/ScheduleBuilder']
        }
      }
    },
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

##### 2.2 Imágenes Sin Optimizar
**Problema detectado:**
- `Guia_de_uso_dark.png`: 3.4 MB ⚠️
- `Guia_de_uso.png`: 467 KB
- `fondo.png`: 92 KB
- `logo_trebol.png`: 33 KB

**Recomendaciones:**
```bash
# Convertir a formatos modernos
# Usar WebP o AVIF con fallback
# Implementar lazy loading
```

**Acciones específicas:**
1. Comprimir `Guia_de_uso_dark.png` de 3.4MB → <500KB
2. Usar formato WebP con fallback PNG
3. Implementar `loading="lazy"` en todas las imágenes
4. Considerar SVG para el logo

##### 2.3 JSON de Horarios Muy Grande
**Problema:** `horarios.json` = 776 KB
**Impacto:** 
- Fetch inicial pesado si se carga completo
- Memoria del navegador elevada

**Solución:**
```javascript
// Dividir por períodos o carreras
// Implementar carga bajo demanda
// Usar IndexedDB para caché local

// Ejemplo de carga diferida
const loadHorariosByPeriod = async (periodId) => {
  const response = await fetch(`/json/horarios/${periodId}.json`);
  return response.json();
};
```

#### 🟡 MEDIA PRIORIDAD

##### 2.4 Falta de Configuración de Caché HTTP
**Archivo:** `netlify.toml`

**Recomendación:**
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/json/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-cache"
```

##### 2.5 Componentes Grandes sin Memoización
**Archivos afectados:**
- `Visualizer.jsx` (51KB, ~1200 líneas estimadas)
- `ScheduleBuilder.jsx` (56KB)
- `Planner.jsx` (24KB)

**Recomendaciones:**
```jsx
// Usar React.memo para componentes pesados
const CourseChip = React.memo(({ course, onClick }) => {
  // componente
});

// Usar useMemo para cálculos costosos
const filteredCourses = useMemo(() => {
  return cursos.filter(/* lógica */);
}, [dependencies]);

// Usar useCallback para funciones
const handleCourseSelect = useCallback((course) => {
  // lógica
}, [dependencies]);
```

##### 2.6 Múltiples useEffect Sin Limpieza
**Riesgo:** Memory leaks en navegación

**Verificar en:**
```jsx
// Visualizer.jsx línea 95-100
useEffect(() => {
  const handler = () => { /* ... */ };
  window.addEventListener('pemtree-schedule-period-changed', handler);
  window.addEventListener('storage', handler);
  
  // ❌ Faltan cleanups
  return () => {
    window.removeEventListener('pemtree-schedule-period-changed', handler);
    window.removeEventListener('storage', handler);
  };
}, []);
```

#### 🟢 BAJA PRIORIDAD

##### 2.7 Falta de Preload/Prefetch
**Recomendación en `index.html`:**
```html
<!-- Preload crítico -->
<link rel="preload" href="/assets/index.css" as="style" />
<link rel="modulepreload" href="/assets/index.js" />

<!-- Prefetch rutas secundarias -->
<link rel="prefetch" href="/json/index.json" />
```

##### 2.8 Ausencia de Service Worker
**Beneficios:**
- Caché offline
- Mejor performance en visitas repetidas
- Background sync

**Herramienta recomendada:** `vite-plugin-pwa`

---

## 📈 Métricas Estimadas (Lighthouse)

| Categoría | Score Estimado | Objetivo |
|-----------|---------------|----------|
| Performance | 65-75 | 90+ |
| Accessibility | 85-90 | 95+ |
| Best Practices | 80-85 | 95+ |
| SEO | 90-95 | 100 |

### Core Web Vitals Estimados

| Métrica | Valor Estimado | Límite Bueno |
|---------|---------------|--------------|
| LCP (Largest Contentful Paint) | 3.5-4.5s | <2.5s |
| FID (First Input Delay) | 150-250ms | <100ms |
| CLS (Cumulative Layout Shift) | 0.1-0.2 | <0.1 |
| TBT (Total Blocking Time) | 400-600ms | <200ms |

---

## 🛠️ Plan de Acción Priorizado

### Fase 1: Impacto Inmediato (1-2 días)

1. **Optimizar imágenes**
   ```bash
   # Instalar sharp para conversión
   npm install -D sharp
   
   # Script de optimización
   ```

2. **Implementar code splitting**
   - Configurar `manualChunks` en Vite
   - Lazy load para ScheduleBuilder y Planner

3. **Configurar headers de caché** en Netlify

### Fase 2: Optimización Media (3-5 días)

4. **Dividir horarios.json** por períodos/carreras
5. **Agregar memoización** en componentes pesados
6. **Implementar limpieza** en useEffects

### Fase 3: Mejoras Avanzadas (1-2 semanas)

7. **Service Worker** con vite-plugin-pwa
8. **Virtualización** de listas largas (react-window)
9. **Web Workers** para cálculos del grafo

---

## 🧪 Herramientas Recomendadas

### Para Medición
```bash
# Lighthouse CLI (requiere espacio en disco)
npm install -g lighthouse
lighthouse https://pemtree.netlify.app --view

# Alternativa online:
# https://pagespeed.web.dev/
# https://webpagetest.org/
```

### Para Análisis de Bundle
```bash
# Instalar plugin de análisis
npm install -D rollup-plugin-visualizer

# Agregar a vite.config.js
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ]
})
```

### Para Imágenes
```bash
# Compresión batch
npm install -D imagemin-cli
npx imagemin public/images/* --out-dir=public/images/optimized
```

---

## ✅ Checklist de Verificación

- [ ] Reducir bundle JS a <200KB (gzipped <100KB)
- [ ] Optimizar imágenes >100KB
- [ ] Implementar lazy loading de imágenes
- [ ] Configurar cache headers en Netlify
- [ ] Code split de componentes grandes
- [ ] Agregar React.memo donde aplique
- [ ] Limpiar event listeners en useEffect
- [ ] Implementar preload de recursos críticos
- [ ] Considerar Service Worker
- [ ] Dividir archivos JSON grandes

---

## 📝 Conclusión

La aplicación PEMTREE tiene una base sólida pero necesita optimizaciones significativas para mejorar el rendimiento, especialmente en:

1. **Reducción del bundle size** (prioridad máxima)
2. **Optimización de assets** (imágenes y JSON)
3. **Estrategias de caché** adecuadas

Con las mejoras propuestas, se estima una mejora del **40-60%** en métricas de performance y una mejor experiencia de usuario, especialmente en dispositivos móviles y conexiones lentas.

---

**Generado por:** Asistente de Auditoría de Rendimiento  
**Para más información:** Revisar documentación oficial de Vite, React y Web.dev
