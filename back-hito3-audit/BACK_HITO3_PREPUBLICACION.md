# Adenda de prepublicación y autorización — 2026-10-16

Esta adenda actualiza el gate descrito en el informe histórico. La autorización expresa de Marco Castilla para publicar los 82 issues BACK fue comunicada en esta conversación y se registró por separado en [BACK_HITO3_AUTORIZACION_PUBLICACION.md](BACK_HITO3_AUTORIZACION_PUBLICACION.md), identificador `APPROVAL-BACK-HITO3-PUBLISH-20261016`. No se atribuye URL, firma ni evidencia externa. La aprobación de responsables `APPROVAL-BACK-HITO3-OWNERS-20261016` conserva su alcance independiente.

## Preflight actualizado

- Fuente: `mrcastilla8/cuddly-octo-happiness`, `main`, SHA `716503d70b7b0d5c855d8879c91ee98a8dae2d85`.
- Identidad GitHub: `mrcastilla8` (Marco Castilla); Backend `Taller-SW-Web/G6-Productos-Ofertas-backend`, permiso `ADMIN`.
- Logins asignables verificados: `AXL031`, `GabrielPGu`, `LeonardoVera`, `MiguelTacoZavala`, `mrcastilla8`, `VicuzS`.
- Backend: 26 issues previos y 7 PRs; 0 títulos exactos duplicados y 0 marcadores BACK publicados. Las similitudes de título identificadas son alcance parcial intencional con INT-ASAP o DATA/INFRA con responsabilidades separadas; no se reutilizan como issues BACK.
- INT-ASAP #19–#33: abiertos y verificados en lectura; los rótulos abreviados de la matriz están contenidos en los títulos actuales.
- Contratos del repositorio Docs: OpenAPI SHA `f64bfe9a097b2a0f74c2600988305443d92f640e`; AsyncAPI SHA `a5552e51c651d1eabfcd6cbb9607abf8ab0573e9`; coinciden con el manifiesto.
- Estructura: 82 IDs únicos, 158 aristas previstas, 0 ciclos, 16 MK, 51 referencias BACK ↔ INT-ASAP.
- Reconciliación de cuerpos: 8 dependencias obligatorias ausentes y 8 issues con referencias condicionales ausentes en su sección humana; 42 menciones se sincronizaron en los cuerpos preservando el grafo. El validador ahora detecta divergencias obligatorias y condicionales y normaliza CRLF/LF.
- Dry-run local: PASS en modo draft después de la reconciliación y antes de registrar autorización; PASS en modo authorized después del preflight. Pruebas negativas: 10 PASS, incluyendo divergencias obligatorias y condicionales. El preflight remoto de `BACK_HITO3_PUBLISH.mjs --preflight-only` también pasa.
- Pizarrón: ledger autorizado con 0 registros; publicación aún no iniciada al crear esta adenda.

El snapshot detallado de issues/PRs preexistentes está en `BACK_HITO3_PUBLICATION_LEDGER.json` para comprobar que permanecen intactos durante la publicación.

---

# Informe de prepublicación — BACK Hito 3

## Identificación del corte

- SHA base: `2fd351eb453d231549c33e5bd41321d812330170`.
- SHA final del paquete: se publica con este informe; el SHA completo de `main` se entrega en la respuesta final (un commit Git no puede contener su propio SHA sin cambiarlo).
- Repositorio de publicación documental: `mrcastilla8/cuddly-octo-happiness`, rama `main`.
- Repositorios oficiales G6: solo consultados en modo lectura; no se publicaron issues ni se modificaron repositorios oficiales.
- Dictamen: **LISTO_PARA_AUTORIZACION_PUBLICACION**. La publicación permanece desautorizada; el dictamen solo certifica que el paquete está preparado para que Marco decida.

## Asignaciones aprobadas

Aprobación comunicada expresamente por Marco Castilla el 2026-10-16; registro: [BACK_HITO3_APROBACION_RESPONSABLES.md](BACK_HITO3_APROBACION_RESPONSABLES.md), identificador `APPROVAL-BACK-HITO3-OWNERS-20261016`. Autoriza registro de responsables y preparación documental. No autoriza publicación.

