# Guía de auditoría para ChatGPT

## Orden de revisión

1. Abrir [`MATRIZ_16_PRUEBAS.md`](MATRIZ_16_PRUEBAS.md) y confirmar qué subpruebas están completas, parciales o pendientes.
2. Abrir el informe estructural y revisar cada notebook publicado en `md1/notebook/`…`md4/notebook/`. Las celdas y outputs guardados son evidencia de una corrida, no una corrida repetida.
3. Para cada prueba, contrastar el notebook con los CSV/JSON vinculados en `mdN/auditoria/COBERTURA_PRUEBAS.md`. Priorizar conteos, particiones, denominadores, tabla de métricas y artefactos fuente.
4. Para los gráficos, verificar la celda inline y distinguirla de PNG/CSV externos mediante `AUDITORIA_VISUALIZACIONES.md`.
5. Revisar `PERSISTENCIA_MODELOS_V2.md`; distinguir objeto privado presente, manifiesto/hash y prueba documental de reload de una inferencia independiente. No cargar pickle/joblib desconocidos.
6. Revisar tiempos en `RENDIMIENTO_EJECUCION.md`; no sumar duraciones reutilizadas como si fueran la corrida completa.
7. Antes de concluir, revisar `INCIDENCIAS_Y_PENDIENTES.md` y contrastar con la evidencia publicada de la versión anterior en el historial del PR.

## Preguntas científicas sugeridas

- ¿Métricas e invariantes coinciden con filas de respaldo, tamaños muestrales y split descritos?
- ¿La selección se basó únicamente en train/validación y se congeló antes del test?
- MD-1: ¿silueta, ARI, tamaños de grupo y reglas de elegibilidad justifican k/método elegidos?
- MD-2: ¿el soporte absoluto y relativo, cestas vacías, test completo y popularidad P99 están definidos correctamente? ¿Qué implica cobertura cero en `article_id`?
- MD-3: ¿MAE/RMSE, AICc, horizontes y diagnósticos residuales son comparables y suficientes?
- MD-4: ¿las medidas top-k están bien definidas y hay evaluación humana/PPS reproducible? Tratar Kappa NaN como pendiente.
- ¿Qué afirmaciones de los cierres exceden la evidencia guardada? ¿Qué visuales y explicaciones faltan para la exposición?

## Límites del paquete

Los ZIP privados, los modelos binarios, embeddings completos, índices fila/artículo y revisiones PPS de fila están omitidos de la publicación pública. Inventario técnico y hashes aparecen en `INVENTARIO_COMPLETO_V2.csv`; la verificación de carga/inferencia no puede hacerse leyendo hashes. No emitir una calificación final sin revisar visualmente los notebooks y sus tablas.
