# MD-1 — inventario documental de modelos v2

**Estado:** `VERIFICADO_DOCUMENTALMENTE`

**Alcance:** metadatos, lista interna, hashes, source del notebook y outputs guardados. No se cargaron `pickle`/`joblib` ni se ejecutaron modelos. La etiqueta significa que el notebook contiene evidencia de una prueba de guardado/recarga; no es verificación independiente por esta auditoría.

## Archivos del ZIP privado — no publicados

| Ruta | Bytes | SHA-256 | Formato |
|---|---:|---|---|
| `md1/modelos/estado_modelos.json` | 689 | `0a1b160e0314fe51abb2e9bdaf35c77411519b134650d1d9e6d96a06abd0a7c2` | .json |
| `md1/modelos/kmeans_k2.npz` | 1044 | `3eb2d7b9d8e56608e08ef9488dfccc44e0c1a02fbfd70f7e9df741da5047d9c6` | .npz |
| `md1/modelos/pam_k2.npz` | 1054 | `e1c668e7f0d04009a52c1dd6d869a22106b1989296210b5d45212e432cc8ea06` | .npz |
| `md1/manifest_exportacion.json` | 607 | `4c5c0f7e94896a272bca0f6dfce01e3adfab265190f15ddbf042f13cebb81926` | .json |

## Contenido y reutilización

NPZ NumPy (`kmeans_k2.npz`, `pam_k2.npz`) + JSON. Cada NPZ almacena centros, mediana, escala, cap y filas medoid; estado declara tres features RFM y ajuste n=4,000. Notebook reabre con `allow_pickle=False`, compara transformación/centros y verifica igualdad exacta de etiquetas en referencia test de 2,000.

Inferencia requiere las columnas `recencia_dias`, `frecuencia_registros`, `valor_agregado_price` y aplicar median/scale/cap del NPZ. Sin dependencia/versionado del entorno en manifiesto. Verificación es evidencia guardada, no repetición independiente.

Los ocho ZIP privados quedan locales. Los hashes completos también están en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv).
