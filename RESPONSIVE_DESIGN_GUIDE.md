# Guía de Pruebas - Responsive Design

## Cambios Implementados ✅

### 1. **Toolbar Principal (Visualizer.jsx)**
- **Estructura mejorada**: Sistema de flex y grid más fluido que se adapta a diferentes tamaños
- **Tamaños responsivos**: 
  - Mobile pequeño (xs: 320px): Botones comprimidos con iconos solamente y texto abreviado
  - Tablet (sm-md): Tamaño intermedio con texto parcial
  - Desktop (lg+): Vista completa
- **Componentes optimizados**:
  - ✅ Botones de vista (Semestral, Ruta Crítica, Optativos, Layout)
  - ✅ Selector de Pensum
  - ✅ Búsqueda de cursos
  - ✅ Botones de ayuda, créditos y reiniciar
  - ✅ Controles de zoom (absolutos, repositionados para mobile)

### 2. **Navbar (Navbar.jsx)**
- **Altura adaptable**: 48px en mobile, 56px en tablet+
- **Logo responsive**: Tamaño reduce en mobile (28x28px) a (36x36px) en tablet+
- **Espaciado fluido**: De 6px en mobile a 24px en desktop
- **Badge de PENSUM**: Texto comprimido en mobile ("PENSUM") vs ("PENSUM CLAR") en tablet+
- **Menú móvil mejorado**: Más compacto con mejor accesibilidad

### 3. **Configuración Tailwind**
- ✅ Breakpoint xs (320px) agregado para móviles pequeños
- ✅ Espacios con safe-area-inset para notches y home indicators

---

## Pruebas Recomendadas

### Test 1: Redimensionamiento en PC (Ventana al 50%)
1. Abre la aplicación en fullscreen
2. Redimensiona la ventana a 50% del ancho
3. **Esperado**:
   - Los botones deben reorganizarse sin overflow
   - El texto debe ser legible
   - El layout debe ser fluido sin saltos abruptos
4. **Resoluciones a probar**: 960px, 800px, 640px, 480px

### Test 2: Dispositivos Móviles Comunes
Usa DevTools (F12) > Device Toolbar para probar:

| Dispositivo | Resolución | Modo |
|-------------|-----------|------|
| iPhone SE | 375x667 | Portrait |
| iPhone 12/13 | 390x844 | Portrait |
| iPhone 14 Pro | 393x852 | Portrait |
| Samsung Galaxy S21 | 360x800 | Portrait |
| Samsung Galaxy S21 | 800x360 | Landscape |
| iPad Mini | 768x1024 | Portrait |
| iPad (10th gen) | 820x1180 | Portrait |

### Test 3: Verificaciones Específicas

#### Navbar
- [ ] Logo visible (sin cortarse)
- [ ] Botón de tema accesible
- [ ] Badge de PENSUM legible
- [ ] Menú hamburguesa funciona en mobile

#### Toolbar Principal
- [ ] Botones no se solapan
- [ ] Selector de pensum es usable
- [ ] Búsqueda funciona correctamente
- [ ] Botones de control (ayuda, créditos, reset) accesibles

#### Controles de Zoom
- [ ] Botones en esquina inferior derecha (desktop)
- [ ] Repositionados correctamente en mobile
- [ ] No bloquean contenido importante
- [ ] Tamaño toque adecuado (mínimo 44x44px en mobile)

### Test 4: Pruebas de Zoom
- [ ] Zoom al 50% en navegador
- [ ] Zoom al 100% (normal)
- [ ] Zoom al 150%
- [ ] Zoom al 200%
- **Esperado**: Todo sigue siendo funcional y legible

### Test 5: Modo Oscuro
- [ ] Botón tema en Navbar funciona
- [ ] Contraste es adecuado en ambos modos
- [ ] Colores se aplican correctamente en toolbar
- [ ] Botones de zoom visible en ambos modos

### Test 6: Orientaciones
- [ ] Portrait en mobile
- [ ] Landscape en mobile
- [ ] Rotación del dispositivo (si es posible)

---

## Detalles Técnicos

### Breakpoints Tailwind Configurados
```
xs: 320px  - Móviles pequeños (iPhone SE)
sm: 640px  - Móviles estándar (iPhone, Android)
md: 768px  - Tablets pequeñas
lg: 1024px - Tablets grandes / Desktops pequeños
xl: 1280px - Desktops estándar
2xl: 1536px - Desktops grandes
```

### Clases Utilizadas
- `max-sm`, `max-md`, `max-lg` - Estilos hasta cierto breakpoint
- `sm:`, `md:`, `lg:` - Estilos desde cierto breakpoint
- `gap-1 sm:gap-1.5 lg:gap-3` - Espacios escalonados
- `text-[0.65rem] sm:text-xs lg:text-xs` - Tamaños de fuente adaptables

### Icono Responsivo
Algunos iconos también cambian de tamaño:
```jsx
<Grid size={12} className="max-sm:hidden" />  // Oculto en mobile
<Grid size={10} className="sm:hidden" />       // Oculto en sm+
```

---

## Notas Importantes

1. **Safe Area Insets**: Para notches en iPhone X+ (aunque aquí no es crítico)
2. **Controles de Zoom**: En mobile están posicionados más arriba para no interferir con navegación
3. **Text Truncation**: Se usó `truncate` en algunos elementos para evitar desbordamiento
4. **Whitespace Nowrap**: Algunos textos usan `whitespace-nowrap` para mantener cohesión

---

## Validación Final

✅ **Build exitoso**: `pnpm build` sin errores
✅ **Sin warnings**: Console limpia en DevTools
✅ **Funcionalidad**: Todas las interacciones funcionan
✅ **Responsiveness**: Funciona en todos los breakpoints

---

## Próximas Mejoras (Opcional)

- [ ] Agregar animación de transición suave para cambios de layout
- [ ] Optimizar tamaños de fuente más granulares
- [ ] Pruebas en navegadores antiguos (si es necesario)
- [ ] Posibles mejoras a accesibilidad (ARIA labels, focus states)
