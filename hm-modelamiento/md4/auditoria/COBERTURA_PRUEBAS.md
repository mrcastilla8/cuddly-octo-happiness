# Cobertura de pruebas MD-4

Clasificación basada en `evidencias/estado_experimentos.csv` y las salidas incluidas. “Acreditado” significa que el paquete contiene un registro y artefactos compatibles con el estado declarado; no equivale a reproducir la ejecución.

| Prueba | Estado observado | Evidencia y límite |
|---|---|---|
| MD4-P01 | **PASS declarado** | Integridad del corpus, auditoría de 22 controles y wordpieces: `evidencias/estado_experimentos.csv`, `md4_auditoria_corpus.csv`, `md4_tokenizador.json`. No hay notebook/log para revisar cómo se obtuvo. |
| MD4-P02 | **PASS parcial con PPS pendiente** | Selección TF-IDF y LSA, ranking y forma de embeddings en `estado_experimentos.csv`, `md4_seleccion_tfidf.csv`, `md4_seleccion_lsa.csv` y `md4_comparacion_topk_modelos.csv`. La etapa PPS/Kappa figura pendiente; falta `md4_seleccion_hiperparametros.csv`; SBERT no tiene nombre/revisión de modelo en la evidencia recibida. |
| MD4-P03 | **PARCIAL** | Conteos disponibles en `md4_aporte_vs_jerarquia_conteos.csv`; `md4_aporte_vs_jerarquia.csv` y `md4_diccionario_metricas.json` identifican tasas/fórmulas como propuestas pendientes de aprobación. |
| MD4-P04 | **PASS_CON_RESERVA declarado** | Sensibilidades y rankings presentes en `md4_sensibilidad_corpus.csv`, `md4_sensibilidad_resumen.json`, `md4_solapamiento_modelos.csv` y `md4_comparacion_topk_modelos.csv`. La reserva metodológica por las fórmulas pendientes permanece; no se recibió notebook para reproducir. |

## PPS y evaluación humana

La ronda doble planificada contiene 102 pares de un universo de 340. `evidencias/md4_concordancia_pps.csv` deja `kappa` y `acuerdo` vacíos; el estado es `PENDIENTE_REVISION_HUMANA`. El plan se encuentra en `evidencias/md4_plan_revision_humana.json`. No declarar evaluación doble, arbitraje ni Cohen's Kappa calculado.

## Afirmaciones no verificables con este paquete

- Ejecución de celdas, advertencias, errores y excepciones: notebook y logs ausentes.
- Parámetros completos de cada modelo y selección de hiperparámetros: archivo de selección faltante; configuración SBERT incompleta.
- Reproducibilidad del corpus: los Parquet/fuentes son privados y no forman parte de la publicación.
- Validez metodológica de TCC, TCT, TCMG, TDIG, TCTipo y TDIT: definiciones marcadas como propuestas.
