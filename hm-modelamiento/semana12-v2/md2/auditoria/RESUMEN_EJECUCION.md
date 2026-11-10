# MD-2 — resumen de ejecución v2

Notebook fuente: [`MD2_COMPLETA_v2.ipynb`](../notebook/MD2_COMPLETA_v2.ipynb); SHA-256 inventariado en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv). No se ejecutó el notebook en esta auditoría.

- Estado declarado por artefactos: `EVALUACION_INCOMPLETA`.
- Celdas: 33 (15 Markdown, 18 código); celdas de código con contador: 18/18.
- Outputs guardados: 81; salidas de error/traceback en tipo `error`: 0.
- Gráficas raster visibles: 4; tablas HTML visibles: 6.
- Última celda ejecutada: celda 32 / contador 18.
- Resultados clave: product_type_name: 1,831 itemsets con Apriori y FP-Growth sobre N=81,660 cestas (85 vacías). Se congelaron y reevaluaron 20 reglas sobre N_test=1,040,904.
- Interpretación observada: Sensibilidad de soporte/confianza/piso y tres remuestreos Jaccard presentes; P99 aplicado al conteo de reglas. Piloto article_id: 0 ítems/itemsets en 8,321 y 792 cestas, cobertura 0%; no es un resultado positivo de minería.

Los contadores y outputs guardados prueban que el archivo contiene resultados de una ejecución, pero no son una repetición independiente de la ejecución. Revisar cobertura y visualizaciones con [`COBERTURA_PRUEBAS.md`](COBERTURA_PRUEBAS.md) y el informe global.