| ID lógico | Responsable | GitHub user | Rama | Repositorio de código conservado |
|---|---|---|---|---|
| SHARED-BACK-01 | Gabriel Poma | GabrielPGu | poma | Taller-SW-Web/G6-Productos-Ofertas-frontend |
| SHARED-BACK-03 | Gabriel Poma | GabrielPGu | poma | Taller-SW-Web/G6-Productos-Ofertas-frontend |
| DEPLOY-BACK-01 | Axel Cueva | AXL031 | cueva | Taller-SW-Web/G6-Productos-Ofertas-backend |
| DEPLOY-BACK-02 | Marco Castilla | mrcastilla8 | castilla | Taller-SW-Web/G6-Productos-Ofertas-backend |
| DATA-BACK-01 | Axel Cueva | AXL031 | cueva | Taller-SW-Web/G6-Productos-Ofertas-backend |
| SHARED-BACK-04 | Marco Castilla | mrcastilla8 | castilla | Taller-SW-Web/G6-Productos-Ofertas-frontend |
| SHARED-BACK-05 | Marco Castilla | mrcastilla8 | castilla | Taller-SW-Web/G6-Productos-Ofertas-backend |

Marco coordina la liberación de DEPLOY-BACK-02. Esa responsabilidad no autoriza operar Oracle ni transferir permisos de infraestructura. No cambió el ownership de los ocho microservicios ni del Gateway.

## Distribución de 82 borradores

| Responsable | Issues |
|---|---:|
| Marco Castilla | 21 |
| Gabriel Poma | 11 |
| Axel Cueva | 14 |
| Leonardo López | 9 |
| Leonardo Vera | 18 |
| Miguel Taco | 9 |
| OWNER_PENDIENTE | 0 |
| **Total** | **82** |

Los 82 permanecen como borradores no publicados. Se conservan los 16 MK, la matriz INT-ASAP ↔ BACK, 51 referencias cruzadas y 158 dependencias como líneas base. La aprobación no añadió bloqueos globales desde INT-ASAP.

## Validaciones

| Validación | Comando / evidencia | Resultado |
|---|---|---|
| Dry-run positivo | `node .\BACK_HITO3_DRY_RUN.mjs` desde `back-hito3-audit` | PASS — 82 records, 82 IDs únicos, 158 dependencias, 0 ciclos, 0 pendientes, 16 MK, 51 backlinks INT-ASAP, 0 publicables. Incluye 135 operationIds, 40 mensajes AsyncAPI y 11 eventos BFF. |
| Pruebas negativas anteriores y nuevas | `node .\BACK_HITO3_DRY_RUN_NEGATIVE_TESTS.mjs` | PASS — 8 casos negativos rechazados: 7 mutaciones del paquete y 1 referencia BACK movida entre filas INT-ASAP. El manifiesto real permaneció intacto. |
| Asignación formal aprobada | Prueba positiva integrada en `BACK_HITO3_DRY_RUN_NEGATIVE_TESTS.mjs` | PASS — los siete registros coinciden con la aprobación documental y el manifiesto deja 0 pendientes. |
| IDs, grafo, dependencias inversas y MK | Métricas y errores del dry-run | PASS — 82/82 IDs; grafo sin ciclos ni referencias rotas; `blocks` inversos coherentes; 16/16 MK; INT-ASAP #20–#33, con #19 EPIC revisado aparte. |
| Referencias INT-ASAP | Manifiesto y filas #20–#33 en `BACK_HITO3_INT_ASAP_TRAZABILIDAD.md`; #19 revisado aparte | PASS — validador verifica igualdad exacta ID por fila; GitHub reporta #19–#33 OPEN al corte. 51 referencias cruzadas BACK preservadas. |
| `git diff --check` | `git diff --check` | PASS — sin errores de whitespace. |
| Secretos y rutas personales | Escaneo del conjunto final completo de `back-hito3-audit`, incluido este informe y el registro de aprobación | PASS — 16 archivos, 0 hallazgos en claves privadas, formatos de tokens GitHub/AWS/Slack, URLs con credenciales, emails y rutas personales. Reejecutado contra el conjunto final. |
| Alcance del diff | `git status --short`, revisión del diff, comparación JSON base/actual y `git diff --check` | PASS — solo README y paquete documental del pizarrón; los siete objetivos, scope, dependencias, inversas y code_repository se conservan. Sin cambios oficiales, código de negocio, contratos, SQL o infraestructura. |

