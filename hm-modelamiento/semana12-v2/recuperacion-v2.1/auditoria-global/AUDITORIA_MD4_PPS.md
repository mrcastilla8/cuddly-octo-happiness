# Auditoría documental MD4 — PPS y métricas estructurales

## Ejecución y reutilización

El notebook local final `md4-pps-y-metricas-sin-reentrenar.ipynb` (celda de detección corregida para ZIP o carpetas descomprimidas) tiene 13 celdas: las 6 de código se ejecutaron secuencialmente con conteos 3–8. No hay outputs de error ni traceback. La fuente resolvió la evidencia existente desde `/kaggle/working/MD4_PPS_Complemento/evidencias_entrada_minima.zip`, encontró `md4_posiciones_pps.csv`, `md4_comparacion_topk_modelos.csv`, `md4_aporte_vs_jerarquia.csv` y `md4_diccionario_metricas.json`: 3.600 filas de rankings y 450 posiciones PPS. Usó catálogo disponible con contexto para 105.542 artículos. Registró `Modelos privados: None`; no cargó pesos ni embeddings. El notebook declara que no recalculó embeddings ni ajustó modelos.

## PPS y Kappa

Se recuperaron los 340 pares Q únicos definidos por el protocolo. La primera ronda selecciona 102 pares (30%) para doble evaluación; se exportaron hojas de trabajo/plantillas. Hay **0 calificaciones humanas reales** adjuntas. PPS0/PPS1/PPS2 no se calcularon. Cohen's Kappa está vacío/`null` (`NaN` en la tabla de salida), con estado `PENDIENTE_REVISION_HUMANA`; no hay desacuerdos observados ni arbitrajes que puedan resolverse porque no hay ratings. Una segunda ronda disjunta de 102 pares quedó preparada condicionalmente, no realizada. El estado agregado publicado: [JSON](../md4-pps/evidencias/md4_estado_complementario.json) y [concordancia](../md4-pps/evidencias/md4_concordancia_pps_complementaria.csv).

## Métricas estructurales

La ejecución comprobó aritméticamente las tres identidades en 16 combinaciones modelo/régimen/k: TCMG+TDIG=TCC, TCTipo+TDIT=TCC y TCC=recuperados/D. Las 48 comprobaciones son verdaderas. Esto verifica consistencia interna de las expresiones con los datos tabulados; las fórmulas y el sentido de los acrónimos siguen **propuestos**, no ratificados semánticamente por el curso/equipo. Véase [verificación agregada](../md4-pps/evidencias/md4_verificacion_formulas_propuestas.csv) y [fórmulas propuestas](../md4-pps/evidencias/FORMULAS_MD4_PARA_RATIFICACION.md).

## Visibilidad, entregables y cierre

El notebook muestra tablas para pares/rankings y métricas, la tabla de concordancia vacía/NaN y texto explícito de evaluación pendiente. No se produjo gráfico de resultados PPS reales por falta de ratings; sí se generó ZIP pequeño de evidencias agregadas y ZIP privado de plantillas. Las plantillas tienen descripciones/pares identificables y permanecen excluidas. No se cierra MD4-P02 (falta juicio humano y Kappa), P03 (falta ratificación semántica, aunque se comprobaron identidades aritméticas) ni P04 (sensibilidades automáticas previas siguen sin evaluación humana de pertinencia). Evidencia adecuada para revisión documental; no equivale a evaluación terminada.

El estado v2 anterior ya indicaba 340 pares, 102 doble revisión, Kappa NaN y PPS pendiente en `../../md4/evidencias/md4_plan_revision_humana.json` y `md4_concordancia_pps.csv`; el complemento confirma/reconstruye el diseño y añade una comprobación aritmética explícita.
