# Procedimiento de publicación — preparado, no ejecutado

## Validación local de solo lectura

Desde esta carpeta, ejecutar:

    node .\BACK_HITO3_DRY_RUN.mjs

El script lee solo BACK_HITO3_MANIFEST.json. No usa red, GitHub CLI, Supabase ni credenciales; no escribe archivos. Valida IDs, owners/ramas, secciones, estado de publicación, dependencias forward/inverse, ciclos, referencias externas, cobertura MK y publishable=false. PASS es solo consistencia del paquete, no homologación ni implementación.

## Gates posteriores

1. Autorización explícita de Marco antes de crear issues; publicación continúa desautorizada en esta versión.
2. Reconsultar títulos abiertos/cerrados, issues/PRs, refs/branches, asignabilidad y contratos. Validar P0/P1 por operationId; volver a ejecutar el dry-run después de cualquier cambio.
3. Resolver OWNER_PENDIENTE formalmente; confirmar lote y alcance. Candidatos no son asignaciones.
4. Identificar por logical_id y reconciliar título/URL antes de cada alta. Múltiples coincidencias detienen ese elemento. Nunca inferir número desde un título.
5. Crear solo issues aprobados con body exacto; registrar number, URL, título, repo, timestamp, assignee y decisión en BACK_HITO3_PUBLICATION_LEDGER.json. El ledger sigue vacío/no autorizado.
6. Tras mapear los IDs lógicos a números reales, resolver links nativos solo con autorización expresa; validar grafo otra vez. No cerrar issues existentes.

## Política de PR y dependencias

Un PR por issue en code_repository. BACK-08 mantiene issue central Backend y PR en Frontend. No enviar un PR que edite dos repositorios. Una dependencia se libera tras aceptación, pruebas, evidencia, PR fusionado e issue cerrado. Los bloqueos externos siguen en blocking_conditions; no reciben números inventados.

## Comandos de lectura posteriores a autorización

    gh issue list -R Taller-SW-Web/G6-Productos-Ofertas-backend --state all --limit 500 --json number,title,state,url
    gh api repos/Taller-SW-Web/G6-Productos-Ofertas-backend/assignees --paginate --jq '.[].login'

Solo después de autorización, reconciliar el título y revisar el ledger antes de cada alta. El comando de creación futura es gh issue create --repo ... --title ... --body-file ... --assignee ...; ningún comando de escritura se ejecutó aquí.

## Ledger

BACK_HITO3_PUBLICATION_LEDGER.json mantiene authorized=false y records=[]. Por issue publicado registra logical_id, number/URL reales, repo, título, assignee, fecha, create/reuse/skip, dependencias reconciliadas y SHA del manifiesto. No incluir secretos ni logs sensibles.
