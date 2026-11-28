# Guía de Contribución — PEMTREE

¡Gracias por tu interés en contribuir a **PEMTREE**! Para mantener la calidad del código y la trazabilidad de cada cambio, el repositorio sigue un flujo de **tareas definidas**.

---

## Flujo de trabajo obligatorio

El workflow [`.github/workflows/control_pr.yml`](.github/workflows/control_pr.yml) valida automáticamente todos los Pull Requests dirigidos a `main` o `develop`.

### 1. Crea o toma un Issue de "Tarea definida"

Antes de empezar a programar, asegúrate de que exista un Issue abierto usando la plantilla [`.github/ISSUE_TEMPLATE/tarea_definida.yml`](.github/ISSUE_TEMPLATE/tarea_definida.yml) con todas sus secciones completas:

- **Objetivo del cambio**: Qué se busca lograr de forma concreta.
- **Criterios de aceptación (checklist)**: Lista verificable con formato `- [ ] Criterio`.
- **Archivos o módulos permitidos a modificar**: Alcance explícito del cambio.
- **Rama base destino**: `main` o `develop`.

### 2. Crea tu rama desde la rama base

```bash
git checkout develop
git pull origin develop
git checkout -b feat/mi-cambio
```

### 3. Desarrolla y verifica localmente

Antes de confirmar tus cambios, ejecuta las validaciones desde `pemtree-react/`:

```bash
cd pemtree-react
pnpm install
pnpm lint
pnpm build
```

Asegúrate de que:
- `pnpm lint` termine sin errores.
- `pnpm build` genere el paquete de producción sin fallos.
- Solo modificaste los archivos o módulos definidos en el alcance del Issue.
- No incluiste secretos, credenciales, correos personales ni archivos temporales (`.env`, `.vite/`, backups `.sql`).

### 4. Abre tu Pull Request

Usa la plantilla [`.github/pull_request_template.md`](.github/pull_request_template.md):

1. Vincula el Issue en el título o descripción con `Closes #<numero>`.
2. Marca la lista de verificación.
3. Describe los comandos y pruebas ejecutadas junto con sus resultados.

---

## Convenciones técnicas

- **Lenguaje**: JavaScript (`.js` / `.jsx`), React 19, Tailwind CSS.
- **Estilos y tema**: Usa `useTheme()` (`src/theme/ThemeContext.jsx`) y los tokens en `src/theme/tokens.js` para mantener compatibilidad con modo claro y oscuro.
- **Diseño responsivo**: Consulta [`RESPONSIVE_DESIGN_GUIDE.md`](RESPONSIVE_DESIGN_GUIDE.md).
- **Arquitectura y módulos**: Consulta [`AGENTS.md`](AGENTS.md) antes de modificar `src/modules/` o el esquema de `catalogo.json`.
