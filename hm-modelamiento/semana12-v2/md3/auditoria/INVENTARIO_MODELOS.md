# MD-3 — inventario documental de modelos v2

**Estado:** `VERIFICADO_DOCUMENTALMENTE`

**Alcance:** metadatos, lista interna, hashes, source del notebook y outputs guardados. No se cargaron `pickle`/`joblib` ni se ejecutaron modelos. La etiqueta significa que el notebook contiene evidencia de una prueba de guardado/recarga; no es verificación independiente por esta auditoría.

## Archivos del ZIP privado — no publicados

| Ruta | Bytes | SHA-256 | Formato |
|---|---:|---|---|
| `md3/modelos/ETS_tN_sN_d0.pkl` | 53666 | `d1d95d105aff05eebf0b5e6d14d6d50184f9e60705fa2e5f6ff5167a77fb12a5` | .pkl |
| `md3/modelos/SARIMA_101_011_7.pkl` | 29081444 | `5200ea4b3061e3f799a77a60f57fed4cc46429e22dfb6e80465911c3b742da45` | .pkl |
| `md3/modelos/baseline_estado.json` | 386 | `c41269c30e392bb8af26f6b130eef68ea508fb69e3cd897762957037636fb8fc` | .json |
| `md3/modelos/estado_modelos.json` | 583 | `1e6570c9edb3249c43cb8390b49c41b7dc0b54233e4b2edac62c67106d7f955c` | .json |
| `md3/manifest_exportacion.json` | 794 | `56055cee8bd7af84df641f388c46f7bf71ab67917322169b8e7984fae1265fbc` | .json |

## Contenido y reutilización

PKL (`ETS_tN_sN_d0.pkl`, `SARIMA_101_011_7.pkl`) + JSON baseline, estado y manifiesto con SHA-256. Se declaran refits con desarrollo+validación (no test), baseline naive, horizonte 7, y tiempos de prueba de recarga 0.017 s y 0.653 s.

Inferencia requiere una serie temporal diaria ordenada con historia suficiente; naive conserva último valor y naive estacional últimos 7; ETS/SARIMA dependen de statsmodels y serialización Python compatible. No se cargaron PKL durante esta auditoría y no se verificó independencia/portabilidad.

Los ocho ZIP privados quedan locales. Los hashes completos también están en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv).