Los resultados acreditan consistencia documental reproducible; no acreditan ejecución del código de negocio, integración E2E, despliegue ni homologación externa.

## Preflight GitHub — solo lectura

Consultas ejecutadas con GitHub CLI; no se usaron comandos de escritura.

| Comprobación | Resultado observado |
|---|---|
| Repositorios Backend, Frontend y Docs | Existen y son accesibles; ramas por defecto `master`. |
| Ramas `castilla`, `poma`, `cueva`, `lopez`, `vera`, `taco` | Existen en Backend y Frontend, según los repositorios de código de los borradores. |
| Seis logins (Marco, Gabriel, Axel, López, Vera, Taco) | Existen como usuarios GitHub y aparecen en `/assignees` de Backend; por tanto GitHub los ofrece como asignables al repositorio. |
| Issues Backend abiertos y cerrados | `gh issue list --state all --limit 1000` devolvió 26 issues existentes. |
| Duplicados exactos de título | 0 coincidencias exactas entre títulos oficiales y los 82 borradores. No se encontraron colisiones pendientes en el corte. |
| INT-ASAP #19–#33 | Todos `OPEN` al momento de consulta; #19 es el EPIC. |
| Backend PR #10 Inventory | `OPEN`, `DRAFT`, HEAD `2c4a18105c5e379edc8476b9d315aa6be1134b80`. |
| Backend INFRA #1 y #8 | Ambos `OPEN`. INFRA #8 conserva su allowlist inicial Inventory; no es autorización de despliegue general. |
| OpenAPI / AsyncAPI | `contratos/http/openapi.yaml` SHA `f64bfe9a097b2a0f74c2600988305443d92f640e`; `contratos/eventos/asyncapi.yaml` SHA `a5552e51c651d1eabfcd6cbb9607abf8ab0573e9`. Los blobs en `master` coinciden con el snapshot. Son versiones RC candidatas, no evidencia de homologación externa. |

La asignabilidad fue verificable para los seis usuarios con la lista oficial del repositorio Backend; no queda `NO_VERIFICADO` por permisos en ese endpoint.

## Gate y riesgos restantes

**Gate pendiente:** instrucción posterior y expresa de Marco que autorice publicar los 82 borradores y especifique el lote. La aprobación `APPROVAL-BACK-HITO3-OWNERS-20261016` solo autoriza preparación documental. Deben permanecer `publication_authorized=false`, `publication_started=false`, `authorized=false` y `records=[]`.

- **Documentales:** preflight es un snapshot y debe repetirse al momento de cualquier futura publicación. El escaneo de secretos quedó registrado con el conteo del conjunto final.
- **Implementación:** no se ejecutó código de negocio ni pruebas runtime; los estados del manifiesto siguen siendo los estados auditados, no evidencia nueva de implementación.
- **Homologación:** los contratos RC y los issues INT-ASAP abiertos no acreditan aceptación externa; no se atribuye aprobación a otros grupos.
- **Despliegue:** Oracle, SQL, credenciales, infraestructura y publicación siguen fuera de esta autorización. INFRA #8 está abierto y el ownership de Marco en DEPLOY-BACK-02 es coordinación, sin permiso operativo.

**Dictamen final:** `LISTO_PARA_AUTORIZACION_PUBLICACION`. Requiere una instrucción posterior y expresa de Marco antes de cualquier publicación. No se ejecutaron mutaciones de GitHub en los repositorios oficiales.
