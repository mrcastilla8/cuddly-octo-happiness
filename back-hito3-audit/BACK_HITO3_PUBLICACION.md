# Procedimiento de publicación controlada — BACK Hito 3

## Alcance y autorización

La autorización vigente es `APPROVAL-BACK-HITO3-PUBLISH-20261016`, registrada en [BACK_HITO3_AUTORIZACION_PUBLICACION.md](BACK_HITO3_AUTORIZACION_PUBLICACION.md). Repositorio destino único: `Taller-SW-Web/G6-Productos-Ofertas-backend`. Todos los 82 issues se publican allí, aunque `code_repository` apunte a Frontend. La autorización no incluye implementación, PRs de implementación, contratos, datos/SQL, RabbitMQ, permisos, Oracle, despliegue ni cambios a issues oficiales preexistentes.

## Fuentes y validaciones

Los cuerpos funcionales provienen de `BACK_HITO3_MANIFEST.json`; el cuerpo Markdown aprobado se mantiene sincronizado en `BACK_HITO3_ISSUES.md`. No regenerar issues. Antes de publicar, ejecutar:

```powershell
node .\BACK_HITO3_DRY_RUN.mjs --mode=authorized
node .\BACK_HITO3_DRY_RUN_NEGATIVE_TESTS.mjs --mode=authorized
```

El validador conserva `--mode=draft` para comprobar el estado previo con autorización falsa y ledger vacío. `authorized` valida autorización, snapshot del preflight y cualquier ledger parcial. `completed` exige 82 registros únicos verificados OPEN, con dependencias resueltas. Ningún modo omite chequeos de IDs, ownership, contratos, INT-ASAP, grafo o cuerpo humano.

## Lotes, idempotencia y checkpoints

[BACK_HITO3_PUBLISH.mjs](BACK_HITO3_PUBLISH.mjs) usa GitHub CLI, verifica identidad/permisos, limita cada lote a 10, agrega el marcador estable `<!-- BACK-LOGICAL-ID: ID -->`, crea en Backend con el responsable del manifiesto, consulta la respuesta remota y escribe el ledger atómicamente antes de continuar. Antes de crear consulta el ledger y los issues de GitHub. Si falla la respuesta de creación, reconsulta el marcador; no reintenta mientras no demuestre que el issue no existe. Una colisión de título sin marcador detiene ese ID.

Ejemplo de reanudación secuencial:

```powershell
node .\BACK_HITO3_PUBLISH.mjs --batch=1 --size=10
node .\BACK_HITO3_PUBLISH.mjs --batch=2 --size=10
# continuar en lotes de hasta 10, hasta cubrir los 82 registros
```

Cada lote verifica y persiste cada issue antes de pasar al siguiente; luego crea un commit/checkpoint en `main` del pizarrón y lo sube. Repetir un lote reconcilia por marcador y ledger sin duplicar. No editar issues INT-ASAP ni issues/PRs preexistentes.

## Dependencias

Después de tener los 82 IDs en el ledger, ejecutar `node .\BACK_HITO3_PUBLISH.mjs --resolve-dependencies`. Añade URLs y números reales únicamente a los issues BACK creados/reconciliados por marcador. Las dependencias obligatorias y sus inversas se publican en apartados distintos; las condicionales quedan rotuladas como no globales. INT-ASAP permanece como referencia complementaria. Las relaciones nativas blocked-by/blocking no se configuran; el ledger registra el estado y se verifican enlaces Markdown bidireccionales.

## Cierre y reanudación

Ejecutar `node .\BACK_HITO3_PUBLISH.mjs --verify-final` después de resolver dependencias. Verifica 82 marcadores únicos, cuerpo, título, repositorio, assignee, estado OPEN, URLs, enlaces, y compara issues/PRs preexistentes con el snapshot; confirma INT-ASAP #19–#33 intacto. Solo tras pasar esa verificación marca el ledger completo, genera `BACK_HITO3_PUBLICACION_RESULTADO.md`, valida con `--mode=completed` y crea/push el checkpoint final. Incidentes y registros parciales permanecen en el ledger; no borrar historial para pasar validación.
