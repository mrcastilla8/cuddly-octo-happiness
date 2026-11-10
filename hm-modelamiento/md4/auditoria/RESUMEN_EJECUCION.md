# Resumen técnico de ejecución

## Dictamen

**Estado global: parcial.** Los registros declaran ejecución de las etapas principales de P01, P02 y P04, con reservas metodológicas. P03 está parcial porque las definiciones de varias tasas no han sido ratificadas. La evaluación humana PPS no está completada. El ZIP no incluye el notebook ni logs completos, así que no se pueden auditar celdas, warnings o excepciones directamente.

## Procedencia y entorno observado

- Fuente: `HM_MD4_Resultados.zip`; SHA-256 `5707af2559f8121314f3de21cbabec0a53281f23bcf4ac1325c6f145f21585e4`. Los 27 archivos del ZIP coinciden con los archivos extraídos disponibles.
- Runtime registrado: Linux 6.18.55+, glibc 2.39; Python 3.13.18.
- Bibliotecas registradas: NumPy 2.1.3, pandas 2.3.3, scikit-learn 1.6.1, statsmodels 0.15.0 y DuckDB 1.3.2. Fuente: `entrada_y_entorno.json` recibido e inventariado, cuyos hashes de fuentes impiden publicarlo íntegro.
- No consta versión de Sentence-Transformers, identificador/revisión del modelo SBERT, hardware, semilla ni especificación completa de hiperparámetros.
- No se recibieron notebook ni logs de ejecución. Errores, warnings y excepciones no pueden confirmarse ni descartarse. No se reportan experimentos reentrenados en esta preparación.

## Corpus, modelos y consultas

`evidencias/md4_auditoria_corpus.csv` registra 105,542 artículos, 416 descripciones imputadas, 43,779 descripciones limpias únicas, 94,047 textos NLP únicos y máximo 168 wordpieces. Ningún artículo excede 256 wordpieces.

- **TF-IDF:** cuatro variantes registradas en `md4_seleccion_tfidf.csv`; todas tienen TCC@10 = 1.0. La variante seleccionada es `TF_SW_2`, con entropía 0.9179560906. La semántica exacta de TCC y de la entropía requiere el diccionario metodológico.
- **LSA:** 100 dimensiones (varianza 0.30418; Jaccard 0.25511) y 200 (0.39881; 0.30904); 200 es la selección registrada.
- **Sentence-BERT:** el estado reporta embeddings con forma (105542, 384). El nombre y versión del modelo no constan. Los vectores completos (162,112,640 bytes) no se publican.
- **Consultas:** los archivos fuente registran 170 consultas de ajuste y 30 de holdout; sus IDs se excluyen por derivar del catálogo privado. El CSV Top-k contiene 3,600 filas con rankings para los modelos, regímenes y k registrados; ver distribución y definiciones en el CSV.
- **Sensibilidades:** 48 filas distribuidas entre configuraciones de hiperparámetros, exclusión de imputados, ponderación/textos únicos, corpus enriquecido, filtro de texto igual y estratos especiales. Hay 24 filas para M_ajuste y seis por cada estrato E1, E2, E3 y Q_retenido.

## Resultados observados

En los 150 vecinos del régimen `completo`, k=5, se registran 118 vecinos del mismo macrogrupo para TF-IDF (78.67%), 122 para LSA (81.33%) y 129 para SBERT (86.00%). Los conteos provienen de `md4_aporte_vs_jerarquia_conteos.csv`; las proporciones anteriores son división aritmética de esos conteos y el denominador publicado (150). Para los rankings k=5, la media del coseno listado es TF-IDF 0.5767, LSA 0.8823 y SBERT 0.9292; cálculo descriptivo sobre `md4_comparacion_topk_modelos.csv`, sin interpretación como métrica de calidad aprobada.

El solapamiento Jaccard@5 entre modelos en régimen completo promedia 0.1692 (TF-IDF–LSA), 0.2548 (TF-IDF–SBERT) y 0.2688 (LSA–SBERT), con 30 consultas por comparación (`md4_solapamiento_modelos.csv`).

## Estructura, PPS y límites

`md4_aporte_vs_jerarquia.csv` contiene tasas marcadas como propuestas pendientes de ratificación. `md4_diccionario_metricas.json` detalla las definiciones operacionales propuestas; no se presentan como métricas metodológicas aprobadas.

El universo PPS declarado es U=340 pares; la primera doble revisión planificada es n=102 (30%). `md4_concordancia_pps.csv` muestra n=102, pero acuerdo y Cohen's Kappa están vacíos y el estado es `PENDIENTE_REVISION_HUMANA`. El plan indica `PENDIENTE_CALIFICACION_HUMANA_REAL`; no hay evidencia de evaluaciones humanas completadas ni de arbitraje.

`md4_auditoria_entregables.json` reporta como faltante `md4_seleccion_hiperparametros.csv`, evaluación humana no realizada y definiciones de acrónimos pendientes. El ZIP no ofrece datos para comprobar pruebas omitidas adicionales. Rutas que respaldan cada afirmación: archivos listados en `README.md`, inventario y cobertura por prueba.
