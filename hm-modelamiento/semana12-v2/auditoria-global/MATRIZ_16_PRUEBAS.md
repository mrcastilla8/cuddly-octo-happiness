# Matriz documental de 16 pruebas — v2

La etiqueta resume si hay evidencia pública guardada y qué reservas quedan. No es una validación estadística independiente ni una aprobación del experimento.

| MD | Prueba | Estado documental | Evidencia/observación principal |
|---|---|---|---|
| MD-1 | P01 — PAM piloto y selección k | DOCUMENTADA | k=2 seleccionado tras comparación k=2…8; silueta/ARI en `md1/evidencias/`. |
| MD-1 | P02 — estabilidad cinco reinicios/remuestreos | DOCUMENTADA | ARI repetido, selección congelada y valores de test visibles. |
| MD-1 | P03 — sensibilidad RFM | DOCUMENTADA | Raw, cap99 y RF; K-means/PAM y cinco semillas. |
| MD-1 | P04 — evaluación final, perfiles, decisión | DOCUMENTADA | Test de referencia n=2,000 por método; regla documenta preferencia K-means. |
| MD-2 | P01 — Apriori/FP-Growth y piloto artículo | PARCIAL | Igualdad declarada en 1,831 itemsets de categorías; `article_id` da 0 itemsets y 0% cobertura en ambas escalas. |
| MD-2 | P02 — umbrales y robustez | DOCUMENTADA | Sensibilidades de soporte/confianza/piso y tres remuestreos Jaccard. |
| MD-2 | P03 — diaria/semanal y fronteras ISO | DOCUMENTADA | Comparación de universo y semanas parciales disponible. |
| MD-2 | P04 — reglas congeladas, test, P99 | DOCUMENTADA | 20 reglas; test N=1,040,904; control de artículos populares. |
| MD-3 | P01 — naive/naive estacional y baseline | DOCUMENTADA | Baseline `naive` fijada en validación. |
| MD-3 | P02 — seis ETS, SARIMA, AICc, rolling-origin | DOCUMENTADA | Quince orígenes de validación, horizonte 7; selección congelada antes del test. |
| MD-3 | P03 — pronósticos retenidos y MAE/RMSE | DOCUMENTADA | Test temporal con 15 ventanas de horizonte 7. |
| MD-3 | P04 — sensibilidades y residuos | DOCUMENTADA | Horizontes, ventanas, canales y diagnósticos disponibles; ETS conserva autocorrelación residual. |
| MD-4 | P01 — auditoría de corpus y tokenizer | DOCUMENTADA | Conteos agregados, corpus, imputaciones y tokenizador. |
| MD-4 | P02 — TF-IDF/LSA/SBERT y rankings | PARCIAL | Modelos y rankings automáticos; PPS humana pendiente y Kappa NaN (n=102). |
| MD-4 | P03 — métricas estructurales | PARCIAL | Resultados calculados con acrónimos/fórmulas todavía sujetos a ratificación. |
| MD-4 | P04 — sensibilidad y pertinencia | PARCIAL | Sensibilidades automáticas; pertinencia humana PPS no completada. |

## Hallazgos que afectan la lectura

- MD-2: un proceso sin excepción no significa que el piloto por artículo haya producido reglas. `SIN_PATRONES_ELEGIBLES`, 0 artículos, 0 itemsets y 0% cobertura significa que el objetivo por artículo sigue pendiente a esos umbrales/tamaños.
- MD-2: no se observa el error anterior `consequent_support` en source ni outputs v2; v2 no presenta salida de error guardada. La comparación de tiempo Apriori/FP-Growth no es comparable: un valor es ejecución nueva y el otro proviene del piloto reutilizado.
- MD-3: no hay señal documental de selección retrospectiva con test. La selección congelada se basa en validación; test se utiliza para reportar métricas de finalistas.
- MD-4: no se deben inferir PPS ni Kappa a partir de los archivos de ronda o del n=102; el output los deja explícitamente pendientes/NaN.

Los detalle por prueba y links están en `md1/auditoria/COBERTURA_PRUEBAS.md` a `md4/auditoria/COBERTURA_PRUEBAS.md`.
