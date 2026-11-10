# Resumen técnico de ejecución

## Dictamen

**Notebook: ejecución guardada completa. Evaluación del proyecto: parcial.** El notebook suplementario registra ejecución de sus 16/16 celdas de código, 41 bloques de salida y cero errores de celda. Los resultados declaran P01 completada, pero P03 está parcial por definiciones estructurales pendientes y la evaluación humana PPS/Kappa no está completada. No se recibió un log de consola independiente.

## Procedencia y entorno observado

- Resultados: `HM_MD4_Resultados.zip`, SHA-256 `5707af2559f8121314f3de21cbabec0a53281f23bcf4ac1325c6f145f21585e4`; contiene 27 archivos, todos cotejados con la carpeta extraída.
- Notebook suplementario: [`notebook/nb03-md4-similitud-textual.ipynb`](../notebook/nb03-md4-similitud-textual.ipynb), SHA-256 `96c257f48f21c412f16575c6ff03146f936db3ace04d4266ae5034e74e186acd`. Se recibió después del ZIP. Contiene 29 celdas (16 de código), 16 contadores de ejecución (secuencia 1–8 y 10–17), 41 salidas y ningún output de error.
- Runtime registrado: Linux 6.18.55+, glibc 2.39; Python 3.13.18. Paquetes registrados en la evidencia de entorno original: NumPy 2.1.3, pandas 2.3.3, scikit-learn 1.6.1, statsmodels 0.15.0 y DuckDB 1.3.2. Sentence-Transformers/Transformers no tienen versión consignada.
- El notebook registra Sentence-BERT `sentence-transformers/all-MiniLM-L6-v2`, ejecutado en CPU, con embeddings de forma (105542, 384). No consta hardware GPU utilizado.
- Se observa una advertencia de Hugging Face Hub por solicitud no autenticada y límites de descarga; la descarga/modelado continúa y la celda termina con PASS. No hay excepciones ni errores de celda guardados.

## Corpus, modelos y consultas

`evidencias/md4_auditoria_corpus.csv` registra 105,542 artículos, 416 descripciones imputadas, 43,779 descripciones limpias únicas, 94,047 textos NLP únicos y máximo 168 wordpieces. Ningún artículo excede 256 wordpieces.

- **TF-IDF:** cuatro variantes registradas en `md4_seleccion_tfidf.csv`; todas tienen TCC@10 = 1.0. La variante seleccionada es `TF_SW_2`, con entropía 0.9179560906.
- **LSA:** se comparan 100 dimensiones (varianza 0.30418; Jaccard 0.25511) y 200 (0.39881; 0.30904); 200 es la selección registrada.
- **Sentence-BERT:** se ejecuta `all-MiniLM-L6-v2` y se guardan embeddings de forma (105542, 384). Los vectores completos (162,112,640 bytes) no se publican.
- **Consultas:** 170 de ajuste/selección y 30 retenidas (holdout); sus listas de IDs no se publican por derivar del catálogo privado. La tabla Top-k publicada contiene 3,600 filas de rankings.
- **Sensibilidades:** 48 filas entre configuraciones TF-IDF, exclusión de imputados, textos únicos, corpus enriquecido, filtro de texto igual y estratos especiales; 24 filas corresponden a M_ajuste y seis a cada estrato E1, E2, E3 y Q_retenido.

## Resultados observados

En los 150 vecinos del régimen `completo`, k=5, hay 118 vecinos del mismo macrogrupo para TF-IDF (78.67%), 122 para LSA (81.33%) y 129 para SBERT (86.00%). Los conteos provienen de `md4_aporte_vs_jerarquia_conteos.csv`; los porcentajes son divisiones descriptivas sobre 150, no métricas metodológicas aprobadas.

Para el ranking k=5, la media del coseno registrado es TF-IDF 0.5767, LSA 0.8823 y SBERT 0.9292; cálculo descriptivo en `md4_comparacion_topk_modelos.csv`, sin interpretarlo como evaluación de calidad humana. El solapamiento Jaccard@5 en régimen completo promedia 0.1692 (TF-IDF–LSA), 0.2548 (TF-IDF–SBERT) y 0.2688 (LSA–SBERT), con 30 consultas por comparación (`md4_solapamiento_modelos.csv`).

## Estructura, PPS y límites

`md4_aporte_vs_jerarquia.csv` contiene tasas marcadas como propuestas pendientes de ratificación; `md4_diccionario_metricas.json` detalla sus definiciones operacionales propuestas. No se presentan como métricas aprobadas.

El universo PPS es U=340 pares; la primera doble revisión planificada es n=102 (30%). `md4_concordancia_pps.csv` muestra n=102, pero acuerdo y Cohen's Kappa están vacíos y el estado es `PENDIENTE_REVISION_HUMANA`. El plan declara `PENDIENTE_CALIFICACION_HUMANA_REAL`; no hay evidencia de evaluaciones humanas completadas ni arbitraje.

`md4_auditoria_entregables.json` reporta faltante `md4_seleccion_hiperparametros.csv`, evaluación humana no realizada y definiciones de acrónimos pendientes. El notebook y los resultados respaldan las afirmaciones enumeradas; rutas completas por prueba en `COBERTURA_PRUEBAS.md`.
