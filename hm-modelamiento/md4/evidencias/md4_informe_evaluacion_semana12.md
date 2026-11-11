# MD-4 — evaluación Semana 12

Se modelaron representaciones TF-IDF, LSA y Sentence-BERT y se evaluaron rankings retenidos, cobertura y sensibilidad.
Las proporciones de pertenencia a categoría son controles estructurales, no sustituyen la pertinencia humana.

## Cobertura
- **MD4-P01 / corpus y truncamiento WordPieces**: PASS (`md4_auditoria_corpus.csv; md4_tokenizador.json`).
- **MD4-P02 / cuatro TF-IDF y dos LSA evaluados en ajuste**: PASS (`md4_seleccion_tfidf.csv; md4_seleccion_lsa.csv`).
- **MD4-P02 / hiperparámetros consolidados y congelados**: PASS (`md4_seleccion_hiperparametros.csv`).
- **MD4-P02 / rankings top-5/10 y variantes**: PASS (`md4_comparacion_topk_modelos.csv`).
- **MD4-P03 / conteos estructurales auditables**: PASS (`md4_aporte_vs_jerarquia.csv; definiciones provisionales por ratificar`).
- **MD4-P04 / sensibilidad y estratos especiales completos**: PASS (`md4_sensibilidad_corpus.csv; revisión complementaria si existe`).
- **MD4-P02/P03 / PPS reales, dos evaluadores, Kappa y robustez de mejora**: PENDIENTE (`md4_pps_resultados_reales.csv; md4_concordancia_pps.csv; md4_criterio_pps_por_regimen.csv`).

## Comparación automática
- LSA: cobertura top-5=150/150; mismo tipo=0.540 (**definición propuesta**).
- SBERT: cobertura top-5=150/150; mismo tipo=0.660 (**definición propuesta**).
- TFIDF: cobertura top-5=150/150; mismo tipo=0.500 (**definición propuesta**).
- **No hay conclusión de superioridad semántica humana**: falta calificación PPS real, Kappa o evaluación de variantes.

## Restricciones
- Nunca se asignan puntajes humanos ficticios ni se declara un modelo ganador sin PPS.
- No usar holdout para ajustar ngramas, stopwords, dimensión LSA o seleccionar modelos.
- Fórmulas TCT, TCMG, TDIG, TCTipo y TDIT deben ratificarse antes de presentarlas como indicadores aprobados.

## Evidencias
- `md4_cobertura_semana12.csv`, `md4_invariantes_evaluacion.csv`, gráficos y rankings/controles previos.
- La hoja PPS puede completarse y reimportarse en una nueva ejecución del mismo notebook; las puntuaciones deben ser reales.
