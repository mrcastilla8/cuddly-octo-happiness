# MD-4 — resumen de ejecución v2

Notebook fuente: [`MD4_COMPLETA_v2.ipynb`](../notebook/MD4_COMPLETA_v2.ipynb); SHA-256 inventariado en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv). No se ejecutó el notebook en esta auditoría.

- Estado declarado por artefactos: `PARCIAL`.
- Celdas: 43 (14 Markdown, 29 código); celdas de código con contador: 29/29.
- Outputs guardados: 76; salidas de error/traceback en tipo `error`: 0.
- Gráficas raster visibles: 4; tablas HTML visibles: 20.
- Última celda ejecutada: celda 42 / contador 29.
- Resultados clave: TF-IDF, LSA (200 componentes elegidos), embeddings Sentence-BERT (105,542 artículos × 384; 43,779 textos únicos), rankings top-k y medidas estructurales con definiciones provisionales.
- Interpretación observada: Se registran 30 consultas para solapamiento/ranking y resultados por estratos. PPS de evaluación humana no está calculada; la tabla de concordancia tiene n=102 pero Kappa/acuerdo NaN y estado PENDIENTE_REVISION_HUMANA.

Los contadores y outputs guardados prueban que el archivo contiene resultados de una ejecución, pero no son una repetición independiente de la ejecución. Revisar cobertura y visualizaciones con [`COBERTURA_PRUEBAS.md`](COBERTURA_PRUEBAS.md) y el informe global.
