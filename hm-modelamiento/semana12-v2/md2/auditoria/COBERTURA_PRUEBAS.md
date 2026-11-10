# MD-2 — cobertura documental de P01 a P04 v2

Estados describen evidencia disponible; no constituyen aprobación científica independiente.

| Prueba | Alcance auditado | Estado documental | Evidencia pública |
|---|---|---|---|
| MD2-P01 | Apriori vs FP-Growth sobre misma incidencia; piloto `article_id` | PARCIAL: comparación por categoría produjo 1,831 itemsets; piloto artículo 0 elegibles en dos fracciones, cobertura cero. | [`md2_comparacion_algoritmos.csv`](../evidencias/md2_comparacion_algoritmos.csv), [`md2_pilotos.csv`](../evidencias/md2_pilotos.csv) |
| MD2-P02 | Soporte/confianza/piso absoluto y robustez Jaccard con tres remuestreos | DOCUMENTADA para categoría de producto; los datos muestran nueve valores y tres semillas. | [`md2_sensibilidad_umbrales.csv`](../evidencias/md2_sensibilidad_umbrales.csv), [`md2_estabilidad_remuestreos.csv`](../evidencias/md2_estabilidad_remuestreos.csv) |
| MD2-P03 | Cestas día/semana y límites ISO | DOCUMENTADA; cestas diarias 81,660 vs semanales 72,697 según estado. | [`md2_sensibilidad_cestas.csv`](../evidencias/md2_sensibilidad_cestas.csv), [`md2_semanas_iso_parciales.csv`](../evidencias/md2_semanas_iso_parciales.csv) |
| MD2-P04 | Reglas congeladas, evaluación test y control P99 | DOCUMENTADA para 20 reglas sobre N_test=1,040,904; no se minan reglas en test. | [`md2_reglas_congeladas_test.csv`](../evidencias/md2_reglas_congeladas_test.csv), [`md2_control_popularidad_p99.csv`](../evidencias/md2_control_popularidad_p99.csv) |

## Incidencias concretas

El piloto `article_id` **no se resolvió**: con `support=5e-05` se observaron 0 ítems en 8,321 cestas de 0.1% y 792 cestas de 0.01%; ambas filas registran `SIN_PATRONES_ELEGIBLES`, 0 itemsets y cobertura 0%. El proceso terminó, pero ese alcance no produjo un experimento de reglas por artículo. El trabajo por categoría sí produjo itemsets y evaluación aparte.

No reaparece `consequent_support` en el source ni en los outputs guardados del notebook v2; no hay celda de error/traceback. La versión previa del repositorio documentaba `AttributeError` y recuperación posterior. Esto respalda que v2 no exhibe el error, pero no confirma independencia de la ejecución.

La comparación de tiempo mostrada no es pareja: Apriori 11.04 s se etiqueta `ejecucion_nueva`, mientras FP-Growth 390.79 s se reutiliza del piloto; comparar rendimiento requiere cautela.
