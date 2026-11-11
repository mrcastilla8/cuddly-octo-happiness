# Incidencias y pendientes — Semana 12 v2

1. **MD-2 `article_id`: pendiente funcional.** Dos pilotos con 0 elementos/itemsets elegibles y cobertura cero. El resultado delimita la insuficiencia de esos umbrales/muestras; no demuestra que no existan asociaciones a escala/diseño diferente. No marcar como ejecución exitosa del subobjetivo.
2. **MD-2 tiempos no pareados.** La comparación usa Apriori medido en ejecución nueva vs FP-Growth reutilizado; no permite concluir que uno sea más rápido. El error histórico `consequent_support` no reaparece en source/output v2 ni hay traceback almacenado.
3. **MD-3 diagnósticos residuales.** ETS mantiene autocorrelación según Ljung–Box en lags 7/14/21; discutir suficiencia del modelo y las reservas de pronóstico. Baseline naive está congelada; outputs no muestran test para seleccionar modelo.
4. **MD-4 revisión humana incompleta.** PPS no calculada. Kappa/acuerdo NaN para n=102 con estado `PENDIENTE_REVISION_HUMANA`. No presentar esto como validación humana.
5. **MD-4 definiciones.** Varias tasas estructurales se etiquetan como propuestas y sujetas a ratificación de fórmula; no interpretar comparaciones como validadas hasta acordar denominadores.
6. **Persistencia.** Metadata/manifiestos contienen hashes y hay pruebas roundtrip en source, pero no se cargaron binarios durante la auditoría. Falta pin de versiones/dependencias para reproducción fuera de Kaggle y los ZIP privados no se publican.
7. **Tiempos.** No se puede reconstruir duración total para MD-1/3/4 ni para empaquetado; evitar tiempos supuestos.
8. **Publicación segura.** Se excluyen ZIP completos, pesos/modelos, embeddings, índice catálogo artículo-texto, archivos de filas/revisión PPS y cualquier cache/privado. Ver informes de no publicación por MD.

La auditoría no propone ni implementa correcciones experimentales.
