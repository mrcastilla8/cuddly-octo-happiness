# Laboratorio H4 G6 ↔ G7

Snapshots completos de fuente importados el 2026-11-06 desde `master` (SHAs y huellas por archivo en `MANIFIESTO-SHAS.json`). OpenAPI de referencia fijado al commit de Docs `cb7eec179f812d38929e20c5ab6f7a77139c4090`.

- `frontend/`: aplicación React.
- `backend/`: monorepo NestJS.
- `contratos/openapi.yaml`: snapshot normativo usado para elegir la operación protegida.
- No se versionan `.git` anidados, dependencias, builds ni archivos `.env` privados.

Comprobar la procedencia desde la raíz del laboratorio:

```powershell
pwsh -NoProfile -File .\laboratorio-h4\scripts\verify-provenance.ps1
node .\laboratorio-h4\scripts\verify-protected-operation.mjs
```

La primera operación protegida seleccionada es `GET /api/v1/cupones` (`listarCupones`, `userBearer`). Solo se ejecuta con una sesión humana G7 legítima o en el runner local de fixtures claramente identificado.
