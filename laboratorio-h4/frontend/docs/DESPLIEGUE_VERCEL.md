# Despliegue del frontend G6 en Vercel

Alcance operativo: **IMPLEMENTAR_AHORA** para hosting y lógica interna de bootstrap;
**BLOQUEADO_ESPECÍFICO** para conexión GitHub mientras falte autorización de la App,
y publicación de este cambio hasta merge autorizado. El estado de ejecución al
2026-10-16 está en [el registro](VALIDACION_VERCEL.md). No acredita APIs reales ni
homologación externa.

## Flujo y configuración

PR → `Frontend Foundation / validate` → revisión y merge autorizado a `master`
→ integración nativa GitHub/Vercel → build de Production. No existe otro workflow
que ejecute `vercel deploy`. La integración nativa empieza al recibir el push;
no espera a la CI de ese push. La garantía de CI previa requiere proteger el merge.

| Ajuste | Valor |
|---|---|
| Repositorio | `Taller-SW-Web/G6-Productos-Ofertas-frontend` |
| Proyecto propuesto | `g6-productos-ofertas` (reutilizar si ya está asociado) |
| Framework / raíz | Vite / raíz (`rootDirectory: null` en API) |
| Node | 22.x, mínimo 22.12; `.nvmrc` y `engines` evitan selección automática de una major superior |
| Instalación / build / salida | `npm ci` / `npm run build` / `dist` |
| Rama de Production | `master` |
| Variable Production | `VITE_DATA_MODE=mock` |
| Preview deployments | Deshabilitados también a nivel proyecto |

[`vercel.json`](../vercel.json) conserva `createBrowserRouter` mediante rewrite SPA
a `/index.html`; los archivos estáticos existentes se sirven antes del fallback.
`git.deploymentEnabled` usa `**: false` y `master: true`. Vercel habilita por defecto
las ramas sin coincidencia; si varias reglas coinciden, basta una `true`.
`**` cubre también nombres con `/`. Por eso los pushes de sincronización a
`castilla`, `poma`, `cueva`, `lopez`, `vera` y `taco` no despliegan una vez que esas
ramas contienen esta configuración. Además, el bootstrap fija
`previewDeploymentsDisabled: true` en el proyecto para cubrir ramas antiguas sin
`vercel.json`. No se modifica el workflow de sincronización.

## Bootstrap reproducible

Usar Node 22 >=22.12, npm y Git. La CLI se obtiene con npm exec sin incorporarla
como dependencia del frontend; no cambiar la política global de PowerShell.
En PowerShell puede usarse `npm.cmd` en lugar de `npm`.

```sh
npm exec --yes --package=vercel@64.3.1 -- vercel whoami
# Solo si falta sesión:
npm exec --yes --package=vercel@64.3.1 -- vercel login

npm exec --yes --package=vercel@64.3.1 -- node scripts/vercel-bootstrap.mjs --inspect
npm exec --yes --package=vercel@64.3.1 -- node scripts/vercel-bootstrap.mjs --apply
```

[`vercel-bootstrap.mjs`](../scripts/vercel-bootstrap.mjs) inspecciona todos los
equipos accesibles y pagina los proyectos antes de crear. Reutiliza la asociación
GitHub o el nombre existente; bloquea asociaciones ajenas, duplicados, enlaces
locales incompatibles y equipos ambiguos. En ese caso repetir con `--team slug`.
Detecta el ejecutable de la CLI en PATH; una instalación personalizada admite
`VERCEL_CLI_PATH` apuntando a `vercel/dist/index.js` (ruta, nunca token).

`--inspect` es solo lectura remota/local; no crea `.vercel/`, variables ni enlaces.
`--apply` crea el proyecto si falta, actualiza solo los ajustes previstos, conserva
una variable correcta y crea/actualiza únicamente Production. Si un registro
incorrecto comparte ámbitos, bloquea esa actualización para preservar sus valores.
Usa la sesión autenticada de la CLI y `vercel api`; no lee ni registra credenciales.
No despliega, hace commits, pushes o merges, desde ninguna rama. `.vercel/` se ignora.
Salida 0: configuración verificada; 2: pendientes; 1: error/prerrequisito/bloqueo.

Node se fija mediante PATCH porque el endpoint de creación no acepta `nodeVersion`.
Production Branch se verifica tras conectar: si no es `master`, ajustar en
Project → Settings → Environments → Production y repetir la inspección. La API
pública consultada no ofrece ese campo como escritura de proyecto; no se usa una
ruta privada inferida.

