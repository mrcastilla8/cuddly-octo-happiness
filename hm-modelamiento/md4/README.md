# MD-4 — similitud textual y semántica de productos

Evidencias exportadas de una ejecución de Kaggle del proyecto H&M Personalized Fashion Recommendations (Grupo 2, UNMSM). Este paquete facilita una auditoría de resultados; no incluye el dataset fuente ni vuelve a entrenar modelos.

## Navegación

- [Notebook MD-4 ejecutado (copia recibida posteriormente)](notebook/nb03-md4-similitud-textual.ipynb)
- [Resumen técnico de ejecución](auditoria/RESUMEN_EJECUCION.md)
- [Cobertura MD4-P01 a MD4-P04](auditoria/COBERTURA_PRUEBAS.md)
- [Inventario íntegro: 27 archivos del ZIP y 1 notebook suplementario](auditoria/INVENTARIO_COMPLETO.csv)
- [Manifiesto de procedencia y publicación](auditoria/MANIFIESTO.json)
- [Artefactos no publicados y cómo auditarlos](auditoria/ARTEFACTOS_NO_PUBLICADOS.md)

## Evidencias principales

- [Estados de ejecución](evidencias/estado_experimentos.csv)
- [Rankings Top-k TF-IDF, LSA y SBERT](evidencias/md4_comparacion_topk_modelos.csv)
- [Auditoría agregada del corpus](evidencias/md4_auditoria_corpus.csv)
- [Selección TF-IDF y LSA](evidencias/md4_seleccion_tfidf.csv), [LSA](evidencias/md4_seleccion_lsa.csv)
- [Conteos jerárquicos](evidencias/md4_aporte_vs_jerarquia_conteos.csv) y [tasas propuestas](evidencias/md4_aporte_vs_jerarquia.csv)
- [Sensibilidades](evidencias/md4_sensibilidad_corpus.csv), [resumen de sensibilidad](evidencias/md4_sensibilidad_resumen.json), [solapamiento de rankings](evidencias/md4_solapamiento_modelos.csv)
- [Estado PPS/Kappa](evidencias/md4_concordancia_pps.csv) y [plan de revisión humana](evidencias/md4_plan_revision_humana.json)
- [Diccionario de métricas](evidencias/md4_diccionario_metricas.json), [auditoría de entregables](evidencias/md4_auditoria_entregables.json), [auditoría de tokens](evidencias/md4_tokenizador.json)

El ZIP inicial no incluía notebook. Después se recibió y añadió la copia ejecutada enlazada arriba (SHA-256 en el manifiesto e inventario): las 16 celdas de código tienen contador de ejecución, hay 41 salidas y no hay errores de celda. Esto acredita la ejecución guardada, aunque el estado global del proyecto sigue parcial por PPS/Kappa pendiente y definiciones estructurales provisionales. No se publican listas de consultas ni plantillas de evaluación que contienen identificadores y descripciones del catálogo privado. Los 27 CSV/JSON de resultados conservan sus bytes originales; el notebook se conserva byte a byte desde su archivo suplementario.
