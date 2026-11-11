# MD-1 — cobertura documental de P01 a P04 v2

Estados describen evidencia disponible; no constituyen aprobación científica independiente.

| Prueba | Alcance auditado | Estado documental | Evidencia pública |
|---|---|---|---|
| MD1-P01 | Comparación K-means/PAM para k=2…8, pilotos PAM y cinco inicializaciones/remuestreos | DOCUMENTADA; outputs y CSV agregados disponibles. 14 combinaciones de silueta y estabilidad. | [`md1_seleccion_k.csv`](../evidencias/md1_seleccion_k.csv), [`md1_ari_repeticiones.csv`](../evidencias/md1_ari_repeticiones.csv), [`md1_piloto_pam.csv`](../evidencias/md1_piloto_pam.csv) |
| MD1-P02 | Estabilidad ARI: cinco inicializaciones y cinco remuestreos | DOCUMENTADA; ARI reportado en selección y test. | [`md1_ari_repeticiones.csv`](../evidencias/md1_ari_repeticiones.csv), [`md1_evaluacion_final.csv`](../evidencias/md1_evaluacion_final.csv) |
| MD1-P03 | Sensibilidad RFM (raw, cap99, RF), cinco semillas y ambos métodos | DOCUMENTADA; 6/6 condiciones declaradas. | [`md1_sensibilidad.csv`](../evidencias/md1_sensibilidad.csv) |
| MD1-P04 | Evaluación final, perfiles y decisión K-means/PAM | DOCUMENTADA en referencia test n=2,000; K-means preferido por regla del protocolo. | [`md1_evaluacion_final.csv`](../evidencias/md1_evaluacion_final.csv), [`md1_perfiles_finales.csv`](../evidencias/md1_perfiles_finales.csv), [`md1_decision_final.json`](../evidencias/md1_decision_final.json) |
