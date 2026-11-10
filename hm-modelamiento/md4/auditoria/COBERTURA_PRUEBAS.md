# Cobertura de pruebas MD-4

Clasificación basada en ambos snapshots del notebook, `evidencias/estado_experimentos.csv` y las salidas incluidas. El inicial conserva 16/16 celdas de código ejecutadas, 41 outputs y cero errores; el complementario conserva esas celdas y añade una auditoría, para 17/17, 43 outputs y cero errores. No se volvió a ejecutar código en esta publicación.

| Prueba | Estado observado | Evidencia y límite |
|---|---|---|
| MD4-P01 | **PASS declarado** | Integridad del corpus, auditoría de 22 controles y wordpieces: `evidencias/estado_experimentos.csv`, `md4_auditoria_corpus.csv`, `md4_tokenizador.json`. Ejecución guardada en el notebook; auditoría de corpus y conteo de 22 controles presentes. |
| MD4-P02 | **PASS parcial con PPS pendiente** | Selección TF-IDF y LSA, ranking y forma de embeddings en `estado_experimentos.csv`, `md4_seleccion_tfidf.csv`, `md4_seleccion_lsa.csv` y `md4_comparacion_topk_modelos.csv`. La selección de hiperparámetros se añadió en `evidencias/revision_complementaria/md4_seleccion_hiperparametros.csv` (H01); el entorno/revisión del modelo se completa parcialmente en `md4_entorno_modelo_complementario.json` (H08). PPS/Kappa continúa pendiente. |
| MD4-P03 | **PARCIAL** | Conteos disponibles en `md4_aporte_vs_jerarquia_conteos.csv`; `md4_aporte_vs_jerarquia.csv` y `md4_diccionario_metricas.json` identifican tasas/fórmulas como propuestas pendientes de aprobación. |
| MD4-P04 | **PASS_CON_RESERVA declarado** | Sensibilidades y rankings presentes en `md4_sensibilidad_corpus.csv`, `md4_sensibilidad_resumen.json`, `md4_solapamiento_modelos.csv` y `md4_comparacion_topk_modelos.csv`. La reserva metodológica por las fórmulas pendientes permanece; el notebook guardado no contiene errores; no se reejecutó durante la publicación. |

## PPS y evaluación humana

La ronda doble planificada contiene 102 pares de un universo de 340. `evidencias/md4_concordancia_pps.csv` deja `kappa` y `acuerdo` vacíos; el estado es `PENDIENTE_REVISION_HUMANA`. El plan se encuentra en `evidencias/md4_plan_revision_humana.json`. No declarar evaluación doble, arbitraje ni Cohen's Kappa calculado.

## Afirmaciones no verificables con este paquete

- Reproducir el resultado desde cero: dataset fuente privado; no se reejecutó el notebook. El snapshot sí conserva celdas y outputs.
- Versiones de Sentence-Transformers/Transformers y configuración de hardware GPU: no consignadas; el output registra CPU para SBERT.
- Parámetros completos de cada modelo y selección de hiperparámetros: archivo de selección faltante; configuración SBERT incompleta.
- Reproducibilidad del corpus: los Parquet/fuentes son privados y no forman parte de la publicación.
- Validez metodológica de TCC, TCT, TCMG, TDIG, TCTipo y TDIT: definiciones marcadas como propuestas.


## Controles complementarios añadidos

| Control | Resultado observado | Referencia y alcance |
|---|---|---|
| H01 — hiperparámetros | **GENERADO** | Seis filas de TF-IDF/LSA; `TF_SW_2` y `LSA_200` marcados como seleccionados en `evidencias/revision_complementaria/md4_seleccion_hiperparametros.csv`. Resuelve la ausencia del archivo en el paquete complementario, preservando el estado del reporte histórico. |
| H04 — sensibilidad LSA sin imputados | **GENERADO** | Dos filas, 170 consultas de ajuste, k=5 y 10 en `md4_sensibilidad_LSA_originales_adicional.csv`; tasas estructurales siguen propuestas. El consolidado adicional mantiene 48 filas históricas y añade dos. |
| H05 — equivalencia Gram cruzada | **PASS** | Ocho comparaciones; error máximo 8.88e-16 en `md4_equivalencia_gram_cruzada.csv`. Comprobación computacional, no evaluación de calidad. |
| H03 — validación PPS | **PENDIENTE_REVISION_HUMANA** | La celda no encontró `md4_pps_evaluaciones.csv`; no se calculó Kappa ni se completaron anotaciones humanas. Estado en `md4_resumen_controles.json`. |
| H06 — bitácora | **DIAGNÓSTICO** | `MD4-P02 / seleccion_lsa` aparece repetida dos veces en `md4_auditoria_bitacora.csv`; se conserva sin editar el registro original. |
| H07 — gráficos | **GENERADOS** | Dos gráficos de rankings existentes: distribución de coseno Top-5 y solapamiento por modelo. |
| H08 — entorno/modelo | **GENERADO** | Versiones de bibliotecas y revisión cache de Sentence-BERT registradas en `md4_entorno_modelo_complementario.json`.

Los nueve archivos del ZIP complementario y el notebook actualizado se inventarían con hashes en `INVENTARIO_COMPLETO.csv` y `MANIFIESTO.json`. El notebook histórico y los resultados originales no se sobrescriben.
