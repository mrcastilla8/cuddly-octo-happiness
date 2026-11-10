# Rendimiento observado en artefactos v2

Tiempos tal como aparecen en outputs/bitácoras. No son benchmarks nuevos. No se estima total cuando no hay suma de fases comparable.

## MD-1

Solo el piloto PAM registra tiempos de muestra. Sus filas más lentas: 4,000×k=8, 22.04 s; 4,000×k=2, 3.90 s; 2,000×k=8, 3.84 s; 2,000×k=2, 0.38 s; 1,000×k=8, 0.93 s (orden exacto de los cinco mayores por `segundos`: 22.04, 3.90, 3.84, 0.93, 0.38). Los campos `incremento_rss_max_bytes` son aprox. 1.33–1.47 GB, pero la etiqueta parece corresponder a RSS máximo de proceso; no se interpreta como incremento aislado. No hay tiempo total de capítulo, K-means, evaluación, persistencia o ZIP registrado.

## MD-2

`md2_bitacora_pasos.csv` contiene 193 registros (94 operaciones `OK` cronometradas); suma de filas `OK`: 428.67 s, no tiempo total de notebook porque existen etapas no cronometradas/duplicadas y reutilización de pilotos. Cinco intervalos más largos: piloto `product_type_name` 1% FP-Growth 390.79 s (RSS 0.265 GiB en log), piloto 0.1% 7.03 s, conteo popularidad P99 6.57 s (1.309 GiB), preparación semanal 1% 2.10 s, preparación diaria 1% 1.90 s. Piloto article_id concluye `SIN_PATRONES_ELEGIBLES` en ~1.02 s por intento. El resumen comparativo muestra Apriori 11.04 s `ejecucion_nueva` y FP-Growth 390.79 s `piloto_reutilizado`: origen distinto, por tanto no comparar como benchmark pareado. No se encontró registro de timeout explícito.

## MD-3

Bitácora JSONL: 418 ajustes con campo de segundos; suma de ajustes 189.81 s; máximo de una fila 2.58 s. Top cinco filas individuales son refits SARIMA (`SARIMA_101_111_7` y `SARIMA_101_011_7`, aprox. 2.40–2.58 s). La tabla agregada de ajuste reporta hasta 18.73 s para candidato SARIMA, 1.69 s para el ETS más lento; el tiempo de cada fila de log no debe confundirse con el proceso SARIMA completo/búsqueda. No se registran fallos en las 418 filas ni cache hits. No se dispone de tiempo total de notebook, empaquetado ZIP o consumo global de memoria verificable.

## MD-4

No hay duración de modelamiento, inferencia, persistencia o exportación en un campo recuperable. Outputs muestran progreso de descarga/carga del modelo SBERT, 685 lotes, y shapes finales; no permiten convertir progreso a segundos. No se infiere memoria ni timeout.

## Lectura ASAP

El coste documentado dominante es el piloto FP-Growth de 1% en MD-2. Los outputs existentes reflejan caché/pilotos reutilizados en varias fases; no se suman como un tiempo de corrida completa. Para MD-1, MD-3 y MD-4 faltan tiempos integrales comparables.
