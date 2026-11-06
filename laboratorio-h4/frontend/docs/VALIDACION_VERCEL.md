# Validación de automatización Vercel — 2026-10-16

Base de Frontend: `origin/master@79f407dfeb7f11c958faa4de0b2f0ec4321ea28f`.
Rama: `codex/automatizar-vercel`. La revisión entregada se identifica mediante el
commit que contiene este informe y los checks del PR. No se modifica Docs ni Backend.

## Aprovisionamiento verificado

| Elemento | Resultado |
|---|---|
| Sesión CLI | PASS: Vercel CLI 64.3.1, `marecahu02-9205` |
| Equipo | `marecahu02-9205s-projects` / `team_Zkgo8VHqbwLeNfQC4pvTAAmp` |
| Proyecto | Creado y luego reutilizado: `g6-productos-ofertas` |
| Project ID | `prj_RkhYGt0vM0nKW9jMY8LVMnAxCa8W` |
| GitHub nativo | PASS: `Taller-SW-Web/G6-Productos-Ofertas-frontend` |
| Production Branch | PASS: `master` |
| Build settings | PASS: Vite, raíz null, Node 22.x, npm ci, npm run build, dist |
| Variable Production | PASS: `VITE_DATA_MODE=mock`, tipo plain; sin otras variables agregadas |
| Previews | PASS: `previewDeploymentsDisabled=true` |
| Bootstrap repetido | PASS: `--apply` posterior sin ajustes pendientes y `--inspect` sin cambios |
| Deployment / URL | No existe deployment; no hay URL de producción verificada |

La primera conexión fue rechazada por permisos. El usuario autorizó el acceso
de GitHub App y el siguiente `--apply` confirmó la vinculación por API. No se
usaron tokens en argumentos/logs, forks, mirrors ni despliegues manuales.
Panel del proyecto: [Vercel](https://vercel.com/marecahu02-9205s-projects/g6-productos-ofertas).

## Validación local

| Comprobación | Resultado |
|---|---|
| npm ci | PASS final con Node 22.23.3: 216 paquetes, auditoría sin vulnerabilidades |
| npm run typecheck | PASS |
| npm run lint | PASS final con Node 22.23.3, incluidos bootstrap y smoke |
| npm run build, mock | PASS, Vite 8.3.4 |
| npm test, ejecución completa | FAIL: 211 passed / 39 failed, ocho workers, 10 minutos; predominan timeouts de carga/acciones |
| npm test -- --last-failed --workers=2 --reporter=line | PASS: 39/39, 2.8 minutos, sin modificar casos ni timeouts |
| verify-production.mjs mock | PASS: 48 vistas, cero errores de arranque, 1440 px |
| vercel-smoke.mjs local | PASS aislado: cinco rutas, refresh de /productos, 37 recursos JS/CSS y cero errores de arranque |
| Build/verificación API | PASS: build API y 44 vistas sin fallback en el alcance del verificador; no acredita APIs reales ni cubre la excepción Bulk del README |
| Build sin VITE_DATA_MODE | PASS del control negativo: Vite rechaza la configuración ausente; dist restaurado a mock |
| vercel.json | PASS: validación contra esquema oficial con AJV (se omite el identificador de dialecto antiguo del esquema para compilar sus palabras clave actuales) |
| Reglas Git | PASS con minimatch: master=true; seis ramas de desarrollo y dos ramas con / = false |
| git diff --check y enlaces | PASS: diff revisado por archivo y enlaces relativos existentes |
| Verificador remoto previo al merge | BLOCKED esperado: no hay deployment asignado a Production; no emite PASS sin URL |

El entorno trae Node 24.3.0. Se obtuvo Node **22.23.3** sin modificar la instalación
global. Para garantizar Node 22 en Windows se invoca su `node.exe` con
`C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`; `npm.cmd` instalado
junto a Node 24 utiliza ese ejecutable aunque PATH incluya Node 22. El motor
versionado y el runtime remoto quedan fijados a major 22.

La reinstalación final inicialmente encontró un binding nativo ocupado por el
preview local (EPERM en Windows). Se cerró ese proceso y `npm ci` terminó
correctamente con Node 22; no se cambió la política de ejecución ni se elevaron permisos.

Durante el desarrollo se corrigió el smoke para aceptar revalidación HTTP 304.
Una ejecución simultánea a la suite detectó un recurso convertido en HTML:
`tests/bulk.spec.ts` reconstruye `dist/` durante la suite. Esa ejecución no se
cuenta como PASS; el smoke debe ejecutarse aislado tras reconstruir mock.
No se cambiaron pruebas funcionales, timeouts ni aserciones de negocio.

## Pendientes posteriores al merge

- **BLOCKED:** merge requiere autorización; no realizado.
- **NO EJECUTADO:** observar push del merge → deployment nativo y comprobar que
  las sincronizaciones de ramas no disparen previews.
- **NO EJECUTADO:** verificar SHA de `master`, rama, READY, target y aliases con
  `--inspect --verify-sha SHA_COMPLETO`.
- **NO EJECUTADO:** smoke sobre URL inmutable y alias de producción.
- **NO EJECUTADO:** rollback; solo procedimiento documentado.
- Protección de master: no existente al inspeccionar; propuesta documentada,
  sin modificar gobernanza. Se necesita aprobación del equipo para hacer
  obligatorio el check `validate` previo al merge.

No se declara OPERATIVO hasta verificar publicación y funcionamiento remoto.
