# Catálogo/SKU — #5, #6 y #35, Hito 4 fase 1

> Nueva revisión de auditoría posterior a `4cda065`: ver
> [CORRECCIONES_PR40.md](CORRECCIONES_PR40.md). Actualiza mapper nullable,
> aislamiento de demo, concurrencia, proxy y evidencia. Los resultados y SHA de
> este informe son históricos. #5/#6 siguen incompletos por lectura administrativa;
> el nuevo diagnóstico Gateway es real y fallido, no sustituye el E2E pendiente.

Fecha: 01/11/2026 (Lima). Rama exclusiva: `poma`. Estado: **PARCIAL**.
PR existente: [#40](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/40).
No se cierra ningún issue ni se hace merge a master.

## Base y fuentes comprobadas

- Frontend inicial: `ed5eaafe0603b0ba797fe9b61d6e888df547bb61`.
- Tras `git fetch origin`: poma coincide con origin/poma; contiene master
  `e171a20836042fcf95b526c668e0c4c2f6832d96`, 4 delante / 0 detrás.
  No correspondía realizar otro merge. El PR #40 estaba abierto y mergeable.
- Cambio local previo: selector accesible de detalle en `tests/catalog-issue35.spec.ts`.
  Se conserva el uso del nombre accesible completo y se adapta a las fixtures deportivas
  actuales de master; no se restauran las fixtures antiguas ni se migran sus IDs.
- Docs oficial, solo lectura: master
  `599c34f4e677c8792532e2cc31ac372473a10710`; OpenAPI `0.6.0-rc.1`, blob
  `17231f82f51c6696e09e233a5e827fcfd614701f`.
- Backend poma consultado: `83c474189b0b7278fdd06ce40d6abb581158c819`.
  Comparación con master `f2a5ff3fe2acd471cad70282db4b87b98b105817`:
  57 delante / 4 detrás. No se modifica ni sincroniza ese repositorio.
- Política leída: `ops/oracle/H4-MODO-DEMO-AUTH-REVERSIBLE.md` en backend master,
  blob `6b24c7abc8856480352b728871fa264114d55686`; issue backend #144 y frontend #45.
- Informe backend prioritario: `apps/catalog-svc/INTEGRACION-50.md`, blob
  `9db0812331b4a62542c2de4d19cfb7d9f912a8c9`; controllers de consulta/mutación.
- Fuentes locales: AGENTS.md, README.md, package.json, puertos/hooks/páginas de Catálogo,
  `docs/ISSUE_35_CATALOGO.md`, `docs/COORDINACION_TAXONOMIA_CATALOGO.md` y patrones
  existentes de transporte inyectable de Pricing.
- Docs: `requisitos/{specs,hu,flujos}/{SPEC,HU,FLOW}-003/004-*`, SPEC-009/010,
  `ux/wireframes/flows/WF-003-*` y `WF-004-*`, `ux/mockups/ux/{propuesta-ux,
  ux-decisions,ux-guidelines}.md`, `ux/mockups/DESIGN.md`,
  `ux/mockups/MK-003/{component-spec,plan,tasks}.md` y equivalentes MK-004.
  Árbol oficial: MK-003 S01–S07 y MK-004 S01–S06. `validation-report.md`:
  NO ENCONTRADO en ambos. No se releen ni copian todos los HTML: se reutilizan
  las pantallas existentes, como permite el encargo.
- Contratos: `contratos/http/{openapi.yaml,catalogo-errores.md,kit-integracion.md}`
  y `contratos/pruebas/pruebas-contrato.md`.
- Seguridad, solo lectura: `specs/kit-integracion.md`, SPEC-17,
  encabezado/convenciones de `specs/contrato-api/openapi.yaml` y
  `docs/integracion/matriz-scopes.md` del provider. No se implementa fase 2.

## Resultado por issue

| Issue | Implementado/verificable localmente | Pendientes y preparación para cierre |
| --- | --- | --- |
| #5 / MK-003 | Adapter HTTP de alta, edición, estados, preparación y reintento; DTO separados del modelo visual, perfil kg/cm anidado, errores tipados. Composición desde Gateway configurado. UI conserva entradas ante rechazo; distingue error/permisos de inexistencia. Preparación disponible independientemente del detalle. | Falta contrato de lectura administrativa para lista/detalle/edición de borradores, versión y perfil parcial. Persistencia y recorrido real por Gateway pendientes. No listo para cierre. |
| #6 / MK-004 | Adapter HTTP de lista/detalle, alta/edición, activar/desactivar/reactivar y retry. SKU explícito obligatorio también en TypeScript/formulario/mock, sin generación; conserva ceros/case y no lo convierte en barcode/variantId. Atributos usan IDs y valores separados; preparación procede del GET del producto. | Padre administrativo ausente bloquea abrir las páginas dependientes de él. Taxonomy no publica rol identificador ni límite TEXTO configurable. Perfil parcial de borrador no tiene lectura equivalente. Integración real y preparación externa pendientes. No listo para cierre. |
| #35 | Modos explícitos, sin fallback, transporte inyectable para #45, 401/403/409/5xx visibles. Se conservan regresiones de maestros/SKU y consumidores mock. Se corrigen referencias obsoletas a Oxford/TIP-CAMISA y una regresión de incorporación de nuevos targets de Pricing en sesión sin persistencia. | Validación integrada con owners/contratos, Gateway restringido y CI por SHA final. No equivale a despliegue/homologación ni autoriza cerrar #5/#6. |

CA de HU-003/004 relativas a coordinación de Pricing/Inventory, unicidad concurrente,
eventos, idempotencia persistida y activación definitiva pertenecen al backend.
Las pruebas locales del consumidor no acreditan esos efectos reales.
Se respetan las SPEC vigentes frente a notas históricas: un rechazo no habilita
retry por una edición genérica; solo se utiliza `manual_retry_allowed` del provider.

## Operaciones conectadas al transporte

Todas bajo `/api/v1`, a través del origen Gateway configurado. Esta tabla acredita
implementación del consumidor y pruebas con respuestas simuladas, **no ejecución real**.

| operationId | Método y ruta relativa | Límite |
| --- | --- | --- |
| listarProductos | GET /productos | Solo q/categoriaId/estado/pagina/tamanio usados por el puerto; tipo/modelo no publicados se bloquean. Una página no vacía no se convierte en lista administrativa sin estado/versión. Vacío contractual válido se conserva. |
| obtenerProducto | GET /productos/{productoId} | Proyección comercial insuficiente. No asumir ausencia administrativa a partir de un 404 comercial. |
| crearProducto | POST /productos | 201 y ProductoDetalle; consulta preparación independiente para construir la vista. |
| actualizarProducto | PATCH /productos/{productoId} | Mapea catalogVersion; no añade campos estructurales desde la UI ni fabrica historial publicado. |
| activarProducto | POST /productos/{productoId}/activar | Backend decide la transición. |
| desactivarProducto | POST /productos/{productoId}/desactivar | Baja lógica; sin mutaciones de Inventory/Pricing desde React. |
| reactivarProducto | POST /productos/{productoId}/reactivar | Sin reactivar hijos por inferencia. |
| obtenerPreparacionProducto | GET /productos/{productoId}/preparacion | Estado/código/manual_retry_allowed exactos; padre con variantes tiene inventario=null. |
| reintentarPreparacionProducto | POST /productos/{productoId}/preparacion/reintentar | 202/OperationAccepted confirma solo admisión; conserva operation_id recibido. |
| listarVariantesProducto | GET /productos/{productoId}/variantes | estado/pagina/tamanio; meta autoritativa, sin búsqueda local global ficticia. |
| obtenerVariante | GET /productos/{productoId}/variantes/{variantId} | IDs exactos, versión, atributos, imágenes, físico y preparación separada. |
| crearVariante | POST /productos/{productoId}/variantes | SKU obligatorio; no precio base ni saldo en el request. |
| actualizarVariante | PATCH /productos/{productoId}/variantes/{variantId} | Solo no identificadores, imagen, perfil y versión; no recodifica SKU. |
| activarVariante | POST /productos/{productoId}/variantes/{variantId}/activar | Resultado Variante; no inventa resultado del padre. |
| desactivarVariante | POST /productos/{productoId}/variantes/{variantId}/desactivar | No deduce última activa a partir de una página. |
| reactivarVariante | POST /productos/{productoId}/variantes/{variantId}/reactivar | No modifica el padre desde el consumidor. |
| reintentarPreparacionVariante | POST /productos/{productoId}/variantes/{variantId}/preparacion/reintentar | 202 no significa COMPLETED. |

El puerto existente tiene 17 operaciones. `obtenerProductoPorSlug`, contado como
la operación 18 en backend #50, pertenece a la lectura comercial y no se añade
como capacidad administrativa ficticia al puerto. Se conserva la demo de lectura.

Taxonomy de solo lectura: `listarCategorias`, `listarMarcas`, `listarTiposProducto`,
`obtenerEsquemaTipoProducto` y `obtenerCaracteristica`. Los tipos se recorren por
páginas verificadas; no se publican resultados truncados como catálogo completo.
Los tipos/unidades de atributos recibidos por Catálogo se consultan por ID mediante
`obtenerCaracteristica`; no se deducen del nombre ni del tipo del valor JavaScript.
El esquema para capturar variantes conserva los roles ausentes como desconocidos,
lo que bloquea su formulario de manera explícita.

## Transporte, escrituras y fase 2

- `VITE_DATA_MODE` continúa siendo el selector global. `VITE_GATEWAY_ORIGIN` existente
  selecciona el Gateway; no se crean flags de bypass/demo propios.
- URL válida: origen HTTPS o HTTP loopback, sin credenciales/ruta/query/hash.
  Configuración inválida produce error local de Catálogo; no cae al mock.
- `CatalogHttpTransport.request` es compatible estructuralmente con la frontera de
  transporte de Pricing. El cliente compartido #45 puede inyectarse en
  `createCatalogHttpServices` sin rehacer adapters ni reglas.
- Transporte mínimo de fase 1: fetch sin cookies, JWT, cabeceras de identidad ni
  redirects; timeout y cancelación; X-Correlation-Id. No login/refresh/logout nuevo.
- Problem.code gobierna la clasificación; no se ramifica por title/detail.
  Se preservan status/código/correlación y no se muestran secretos del servidor.
- No hay reintentos automáticos de escrituras. Error de red/respuesta ilegible o
  fallo de lectura posterior a un 2xx se informa como resultado no confirmable,
  conservando entradas y advirtiendo consultar antes de reenviar.
- Una escritura 2xx puede completarse y fallar luego al cargar características o
  preparación. No se presenta como rollback ni rechazo comercial. La reconciliación
  completa de un alta sin respuesta sigue limitada por las lecturas publicadas.
- Los nombres maestros ausentes en ProductoDetalle se muestran como sus IDs exactos;
  no se inventan etiquetas/mapeos ni se persiste un catálogo paralelo.
- Fase 2 pendiente de Marco/G7: cliente común con sesión real en memoria, inyección
  de Authorization y pruebas positivas/expiración/401/403 con JWT emitido por G7.
  No credenciales técnicas, Supabase ni RabbitMQ en React.

## Bloqueos específicos y owners

| Dependencia | Operación/impacto | Owner y condición de desbloqueo |
| --- | --- | --- |
| BLOCKED_CONTRACT: vista administrativa | Cargar/editar borradores, status/catalogVersion, historial publicado y perfil parcial; contexto de padre en MK-004. | Marco/arquitectura + contratos + Poma: aprobar y publicar operación/DTO de lectura administrativa. No inventar otra ruta. |
| BLOCKED_CONTRACT: roles/límites de Taxonomy | Captura de identificadores de variantes y TEXTO con límites configurados. | López: publicar metadatos y endpoints implementados, IDs/esquemas/versiones autoritativos. `obligatoria` no es rol. |
| Gateway dos GET variantes | Backend #50 registra 400 VALIDACION transformado a 503 por Gateway. | Marco: alinear tabla de rutas y comprobar 400 final. El consumidor conserva ambos resultados; no lo corrige ocultándolo. |
| Fase 1 sin JWT | Escrituras reales/actor/perímetro no acreditados. | Marco/infra + backend #51/#144/#111: entrada restringida, operaciones y contexto demo aprobados. Por instrucción del usuario se dejan pendientes las pruebas reales. |
| Preparaciones externas | Confirmaciones causales/replay/idempotencia y activación real. | Vera/Taco/Poma: resultados reales homologados; 202, health o fixtures no prueban finalización. |
| Fase 2 G7 | Autorización real y sesión. | Marco/G7: provisión efectiva y pruebas con JWT auténtico. No implementada en este cambio. |

Q-06: la SPEC actual resuelve la regla funcional, pero el GET comercial no acredita
`publicado_alguna_vez`, filas reales ni el perfil/versiones necesarios. Por eso la UI
mantiene la corrección de tipo bloqueada, aunque el mapper puede transportar la
propiedad opcional ya publicada si un consumidor autorizado aporta sus precondiciones.

## Archivos y razones

- `src/features/catalog/adapters/catalogHttp.ts`: frontera de transporte, origen y errores.
- `httpCatalogMapper.ts`: mapeos de atributos/físico/preparación sin defaults comerciales.
- `httpCatalogRepository.ts`: operaciones HTTP del puerto existente.
- `httpTaxonomyRepository.ts`: lecturas contractuales de maestros/esquema para Catálogo.
- `src/features/catalog/services/catalogHttpRuntime.ts`, `src/main.tsx`: composición mínima.
- `catalogRepository.ts`: SKU requerido y errores blocked_contract/write_unknown.
- `unavailableApiCatalogRepository.ts`: mensaje configurable de configuración inválida.
- `useVariantForm.ts`, `VariantFormFields.tsx`, `VariantCreatePage.tsx`,
  `mockCatalogRepository.ts`: SKU explícito sin generación; validación localizada.
- `useProductForm.ts`: conserva errores concretos de maestros/esquema.
- `CatalogReadError.tsx`, páginas ProductDetail/Edit/Preparation: errores visibles y
  preparación independiente; no transformar indisponibilidad en 404.
- `src/features/pricing/adapters/mockPricingRepository.ts`: los targets de Catálogo
  se incorporan al demo integrado también cuando no hay persistencia disponible.
  La factory aislada conserva sus targets originales; `catalogTargets` permite
  solicitar explícitamente la proyección integrada en pruebas en memoria.
  No se inventa precio en ese recorrido; el comportamiento persistente previo
  conserva su política independiente.
- `tests/catalog-http*.spec.ts`, harness catalog-http: pruebas de transporte y UI API
  con respuestas explícitamente simuladas; no se presenta un Gateway falso como real.
- Tests `variants`, `catalog-injection`, `transversal-integration`, `catalog-issue35`:
  SKU explícito, fixtures vigentes y regresiones de sesión/identidad.
- `tests/promotions-startup.spec.ts`: conserva los controles de arranque independiente;
  admite únicamente los GET contractuales de Catálogo cuando Gateway está configurado,
  con 503 simulado y sin JWT/G7 inventado ni llamadas externas.
- README, .env.example y este informe: configuración, alcance y evidencia honesta.

No se cambian tokens ni colores: los estados nuevos reutilizan componentes/tema
existentes. No se modifican repositorios Docs, Backend o Seguridad, ni la base de datos.

## Validación

Node 22.23.4, Windows, Chromium a 1440×900. Dependencias del lockfile sin cambios.

| Comprobación ejecutada | Resultado |
| --- | --- |
| `npm ci --no-audit --no-fund` con Node 22 | PASS, 255 paquetes |
| `npm test` | PASS, 370 pruebas: Combos 56, Bulk 51, Inventory 104+4, Pricing 155 |
| `npx playwright test tests/catalog-http.spec.ts tests/catalog-http-ui.spec.ts tests/catalog.spec.ts tests/variants.spec.ts tests/catalog-adapters.spec.ts tests/catalog-injection.spec.ts tests/catalog-regressions.spec.ts tests/catalog-final-review.spec.ts tests/catalog-issue35.spec.ts --workers=2 --output=test-results/catalog-final --reporter=line` | PASS, 78/78 |
| TypeScript / ESLint / builds mock y api | PASS; comprobación final con Node 22 y ambos `npm run build` |
| `npx playwright test tests/catalog-http.spec.ts tests/catalog-http-ui.spec.ts --workers=1 --output=test-results/catalog-http-final --reporter=line` | PASS, 23/23 después de los últimos ajustes |
| `node scripts/verify-production.mjs api` sobre preview loopback | PASS, 53 vistas, 1440 px, sin errores ni carga de mocks; proveedores reales ausentes |
| `node scripts/verify-production.mjs mock` sobre preview loopback | PASS, 58 vistas, 1440 px, incluyendo recorrido de edición y auditoría simulada |
| `npx playwright test tests/promotions-startup.spec.ts --workers=1 --output=test-results/catalog-startup-final --reporter=line` | PASS, 8/8 tras adaptar expectativas al nuevo provider de Catálogo |
| Suite completa Chromium, `npx playwright test --reporter=line` | 538 PASS, 8 FAIL, 6 SKIP; 26,6 min. No se declara PASS de esa corrida |
| Repetición aislada de los ocho fallos y regresiones relacionadas, un worker | PASS, 30/30 con las correcciones finales; log `.catalog-h4-recheck.log` |
| Visual desktop 1440 px | Inspección manual de las dos capturas y comprobación de overflow PASS; alcance limitado a esos estados y las capturas de las suites MK-003/004 |
| `git diff --check` | PASS |

Los comandos Node 22 se ejecutan mediante el runtime descargado en caché y los CLI
locales de TypeScript/ESLint/Playwright/npm; no se modifica el requisito de engines.
Logs locales ignorados: `.catalog-h4-unit.log`, `.catalog-h4-final.log`,
`.catalog-h4-full.log`, `.catalog-h4-build-{mock,api}.log`.

Capturas revisadas: [error HTTP y campos conservados](evidencias/catalogo-h4/error-http-1440.png)
y [preparación independiente](evidencias/catalogo-h4/preparacion-parcial-1440.png).
Son respuestas HTTP **simuladas** en el navegador, no un Gateway ni una BD reales.

La [CI del SHA inicial, run 41360556428](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/41360556428)
falló exclusivamente en siete pruebas de `catalog-issue35.spec.ts` del shard 1;
quick, smoke, modes y shards 2/3 pasaron. Se consultó el log del job
125009813986: fuentes obsoletas y targets de Pricing no incorporados. La corrida
focalizada final de 78 pruebas incluye sus correcciones y pasa. Eso no acredita
todavía CI del nuevo SHA ni el resultado agregado de la suite completa local.

La suite completa local registró estos ocho fallos:

1. Bulk esperaba el estado transitorio «En cola de procesamiento».
2. HTTP UI/403 encontró el arranque diferido aún cargando tras cinco segundos.
3. Inventory agotó el tiempo al seleccionar «Calzado».
4–5. Dos pruebas de arranque aún exigían cero lecturas aun configurando Gateway.
6. El recorrido transversal de alta/variante/recepción/F5 agotó su presupuesto total.
7. VER-02 detectó que el primer ajuste de Pricing también ampliaba la factory aislada.
8. El recorrido CSV por tres dominios agotó su presupuesto total de 30 segundos.

Bulk e Inventory no se modifican y pasan al repetir aisladamente. No se atribuye
su origen a una regresión de producto sin evidencia adicional. El harness espera
explícitamente a que cargue la página. Los dos recorridos transversales disponen
de 90 segundos totales, conservando todos los checks y plazos individuales.
La factory de Pricing diferencia integración de disponibilidad de localStorage
y mantiene el piloto aislado por defecto; VER-02 pasa sin relajar su aserción.
La repetición de los ocho casos más regresiones #35/arranque/Pricing pasa 30/30.
Comando: `npx playwright test tests/catalog-issue35.spec.ts tests/vera-integration.spec.ts
tests/promotions-startup.spec.ts tests/bulk.spec.ts tests/inventory.spec.ts
tests/transversal-integration.spec.ts tests/catalog-http-ui.spec.ts --grep
'POM-|VER-|arranque real|composición opcional|@smoke Bulk: selección|Los filtros de
categoría y marca|P0-01: Catálogo|La plantilla CSV descargable|UI API: 403'
--workers=1 --output=test-results/catalog-recheck-final --reporter=line`.
Las dos expectativas antiguas de arranque de Promotions exigían cero peticiones
incluso al navegar a Catálogo con Gateway válido. Se actualizan para probar GET
de Catálogo aislados, sin modificar el runtime de Promotions, guards ni endpoints.

Se repitió `npm test` después del ajuste final de aislamiento: nuevamente 370 PASS.
Ambos builds, TypeScript y lint de los archivos afectados se repitieron correctamente.
Las capturas de Taxonomy generadas por la suite completa se conservaron en
`test-results/transversal-generated`; las imágenes versionadas de ese módulo se
restauraron a su estado inicial, sin incluir cambios ajenos en esta entrega.

## Verificación de entrega

- [x] Fuentes normativas, versión de Docs, alcance y pantallas identificados.
- [x] Git inicial inspeccionado y cambio previo respetado.
- [x] React/TypeScript, lint, builds mock y API comprobados.
- [x] Pruebas del alcance y repeticiones ejecutadas; corrida completa no ocultada.
- [x] Estados loading/empty/error y guardado rechazado cubiertos en pruebas.
- [x] Dos capturas HTTP/UI inspeccionadas a 1440 px; sin overflow en esas vistas.
- [x] HTTP fuera de componentes visuales; sin HEX locales ni nuevos tokens.
- [x] Sin contratos, estados comerciales, roles/scopes o equivalencias de IDs inventados.
- [x] Docs/Backend/Seguridad y base de datos sin modificaciones.
- [x] Dependencias P0 y límites por operación registrados.
- [ ] Gateway/BD reales: NO EJECUTADO por instrucción del usuario.
- [ ] JWT real G7 y fase 2: NO EJECUTADO.
- [ ] Aprobación UX, homologación y despliegue: NO ACREDITADOS.

Pruebas reales navegador → Gateway → Catálogo → PostgreSQL: **NO EJECUTADAS**,
dejadas pendientes por instrucción expresa del usuario. Ninguna prueba simulada
acredita aislamiento Oracle, efectos PostgreSQL, AMQP ni homologación.

Primera corrida de 76 pruebas: 64 PASS / 12 FAIL. Detectó harness importando el router
antes de reemplazar la URL, fixtures antiguas en #35, targets de Pricing condicionados
a persistencia y un test de medida sin SKU. Se corrigen los problemas, sin eliminar
las comprobaciones de identidad/duplicados/conservación de datos.
La instalación inicial con Node 24 pasó, pero emitió EBADENGINE; se obtuvo Node
22.23.4 y se completó `npm ci --no-audit --no-fund` con él. Un intento intermedio de
reinstalar con Vite aún activo falló con EPERM; se detuvo la sesión de pruebas propia
y se repitió la instalación correctamente. No cambia package-lock.json.

## Estado de cierre

**PARCIAL / adaptadores HTTP implementados, validación real pendiente.** No se declara
API_INTEGRATED/VALIDATED de extremo a extremo, despliegue, aprobación UX ni cierre de issues.

Código publicado inicialmente en `d4a5769b09a4f7acbbc814b2dda838fb789eb7dd` mediante
push normal a poma. La revisión posterior conserva la factory aislada de Pricing,
ajusta las pruebas de arranque y los presupuestos totales de dos recorridos largos.
Los previews finales vuelven a pasar (API 53 / mock 58 vistas). Resumen reproducible:
[validacion.txt](evidencias/catalogo-h4/validacion.txt). La CI se consulta por el SHA
final publicado; no se atribuye a este candidato la CI de un SHA anterior.
El usuario autorizó expresamente actualizar únicamente título/descripción del PR #40;
se conserva abierto y dirigido a master. No se envían comentarios ni se cierran issues.
