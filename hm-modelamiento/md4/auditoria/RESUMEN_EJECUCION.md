# Resumen técnico de ejecución

## Dictamen

**Notebook: ejecución guardada completa. Evaluación del proyecto: parcial.** El notebook suplementario registra ejecución de sus 16/16 celdas de código, 41 bloques de salida y cero errores de celda. Los resultados declaran P01 completada, pero P03 está parcial por definiciones estructurales pendientes y la evaluación humana PPS/Kappa no está completada. No se recibió un log de consola independiente.

## Procedencia y entorno observado

- Resultados: `HM_MD4_Resultados.zip`, SHA-256 `5707af2559f8121314f3de21cbabec0a53281f23bcf4ac1325c6f145f21585e4`; contiene 27 archivos, todos cotejados con la carpeta extraída.
- Notebook suplementario: [`notebook/nb03-md4-similitud-textual.ipynb`](../notebook/nb03-md4-similitud-textual.ipynb), SHA-256 `96c257f48f21c412f16575c6ff03146f936db3ace04d4266ae5034e74e186acd`. Se recibió después del ZIP. Contiene 29 celdas (16 de código), 16 contadores de ejecución (secuencia 1–8 y 10–17), 41 salidas y ningún output de error.
- Runtime registrado: Linux 6.18.55+, glibc 2.39; Python 3.13.18. Paquetes registrados en el entorno original: NumPy 2.1.3, pandas 2.3.3, scikit-learn 1.6.1, statsmodels 0.15.0 y DuckDB 1.3.2. El registro inicial omitía Sentence-Transformers/Transformers; H08 complementa sus versiones abajo.
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

El registro histórico `md4_auditoria_entregables.json` reportó faltante `md4_seleccion_hiperparametros.csv`; la tabla se añadió en la revisión complementaria. El mismo registro mantiene evaluación humana no realizada y definiciones de acrónimos pendientes. El notebook y los resultados respaldan las afirmaciones enumeradas; rutas completas por prueba en `COBERTURA_PRUEBAS.md`.


## Revisión complementaria (2026-11-10)

La auditoría complementaria se añadió como nueva evidencia; no reemplaza los archivos históricos. El ZIP `MD4_Revision_Complementaria.zip` tiene SHA-256 `48cfc4ff32b576c8aab9b40c59a127186370b821ea6cb892d34e0dcc38f9db1d` y aporta nueve archivos. Su notebook actualizado (`notebook/nb03-md4-similitud-textual-revision-complementaria.ipynb`) tiene SHA-256 `502ee98a06fdf544996b64dba8c50558b16a90ec1c2a30de33afd70dab7aa016`, 17/17 celdas de código ejecutadas, 43 outputs y cero errores de celda. La comparación con el notebook histórico confirma que las celdas y outputs previos no cambiaron; se agregó una sola celda al final.

- **Corrección documentada:** `md4_seleccion_hiperparametros.csv` complementa el faltante reportado en `md4_auditoria_entregables.json` del corte histórico. Registra seis configuraciones; TF-IDF seleccionado `TF_SW_2` y LSA `LSA_200`. Se conserva intacto el reporte histórico que decía que faltaba.
- **Control de equivalencia (H05):** ocho productos Gram cruzados; estado PASS y error absoluto máximo `8.881784197001252e-16` en `md4_equivalencia_gram_cruzada.csv`. Es una verificación numérica auxiliar, no una evaluación de calidad de recomendaciones.
- **Sensibilidad LSA adicional (H04):** ajuste sobre originales sin imputados, 170 consultas. Jaccard vs. ranking principal 0.9182073 para k=5 y 0.8946008 para k=10. Las tasas TCMG/TCTipo que acompaña el archivo son explícitamente propuestas, no ratificadas. El CSV consolidado tiene las 48 filas históricas más estas dos filas; `evidencias/md4_sensibilidad_corpus.csv` queda sin cambios.
- **Modelo/entorno (H08):** se confirma desde caché `sentence-transformers/all-MiniLM-L6-v2`, revisión `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, CPU. Versiones: NumPy 2.1.3, pandas 2.3.3, scikit-learn 1.6.1, SciPy 1.16.3, sentence-transformers 5.7.0, Transformers 5.20.2, huggingface-hub 1.33.0 y torch 2.11.0+cpu. Fuente: `evidencias/revision_complementaria/md4_entorno_modelo_complementario.json`.
- **Bitácora (H06):** se detecta `MD4-P02 / seleccion_lsa` dos veces. Se registra como diagnóstico; no se edita el histórico ni se atribuye a una segunda experimentación distinta.
- **PPS (H03):** continúa `PENDIENTE_REVISION_HUMANA`; la celda no encuentra `md4_pps_evaluaciones.csv`. No hay calificaciones humanas, arbitraje ni Cohen's Kappa disponible.
- **Gráficos (H07):** dos figuras generadas desde rankings existentes; no se recalcularon embeddings ni se reentrenaron modelos.

El resumen de estados H01/H03–H08 está en `evidencias/revision_complementaria/md4_resumen_controles.json`. P03 y P04 conservan reserva por las definiciones estructurales propuestas; la evidencia adicional no las convierte en métricas aprobadas.
