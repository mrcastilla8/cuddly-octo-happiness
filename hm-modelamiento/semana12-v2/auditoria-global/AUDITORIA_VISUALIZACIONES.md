# Auditoría de visualizaciones — v2

“Inline” significa que el JSON contiene una salida `image/png`/HTML en la celda indicada. Las PNG seleccionadas también existen en `evidencias/`; se verificó el miembro original en ZIP y su copia publicada. CSV/JSON externos no cuentan como tabla presentada salvo que el output del notebook muestre tabla.

| MD | Celda(s) con EDA | Celda(s) con resultados/evaluación | Tablas inline | Figuras inline visibles | Evidencia externa adicional |
|---|---|---|---|---|---|
| MD-1 | 10: resumen RFM y 3 distribuciones | 25: comparación k/ARI, test, perfiles, sensibilidad; 27/35: decisión y cierre | selección, evaluación test, perfiles y sensibilidad en 25 | EDA cell 10; 4 gráficos de evaluación/perfiles en 25 | CSV de selección/ARI, test, perfiles y sensibilidad; PNG en `md1/evidencias/` |
| MD-2 | 10: frecuencia categorías y gráfico | 22: comparación, sensibilidad/estabilidad, test y pilotos | tablas de algoritmos, sensibilidad, remuestreo, reglas test y piloto | EDA cell 10; 3 gráficos en 22 | CSV de reglas/test/P99/cestas/umbrales; PNG en `md2/evidencias/` |
| MD-3 | 10: descripción/canales y serie | 26: métricas validación/test, sensibilidades y diagnósticos | tablas comparativas, candidatos, sensibilidad y residuos | EDA cell 10; 4 figuras en 26 | pronósticos, AICc, métricas por origen/test y residuos CSV/PNG |
| MD-4 | 10: auditoría agregada de corpus y gráfico | 32: hiperparámetros, estructura, solapamiento, sensibilidad y PPS | 20 vistas tabulares registradas; entre ellas selección, métricas estructurales y concordancia | EDA cell 10; 3 gráficos de evaluación en 32 | CSV/JSON agregados y gráficos en `md4/evidencias/`; PPS/Kappa está NaN/pending |

## Interpretación de presentación

Las figuras evaluativas se muestran dentro de los notebooks y se guardan en PNG; tablas clave se muestran como salidas HTML, y algunas se exportan también a CSV. Los archivos publicados son una selección, no todo el contenido de ZIP. MD-2 tiene evidencia visual de métricas pero el piloto article_id no produce patrones. MD-4 incluye visualizaciones automáticas, pero no una evaluación humana final; las etiquetas de tasas estructurales siguen sujetas a ratificación. Esta auditoría registra los elementos y sus reservas, sin asignar calificación de presentación.
