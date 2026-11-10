# Artefactos no publicados

El inventario completo conserva ruta, extensión, tamaño, SHA-256, finalidad probable y decisión para los 27 archivos del ZIP inicial, nueve archivos del ZIP complementario y dos snapshots de notebook. Se excluyeron archivos que exponen IDs de artículos y descripciones del catálogo derivado del dataset privado, hashes de fuentes que incluyen `customers`, y artefactos redundantes.

## Artefacto grande

- `md4/sbert_embeddings.npy` — 162,112,640 bytes; supera el límite de 25 MB y contiene 105,542 vectores de 384 dimensiones. Se conserva localmente. La auditoría pública puede comprobar la afirmación de forma y la etapa PASS en `evidencias/estado_experimentos.csv`; la auditoría de valores individuales requiere acceso autorizado al archivo local y al modelo fuente. No subirlo mediante Git LFS ni dividirlo en fragmentos públicos.

## Archivos privados o derivados del conjunto privado

Se excluyeron `md4_consultas_ajuste.csv`, `md4_consultas_holdout.csv`, `md4_mapa_articulos_textos.csv`, `md4_plantilla_pps_ciega.csv`, `md4_plantilla_pps_todos_escenarios.csv`, `md4_primera_ronda_segundo_evaluador.csv`, `md4_segunda_ronda_si_corresponde.csv` y `md4_recalibracion_10_pares_ajuste.csv`. Contienen listas de IDs de artículos, nombres/descripciones o mapeos del catálogo privado; además las plantillas no contienen calificaciones humanas completadas.

`entrada_y_entorno.json` y `origen_cache.json` no se publican porque contienen fingerprints SHA-256 de archivos fuente, incluidos `customers`. El resumen reproduce únicamente runtime y versiones de paquetes, sin fingerprints.

## Redundancia

`md4_posiciones_pps.csv` se omite porque las posiciones provienen del ranking completo publicado y duplican IDs asociados a los pares PPS.

## Notebook suplementario publicado

El ZIP inicial no contenía notebook. Se publicó primero `nb03-md4-similitud-textual.ipynb` (68,029 bytes) y después una copia complementaria `nb03-md4-similitud-textual-revision-complementaria.ipynb` (79,776 bytes), ambos bajo 25 MB. El segundo conserva sin cambios las celdas/outputs anteriores y agrega una celda; registra 17/17 celdas de código ejecutadas, 43 outputs y cero errores. No contiene vectores ni tablas de clientes; hace referencia al path de Kaggle del dataset privado, sin incluir esos Parquet. La advertencia de Hugging Face por acceso no autenticado se conserva en sus outputs; la descarga terminó y SBERT reportó PASS. Hash y procedencia en `MANIFIESTO.json` e `INVENTARIO_COMPLETO.csv`.
