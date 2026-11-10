# MD-1 — evaluación Semana 12

Unidad: cliente con actividad. R=recencia en días; F=recuento de registros; M=suma de price sin moneda acreditada.
El ajuste, la selección de k y la evaluación final usan clientes disjuntos. Las métricas se refieren a muestras descritas en el notebook.

## Cobertura de pruebas
- **MD1-P01 / piloto PAM**: PASS (md1_piloto_pam.csv).
- **MD1-P01 / comparación k=2…8 en muestra común**: PASS (md1_seleccion_k.csv (14 combinaciones)).
- **MD1-P02 / estabilidad 5×5, 10 ARI por condición**: PASS (md1_ari_repeticiones.csv; md1_k_congelado.json).
- **MD1-P03 / tres sensibilidades × dos algoritmos**: PASS (md1_sensibilidad.csv).
- **MD1-P04 / evaluación final y perfiles sobre clientes retenidos**: PASS (md1_evaluacion_final.csv; md1_perfiles_finales.csv; md1_firmas.csv; md1_decision_final.json).

## Resultados verificables
- k congelado en selección: **2**; preferencia conforme a la regla del protocolo: **KMeans**.
- KMeans: silueta final=0.5023; ARI inicializaciones=0.9938; ARI remuestreo=0.9805; referencia test n=2000.
- PAM: silueta final=0.4838; ARI inicializaciones=1.0000; ARI remuestreo=0.8661; referencia test n=2000.
- Los perfiles y las firmas se describen en CSV, sin incluir customer_id en las evidencias publicables.

## Límites de inferencia
- Los conglomerados describen actividad histórica, no efectos comerciales ni causalidad.
- No extrapolar el resultado de PAM sobre la muestra a toda la población sin evaluar esa generalización.
- Si el piloto se detuvo o faltan repeticiones, el estado es parcial, no entrenamiento completado.

## Artefactos
- `md1_cobertura_semana12.csv`, `md1_invariantes_evaluacion.csv` y figuras PNG.
- Detalle experimental original: `md1_seleccion_k.csv`, `md1_ari_repeticiones.csv`, `md1_sensibilidad.csv`, `md1_evaluacion_final.csv`, `md1_perfiles_finales.csv`.
