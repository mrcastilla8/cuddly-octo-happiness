# Auditoría documental MD2-P01 — factibilidad por `article_id`

## Ejecución observada

El notebook local `md2-p01-correccion-autonoma-asap.ipynb` tiene 11 celdas: 5/5 celdas de código con `execution_count` presente (1–5), sin outputs de tipo error. La última celda termina con `MD2-P01 terminado; las otras pruebas/modelos NO se ejecutaron nuevamente.` No se observa timeout ni traceback guardado. La ejecución adaptativa se detuvo tras obtener reglas en 1%; 3% y 5% estaban condicionados a que el nivel previo no produjera reglas y **no se probaron**.

## Resultado real

| Fracción clientes de desarrollo | Cestas cliente–día | Artículos distintos | Elegibles (≥30 presencias) | Itemsets/p pares elegibles | Reglas dirigidas | Cobertura de cestas con artículo elegible | Soporte min. | Piso absoluto |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1% | 81.660 | 47.383 | 886 | 18 pares | 30 | 35,22% (28.760/81.660) | 0,00005 | 30 |

Cobertura de presencias de artículos elegibles: 17,17%. Se filtraron 52.900 cestas sin artículo elegible. Se reportaron 257.607 transacciones únicas artículo-cesta. El mínimo efectivo para coocurrencias quedó dominado por el piso absoluto de 30. La confianza mínima fue 0,20 y el filtro lift > 1,0. Las 30 reglas dirigidas observadas cumplen ambos filtros; soporte entre 0,0003674 y 0,000894, confianza entre 0,20073 y 0,9375 (mediana 0,61752), lift entre 41,60 y 2.183,42 (mediana 689,89). Resumen agregado sin IDs: [CSV](../md2-p01/evidencias/md2_p01_resumen_reglas_agregado.csv). No se exponen los pares.

## Alcance y cautelas

Esto demuestra factibilidad exploratoria de coocurrencias de **dos** artículos en desarrollo, calculadas mediante conteo exacto disperso de pares. No es una corrida completa de Apriori/FP-Growth, no genera triples, no es evaluación temporal fuera de muestra, no mide persistencia y no aprueba automáticamente MD2-P01. Los lifts muy altos deben revisarse científicamente junto con la escasez, selección de artículos frecuentes, cobertura y posible relación de variantes. La diferencia de universo y soporte frente a P02/P04 impide mezclar cifras.

## Outputs y entregables

La ejecución incluye tabla y dos gráficos mostrados en el notebook; el gráfico de factibilidad agregado está publicado en [PNG](../md2-p01/evidencias/md2_p01_factibilidad_articulos.png). La celda final creó el ZIP pequeño de evidencias y un ruleset privado. Los agregados de la decisión están en [JSON](../md2-p01/evidencias/md2_p01_decision_complementaria.json). El CSV de pares, frecuencias por artículo y reglas con IDs se omitieron por privacidad; por ello las reglas son auditables aquí solo en forma estadística agregada, no una por una. La evidencia basta para revisión científica de la afirmación de factibilidad, con esta limitación; no cierra persistencia ni pertinencia.

Histórico: `../../md2/evidencias/md2_pilotos.csv` muestra 0 artículos/itemsets/cobertura en los pilotos de 0,1% (8.321 cestas) y 0,01% (792 cestas), soporte 0,00005 y piso 30.