Si falla GitHub, autorizar [Vercel GitHub App](https://github.com/apps/vercel/installations/new)
para la organización **Taller-SW-Web**, seleccionando el repositorio oficial.
Un administrador de la organización puede tener que aprobar la instalación.
Comprobar también [GitHub en autenticación Vercel](https://vercel.com/account/settings/authentication).
Después repetir `--apply`; no crear forks ni otro proyecto. No compartir tokens.
Esta misma secuencia recupera una integración revocada.

## Protección propuesta (requiere autorización del equipo)

La inspección de GitHub del 2026-10-16 devolvió `404 Branch not protected` y ningún
ruleset; la cuenta tiene permiso admin, pero no se modificaron políticas.
El check real se llama **`validate`**, app `github-actions`, workflow
`Frontend Foundation`. Propuesta: exigir PR, aprobación y ese check antes del merge
a `master`, con rama actualizada. El owner debe acordar además las excepciones
administrativas. Hasta entonces la CI no es una barrera obligatoria de producción.
El fallo observado del workflow de sincronización es independiente del check
`validate` aprobado en la base `79f407d`; no se corrige dentro de esta tarea.

## Validación y publicación

```sh
npm ci
npm run typecheck
npm run lint
npm test
# Definir VITE_DATA_MODE=mock en el shell antes de compilar.
npm run build
node scripts/vercel-smoke.mjs http://127.0.0.1:5174
```

No ejecutar la suite y el smoke de producción simultáneamente: hay pruebas
existentes que reconstruyen `dist/`. Compilar mock después de la suite.
El smoke local requiere `npm run preview -- --port 5174 --strictPort` en otra
terminal y Chromium (`npx playwright install chromium`). La CI existente ejecuta
ese mismo smoke tras su verificación de producción mock, sin duplicar build ni
suite. Mantiene el build API y su verificación sin fallback existentes.

Tras merge autorizado, esperar el deployment nativo y obtener el SHA completo de
`master` (`git fetch origin` y `git rev-parse origin/master`). Verificarlo:

```sh
npm exec --yes --package=vercel@64.3.1 -- node scripts/vercel-bootstrap.mjs --inspect --verify-sha SHA_COMPLETO_DE_MASTER
node scripts/vercel-smoke.mjs https://ALIAS_REAL_DE_PRODUCCION
```

La verificación exige el deployment actualmente asignado a Production, SHA esperado,
rama `master`, `READY`, target `production` y aliases. Registra `source` como señal
informativa (OpenAPI lo describe como heurística de métricas, no autoritativa). Después ejecuta
el smoke tanto sobre su URL inmutable como sus aliases. Un deployment protegido
que requiere login falla explícitamente; no se desactiva protección automáticamente.
`READY` por sí solo no es evidencia suficiente. Confirmar en GitHub/Vercel que el
evento fue el push del merge, sin `vercel deploy` manual. Confirmar también que
las sincronizaciones posteriores no crearon deployments adicionales.

[`vercel-smoke.mjs`](../scripts/vercel-smoke.mjs) abre `/`, `/precios`, `/productos`,
`/categorias` y `/carga-masiva` directamente a 1440×900, verifica HTTP/HTML,
encabezados y tablas donde corresponden, refresca `/productos`, revisa JS/CSS y
MIME, y falla ante errores JavaScript, consola o recursos fallidos.
No modifica datos ni acredita APIs reales. La evidencia remota está pendiente
hasta que exista producción; ver [registro de validación](VALIDACION_VERCEL.md).

## Operación

Con CLI autenticada (usar el prefijo `npm exec --yes --package=vercel@64.3.1 --`):

```sh
vercel project inspect g6-productos-ofertas --scope marecahu02-9205s-projects
vercel ls g6-productos-ofertas --scope marecahu02-9205s-projects
vercel inspect URL_DEPLOYMENT --scope marecahu02-9205s-projects
vercel inspect URL_DEPLOYMENT --logs --scope marecahu02-9205s-projects
vercel logs URL_DEPLOYMENT --scope marecahu02-9205s-projects
```

`inspect --logs` consulta el build; `logs` consulta runtime, que puede no tener
entradas para esta SPA estática. En caso `ERROR`, leer el build log y verificar
Node, `npm ci`, typecheck y variable Production; corregir mediante PR y merge.

Rollback: identificar un deployment de producción anterior verificado y, con
autorización operativa, ejecutar `vercel rollback URL_ANTERIOR --scope TEAM`.
Después volver a comprobar aliases y smoke, y corregir/revertir el código por PR
para que el siguiente merge no reintroduzca el fallo. No se ejecutó rollback aquí.

Cambiar a `api` requiere providers HTTP implementados, contratos y permisos
verificados; **Bulk sigue usando mocks en la base actual incluso con `api`**, según
README. Tras la aprobación, actualizar Production con `vercel env update
VITE_DATA_MODE production --scope TEAM` y publicar una nueva revisión mediante
el flujo aprobado. Un cambio de variable no modifica un bundle ya publicado.
Todo `VITE_` es público; jamás colocar secretos en él. No agregar variables
ficticias de Backend, RabbitMQ, Supabase ni autenticación.

## Fuentes

- [Configuración Git y reglas coincidentes](https://vercel.com/docs/project-configuration/git-configuration).
- [Configuración Vite SPA](https://vercel.com/docs/frameworks/frontend/vite).
- [CLI autenticada para API](https://vercel.com/docs/cli/api).
- [OpenAPI oficial usado para métodos y campos](https://openapi.vercel.sh).
- [Actualizar proyecto](https://vercel.com/docs/rest-api/projects/update-an-existing-project).
- [Rollback](https://vercel.com/docs/cli/rollback), [inspect](https://vercel.com/docs/cli/inspect), [logs](https://vercel.com/docs/cli/logs).
- [README](../README.md), [AGENTS](../AGENTS.md), [.env.example](../.env.example), [CI](../.github/workflows/frontend.yml).

Se consultó Docs (solo lectura) en `cb7eec179f812d38929e20c5ab6f7a77139c4090`,
incluidos README, AGENTS y registro/matriz DEC-F. No se cambian reglas de negocio,
interfaces HTTP/eventos, UI, arquitectura ni persistencia; SPEC/HU/FLOW y ADR de
esas funcionalidades no requieren modificación para configurar este hosting.
