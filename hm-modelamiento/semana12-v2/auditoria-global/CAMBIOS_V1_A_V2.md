# Comparación con la publicación anterior del PR

Referencia anterior: rama `feat/hm-md4-evidencias-kaggle`, commit base `8d12975cb6d8cff8b83e305a637f535253bbc4a5`; los archivos de esa versión permanecen en su ruta original. La comparación es de evidencia y estructura, no declara equivalencia directa entre ejecuciones.

| Objetivo | Antes (publicación Semana 12 anterior) | v2 observada | Diferencia/pendiente |
|---|---|---|---|
| MD-1 | Evidencias agregadas de k, ARI, sensibilidad y evaluación; el reporte global previo no encontraba modelos serializados. | Notebook común de 13 capítulos, pruebas visuales/resultados y ZIP privado con NPZ de centros + transformación. | Persistencia documentada añadida. Selección mantiene k=2 y K-means como preferencia; muestras/criterios deben contrastarse si se comparan CSVs como experimentos distintos. |
| MD-2 | El reporte previo registraba `AttributeError` en `consequent_support` y outputs de recuperación; P01-P04 se describían como evidencia pendiente de auditoría. | En notebook v2 no hay error/traceback ni ocurrencia textual de `consequent_support`; test por categoría completo, artefactos de reglas/soportes persistidos. | La incidencia de API parece corregida documentalmente. Piloto artículo continúa en cero itemsets elegibles y la evaluación global queda incompleta por ese subobjetivo. |
| MD-3 | Había evidencia de naive, 6 ETS, exploración SARIMA, selección naive y test rolling-origin; no había serializados reportados. | Se conserva el flujo de validación/test y se añaden PKL ETS/SARIMA y estado de baseline. | Persistencia nueva; separar los refits posteriores al scoring de test. La bitácora deja 418 ajustes/189.81 s y los diagnósticos residuales de ETS siguen siendo relevantes. |
| MD-4 | Existían varios notebooks/versiones y auditorías complementarias; se señalaban PPS/Kappa pendientes y fórmulas estructurales provisionales. Persistencia global anterior: sin matrices/modelos empaquetados. | Notebook con esqueleto común, TF-IDF/SVD, embeddings, SBERT local, indexación y arrays en ZIP privado; PPS sigue pendiente. | Nuevos artefactos privados de persistencia, sin cierre humano. Outputs top-k fila-a-fila se excluyen de la publicación v2; métricas jerárquicas se publican agregadas. |

## Cómo interpretar cambios

- La rama anterior se conserva; todo lo nuevo queda bajo `hm-modelamiento/semana12-v2/`. No se borró ni reemplazó evidencia previa.
- La comparación v1/v2 no permite atribuir diferencias de métricas a una corrección sin revisar muestras, splits, criterios y hashes. No se reescribieron resultados.
- Experimentos disponibles ahora incluyen evidencia explícita de persistencia/recarga por objetivo y una matriz de 16 pruebas alineada a P01–P04.
- Sin equivalencia se marcan: cambios de tamaño de muestra, selección, métricas o cobertura que no pueden emparejarse por clave experimental entre las dos ejecuciones.
