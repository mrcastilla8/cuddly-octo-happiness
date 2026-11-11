# MD-3 — evaluación Semana 12

Serie objetivo: recuento diario de registros, no demanda real. División 513/110/111 días, según protocolo.
Las configuraciones se seleccionan solo en validación cronológica. El test se utiliza para confirmar, no para reajustar.

## Cobertura
- **MD3-P01 / dos baselines en validación, B* elegido sin test**: PASS (`md3_baselines_validacion.csv; baseline_fijada.json`).
- **MD3-P02 / ETS, SARIMA, MAE/RMSE en 15 orígenes y selección congelada**: PASS (`md3_candidatos.csv; md3_pronosticos_validacion.csv; md3_metricas_por_origen.csv; seleccion_congelada.json`).
- **MD3-P03 / test retenido con 15 ventanas de horizonte 7**: PASS (`md3_pronosticos_test.csv; md3_metricas_test.csv`).
- **MD3-P04 / sensibilidad a 28 días, 180 días, canales y residuos**: PASS (`md3_sensibilidad.csv; md3_diagnosticos_residuos.csv; md3_semanas_observadas.csv`).

## Resultados numéricos
- Baseline elegida **naive**; recomendación congelada en validación: **naive**.
- Test de naive: MAE=13869.600, RMSE=19475.564, sesgo=-10479.638, predicciones=105.
- Mejora descriptiva de MAE frente a B* en test: 0.00 %. No modifica la elección hecha en validación.

## Limitaciones metodológicas
- El presupuesto de 90/30 minutos puede dejar experimentos PAUSADOS: no interpretar la pausa como derrota de ETS/SARIMA.
- Las comparaciones de MAE entre canales, horizontes o escalas se informan dentro del escenario, nunca como mejora absoluta entre universos.
- Los modelos ETS/SARIMA no incorporan promociones, inventario o ventas reales.

## Evidencias
- `md3_evaluacion_comparativa_semana12.csv`, `md3_cobertura_semana12.csv`, `md3_invariantes_evaluacion.csv` y gráficos.
- Tablas originales: predicciones de validación/test, MAE/RMSE, sensibilidades y diagnósticos.
