# Preflight y publicación controlada — borradores solamente

## Archivos leídos por el dry-run

Desde `back-hito3-audit`, `node .\BACK_HITO3_DRY_RUN.mjs` lee `BACK_HITO3_MANIFEST.json`, `BACK_HITO3_SUMMARY.json`, `BACK_HITO3_MATRIZ.md`, `BACK_HITO3_ISSUES.md`, `BACK_HITO3_CAMBIOS.md`, `BACK_HITO3_DEPENDENCIAS.md`, `BACK_HITO3_INT_ASAP_TRAZABILIDAD.md`, `BACK_HITO3_APROBACION_RESPONSABLES.md` y `BACK_HITO3_PUBLICATION_LEDGER.json`; importa `BACK_HITO3_VALIDATOR.mjs`. Solo valida coherencia local. No contacta GitHub ni escribe archivos.

El validador cruza manifiesto, SUMMARY, matriz, cuerpos, aprobaciones, ledger, dependencias, MK, contratos fijados por SHA y trazabilidad INT-ASAP. Para cada #20–#33 extrae IDs BACK de la misma fila Markdown que contiene el issue enlazado y exige igualdad exacta con el manifiesto. Comprueba 82 IDs únicos, inversas `blocks`, grafo y `publication_authorized=false`.

## Estado de autorización

La aprobación formal `APPROVAL-BACK-HITO3-OWNERS-20261016` autoriza registrar responsables y preparar documentos. **No autoriza publicar los 82 issues.** Se mantienen `publication_authorized=false`, `publication_started=false`, `authorized=false` y `records=[]`. Todos los registros siguen `BORRADOR_NO_PUBLICADO`.

## Gates antes de cualquier publicación futura

1. Obtener instrucción posterior y expresa de Marco que autorice publicar el lote y su alcance.
2. Repetir el preflight de repositorios oficiales, ramas, asignabilidad, issues abiertos/cerrados, duplicados, INT-ASAP, PR #10, INFRA #1/#8 y SHA/vigencia de contratos. Un resultado `NO_VERIFICADO` debe resolverse o mantenerse como gate sin inferir permiso.
3. Reconciliar cada `logical_id` contra todos los issues actuales, detectar duplicados semánticos y determinar si se crea, reutiliza o detiene cada elemento. No inferir número por título.
4. Revisar diffs y ejecutar de nuevo dry-run y pruebas negativas. Solo tras autorización específica futura, cambiar los flags requeridos y registrar el ledger antes de cada mutación.
5. Si se autoriza, crear/reutilizar issues con cuerpo exacto y asignación aprobada. Resolver dependencias a números reales solo entonces. No cerrar issues, fusionar PRs ni desplegar como parte de este gate.

## Límites

El dry-run y el preflight no modifican repositorios oficiales, no ejecutan `gh issue create/edit/close`, asignaciones, SQL, despliegues ni cambios de infraestructura. La coordinación de DEPLOY-BACK-02 no concede permiso para operar Oracle o transferir permisos. La autorización formal de responsables no constituye autorización de publicación.

El ledger `BACK_HITO3_PUBLICATION_LEDGER.json` debe permanecer con `authorized=false`, `publication_started=false` y `records=[]` hasta una autorización posterior y expresa.
