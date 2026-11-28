# PEMTREE

Plataforma web estudiantil independiente de código abierto para visualizar rutas académicas, planificar semestres, organizar horarios y conectar con la comunidad de la Facultad de Ingeniería de la Universidad de San Carlos de Guatemala (FIUSAC).

> [!NOTE]
> PEMTREE es un proyecto académico independiente sin afiliación oficial con la Universidad de San Carlos de Guatemala (USAC). Los datos académicos públicos se obtienen del portal de la FIUSAC únicamente con fines de referencia estudiantil.

---

## Características principales

- **Visualizador de Pensum Interactivo (`/visualizador`)**: Grafo SVG interactivo de cursos por semestre, con prerequisitos/posrequisitos, análisis de ruta crítica, seguimiento de progreso persistido por carrera en `localStorage` y soporte de modo claro/oscuro.
- **Planificador Académico**: Tablero drag-and-drop para proyectar semestres y escuelas de vacaciones, con validación automática de prerequisitos, límites de horas magistrales en vacaciones, avisos de apertura histórica y soporte para carreras simultáneas.
- **Constructor de Horarios**: Selección de secciones por periodo (`semestre1`, `semestre2`, `vacaciones1`, `vacaciones2`) con detección de traslapes, visualización de restricciones y reputación de secciones.
- **Recuento Académico (`/recuento`)**: Resumen consolidado de avance curricular, créditos, plan proyectado, horario activo y avisos locales.
- **Comunidad (`/foro`, `/grupos`, `/mis-publicaciones`, `/notificaciones`)**: Foro estudiantil, directorio de grupos de WhatsApp por curso/carrera, moderación comunitaria y notificaciones (in-app y Web Push) respaldadas por Supabase.
- **Pipeline de Catálogo Unificado**: Scripts en Node.js (`scraper-*.mjs`) que extraen pensums, horarios, restricciones y docentes para construir `public/json/catalogo.json` (schema v4).

---

## Stack tecnológico

- **Frontend**: React 19, Vite 8, Tailwind CSS 3, React Router 7, Lucide Icons, `react-helmet-async`.
- **Backend / Comunidad (opcional)**: Supabase (PostgreSQL, Auth / SSO, RLS, Edge Functions, Web Push).
- **Gestor de paquetes**: `pnpm` (v9+ recomendado; requerido en producción).
- **Calidad de código**: ESLint (con `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`).
- **Despliegue**: Netlify (`pemtree-react/netlify.toml`).

---

## Estructura del repositorio

```text
PEMTREE/
├── .github/                  # Gobernanza de PRs, ISSUE_TEMPLATE, CODEOWNERS y workflows
├── docs/                     # Documentación y recursos de referencia (paleta de carreras)
├── pemtree-react/            # Aplicación principal React + Vite + Tailwind
│   ├── public/
│   │   ├── images/           # Recursos estáticos e íconos
│   │   ├── json/             # Catálogo unificado (catalogo.json), pensums y snapshots de horarios
│   │   ├── pensum_color/     # Paletas de color por carrera
│   │   └── sw.js             # Service Worker para Web Push
│   ├── src/
│   │   ├── components/       # Componentes UI, Planificador, Constructor de Horarios y Onboarding
│   │   ├── context/          # Contextos globales (Notificaciones, Onboarding)
│   │   ├── hooks/            # Hooks personalizados
│   │   ├── lib/              # Integraciones (Supabase, SSO, moderación, push, notificaciones)
│   │   ├── modules/          # Lógica de dominio (grafo, catálogo, almacenamiento, utilidades)
│   │   ├── onboarding/       # Textos normativos, anuncios y tutoriales por pantalla
│   │   ├── pages/            # Páginas de ruta (Home, Visualizer, Recuento, Forum, etc.)
│   │   └── theme/            # Tokens de diseño y ThemeContext
│   ├── .env.example          # Plantilla de variables de entorno
│   ├── netlify.toml          # Configuración de build, cabeceras y redirecciones SPA
│   └── package.json
├── scraper-pensum.mjs        # Extrae archivos de pensum y metadata hacia public/json/
├── scraper.mjs               # Extrae snapshots de horarios por periodo
├── scraper-catalogo.mjs      # Construye public/json/catalogo.json (schema v4)
├── scraper-restricciones.mjs # Enriquece restricciones detalladas en catalogo.json
├── AGENTS.md                 # Guía técnica detallada de arquitectura y convenciones
├── CONTRIBUTING.md           # Guía de contribución y flujo de tareas definidas
├── RESPONSIVE_DESIGN_GUIDE.md# Lineamientos de diseño responsivo
├── SECURITY.md               # Registro de seguridad y riesgos aceptados (Supabase)
└── LICENSE                   # Licencia MIT
```

