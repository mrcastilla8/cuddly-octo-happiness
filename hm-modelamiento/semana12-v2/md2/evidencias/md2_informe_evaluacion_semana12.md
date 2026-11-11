# MD-2 — evaluación Semana 12

Unidad: cesta binaria aproximada cliente–día (no pedido). El denominador N incluye cestas unitarias y vacías tras el filtrado.
La comparación de algoritmos usa muestra congelada; las reglas finales se descubren en desarrollo y se cuentan en todo test sin redescubrir.

## Cobertura
- **MD2-P01 / Apriori frente a FP-Growth, mismos datos y itemsets**: PASS (`md2_pilotos.csv; md2_comparacion_algoritmos.csv; estado_experimentos.csv`).
- **MD2-P01 / factibilidad de reglas por artículo en piloto**: PENDIENTE (`md2_pilotos.csv; estado_experimentos.csv`).
- **MD2-P02 / sensibilidad soporte/confianza/pisos absolutos**: PASS (`md2_sensibilidad_umbrales.csv`).
- **MD2-P02 / robustez con tres remuestreos de 80% de clientes**: PASS (`md2_estabilidad_remuestreos.csv`).
- **MD2-P03 / sensibilidad cestas diaria/semanal y fronteras ISO**: PASS (`md2_sensibilidad_cestas.csv; md2_semanas_iso_parciales.csv`).
- **MD2-P04 / hasta 20 reglas congeladas reevaluadas en todas las cestas de test**: PASS (`md2_reglas_congeladas_test.csv; md2_fichas_top20.csv; md2_control_popularidad_p99.csv`).

## Interpretación empírica
- Apriori y FP-Growth registran **1831 itemsets** en la misma muestra y con igual soporte; revisar `estado_experimentos.csv` para la comprobación de identidad exacta.
- Reglas **PERSISTENTE**: 20 de 20.
- N_test=1040904 cestas; por protocolo, cobertura del periodo de test, no una submuestra de desarrollo.

## Limitaciones
- Las reglas son patrones de coocurrencia; lift > 1 no implica causalidad ni utilidad comercial.
- FP-Growth puede agotar memoria o tiempo y dejar una prueba inconclusa: no sustituir evidencia ausente con ceros.
- Comparar cambios de granularidad exige reportar N y cobertura propios, sin confundir porcentajes entre universos.

## Archivos
- `md2_cobertura_semana12.csv`, `md2_invariantes_evaluacion.csv` y figuras PNG.
- Fuentes: pilotos, equivalencia de itemsets, sensibilidad de umbrales, remuestreos, cestas y test congelado.
