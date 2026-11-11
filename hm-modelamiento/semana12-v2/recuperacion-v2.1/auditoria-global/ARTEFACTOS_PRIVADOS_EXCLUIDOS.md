# Artefactos privados excluidos de publicación

Inventario de archivo, SHA-256, tamaño y miembros de ZIP: `INVENTARIO_RECUPERACION_V21.csv` y `MANIFIESTO_RECUPERACION_V21.json`. Los ZIP se inspeccionaron con CRC; no se añadieron al repositorio.

- Cuatro ZIP `*_Modelos_PRIVADO.zip` de MD-1–MD-4: contienen modelos serializados, predicciones/índices y, en MD-4, pesos SBERT, vectores y catálogo artículo-texto.
- `HM_MD2_P01_Modelo_Articulos_PRIVADO.zip`: ruleset con IDs de artículo y pares. El ZIP público pequeño de complemento también contiene CSV de frecuencia por artículo, pares y reglas identificables; por ello no se publicó íntegro. Solo se publican sus cifras agregadas y la figura sin etiquetas.
- `HM_MD4_Plantillas_PPS_PRIVADO.zip`: hojas ciegas/plantillas con pares y nombres/descripciones de artículos. No contiene calificaciones reales, pero sigue siendo identificable y no se publica.
- Notebooks ejecutados complementarios: preservados localmente; excluidos por outputs de artículo identificables/nombres de productos.
- Parquets originales, registros de cliente, cachés e índices privados: no publicados; no se hallaron entre los archivos descargados visibles en la carpeta raíz auditada.

Los archivos originales locales no se borraron, reempaquetaron ni modificaron. El inventario de miembros privados sirve para auditoría; no copia contenido.