---

## Requisitos previos

- **Node.js**: `>= 20`
- **pnpm**: `>= 9`

---

## Instalación y desarrollo local

La aplicación web vive dentro de `pemtree-react/`. Las herramientas visuales (Visualizador, Planificador, Horarios, Recuento) funcionan **sin** configurar Supabase; las funciones de comunidad se degradan de forma segura cuando no hay credenciales.

```bash
cd pemtree-react
pnpm install
cp .env.example .env
pnpm dev
```

El servidor de desarrollo se inicia con Vite (`pnpm dev`). Para exponerlo en tu red local (por ejemplo, para pruebas en teléfono), ejecuta `pnpm dev -- --host`.

### Comandos disponibles (desde `pemtree-react/`)

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo Vite |
| `pnpm build` | Genera el bundle de producción en `dist/` |
| `pnpm preview` | Previsualiza localmente el build de producción |
| `pnpm lint` | Ejecuta ESLint sobre todo el proyecto |

---

## Variables de entorno

Archivo de ejemplo en [`pemtree-react/.env.example`](pemtree-react/.env.example):

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | Opcional | URL del proyecto Supabase para funciones de comunidad |
| `VITE_SUPABASE_ANON_KEY` | Opcional | Clave pública (`anon` / `publishable`) de Supabase |
| `VITE_COMMUNITY_AUTH_URL` | Opcional | URL base del proveedor SSO comunitario (Zanate) |
| `VITE_ADMIN_UID` | Opcional | UUID de administrador de respaldo en cliente (los roles oficiales se gestionan en `user_roles`) |
| `VITE_FORMSPREE_ENDPOINT` | Opcional | Endpoint de Formspree para alertas de reportes y moderación |
| `VITE_VAPID_PUBLIC_KEY` | Opcional | Clave pública VAPID para suscripciones Web Push |

> [!IMPORTANT]
> Nunca subas archivos `.env` reales ni claves privadas (`service_role`, clave privada VAPID) al repositorio.

---

## Pipeline de datos y scrapers

Los scripts de scraping se ejecutan desde la **raíz del repositorio** (no desde `pemtree-react/`):

```bash
# 1. Actualizar pensums y colores
node scraper-pensum.mjs

# 2. Capturar snapshots de horarios por periodo
node scraper.mjs

# 3. Generar/actualizar el catálogo unificado (schema v4)
node scraper-catalogo.mjs [--force]

# 4. Enriquecer texto detallado de restricciones (después de scraper-catalogo.mjs)
node scraper-restricciones.mjs
```

Consulta [`AGENTS.md`](AGENTS.md) para conocer el detalle del esquema v4 de `catalogo.json`, las reglas de depuración de docentes y el manejo de periodos sin datos.

---

## Despliegue

El proyecto está configurado para **Netlify** mediante [`pemtree-react/netlify.toml`](pemtree-react/netlify.toml):

- **Base directory**: `pemtree-react`
- **Build command**: `pnpm run build`
- **Publish directory**: `dist`
- **Node / pnpm**: Node `20`, pnpm `9`
- Incluye regla SPA (`/* -> /index.html` con estado `200`) y cabeceras `no-cache` para `/json/*`, `/pensum_color/*` y `/sw.js`.

---

## Contribuciones y gobernanza

Las contribuciones son bienvenidas. Antes de abrir un Pull Request, revisa [`CONTRIBUTING.md`](CONTRIBUTING.md): todos los PR hacia `main` o `develop` deben estar vinculados a un **Issue de tarea definida** válido.

---

## Seguridad

Consulta [`SECURITY.md`](SECURITY.md) para revisar las mitigaciones aplicadas en Supabase (RLS, funciones `SECURITY DEFINER`, triggers de moderación) y el registro de riesgos documentados. Si detectas una vulnerabilidad, evita reportarla en un Issue público y contacta al equipo mantenedor en `trebol4devop@proton.me`.

---

## Licencia

Distribuido bajo la licencia **MIT**. Consulta [`LICENSE`](LICENSE) para más información.
