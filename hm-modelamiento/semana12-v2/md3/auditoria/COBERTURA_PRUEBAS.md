# MD-3 — cobertura documental de P01 a P04 v2

Estados describen evidencia disponible; no constituyen aprobación científica independiente.

| Prueba | Alcance auditado | Estado documental | Evidencia pública |
|---|---|---|---|
| MD3-P01 | Naive y naive estacional comparados en validación; baseline fijada sin test | DOCUMENTADA; baseline congelada como naive. | [`md3_baselines_validacion.csv`](../evidencias/md3_baselines_validacion.csv), `baseline_fijada.json` |
| MD3-P02 | Seis ETS, búsqueda SARIMA/AICc y rolling-origin en validación | DOCUMENTADA; 15 orígenes de horizonte 7 y finalistas congelados. | [`md3_candidatos.csv`](../evidencias/md3_candidatos.csv), [`md3_sarima_aicc.csv`](../evidencias/md3_sarima_aicc.csv), [`md3_metricas_por_origen.csv`](../evidencias/md3_metricas_por_origen.csv), `seleccion_congelada.json` |
| MD3-P03 | Pronósticos y MAE/RMSE en test retenido | DOCUMENTADA; 15 ventanas × 7; selección precedente queda congelada. | [`md3_pronosticos_test.csv`](../evidencias/md3_pronosticos_test.csv), [`md3_metricas_test.csv`](../evidencias/md3_metricas_test.csv) |
| MD3-P04 | Sensibilidades, horizontes/canales y diagnósticos residuales | DOCUMENTADA; respetar diferencias de escala y revisar autocorrelación residual ETS. | [`md3_sensibilidad.csv`](../evidencias/md3_sensibilidad.csv), [`md3_diagnosticos_residuos.csv`](../evidencias/md3_diagnosticos_residuos.csv), [`md3_semanas_observadas.csv`](../evidencias/md3_semanas_observadas.csv) |

## Riesgo de selección por test

La bitácora declara selección y finalistas congelados con validación; el test se usa para evaluar. El artefacto baseline apunta a `naive`. No se observa selección posterior basada en test. Una carga de historia completa posterior para estado de pronóstico no equivale a cambiar la elección, pero la auditoría académica debe separar explícitamente esa etapa del scoring de test.
