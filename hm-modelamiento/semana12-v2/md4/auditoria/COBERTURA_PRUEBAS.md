# MD-4 — cobertura documental de P01 a P04 v2

Estados describen evidencia disponible; no constituyen aprobación científica independiente.

| Prueba | Alcance auditado | Estado documental | Evidencia pública |
|---|---|---|---|
| MD4-P01 | Auditoría del corpus, textos faltantes/imputados, tokenizer | DOCUMENTADA según auditoría y metadata de persistencia. | [`md4_auditoria_corpus.csv`](../evidencias/md4_auditoria_corpus.csv), [`md4_tokenizador.json`](../evidencias/md4_tokenizador.json) |
| MD4-P02 | TF-IDF/LSA/SBERT, hiperparámetros, embeddings y ranking | PARCIAL: sistema automático ejecutado; PPS humana no calculada, Kappa NaN (n=102). | [`md4_seleccion_tfidf.csv`](../evidencias/md4_seleccion_tfidf.csv), [`md4_seleccion_lsa.csv`](../evidencias/md4_seleccion_lsa.csv), [`md4_seleccion_hiperparametros.csv`](../evidencias/md4_seleccion_hiperparametros.csv), `md4_comparacion_topk_modelos.csv` (fila a fila, excluido por minimización), [`md4_concordancia_pps.csv`](../evidencias/md4_concordancia_pps.csv) |
| MD4-P03 | Métricas estructurales y aporte vs jerarquía | PARCIAL: resultados calculados, acrónimos/fórmulas con reserva de ratificación. | [`md4_aporte_vs_jerarquia.csv`](../evidencias/md4_aporte_vs_jerarquia.csv), [`md4_aporte_vs_jerarquia_conteos.csv`](../evidencias/md4_aporte_vs_jerarquia_conteos.csv), [`md4_diccionario_metricas.json`](../evidencias/md4_diccionario_metricas.json) |
| MD4-P04 | Sensibilidad de corpus/modelo y evaluación PPS | PARCIAL: sensibilidades automáticas presentes; evaluación de pertinencia humana sigue pendiente. | [`md4_sensibilidad_corpus.csv`](../evidencias/md4_sensibilidad_corpus.csv), [`md4_solapamiento_modelos.csv`](../evidencias/md4_solapamiento_modelos.csv), [`md4_plan_revision_humana.json`](../evidencias/md4_plan_revision_humana.json) |

## Revisión humana

No hay PPS humana calculada ni Cohen Kappa válido: el output guardado muestra n=102 con `kappa=NaN`, `acuerdo=NaN` y `PENDIENTE_REVISION_HUMANA`. No interpretar los archivos de ronda/plantillas como evaluaciones terminadas.
