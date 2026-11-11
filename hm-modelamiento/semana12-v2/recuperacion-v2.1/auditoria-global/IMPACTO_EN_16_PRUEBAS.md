# Impacto documental en las 16 pruebas

Matriz complementaria; la matriz v2 [`../../auditoria-global/MATRIZ_16_PRUEBAS.md`](../../auditoria-global/MATRIZ_16_PRUEBAS.md) permanece intacta. “Revisión científica” indica que hay material auditable para revisión, no aprobación. No se asignan notas.

| MD | Prueba | Estado anterior | Nueva evidencia | Qué cambió | Pendiente | ¿Material para revisión científica? | Ejecución adicional requerida |
|---|---|---|---|---|---|---|---|
| MD-1 | P01 PAM piloto/selección k | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-1 | P02 estabilidad | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-1 | P03 sensibilidad RFM | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-1 | P04 evaluación/perfiles | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-2 | P01 Apriori/FP-Growth y piloto artículo | Parcial | Muestra 1% desarrollo: 886 ítems elegibles, 18 pares, 30 reglas dirigidas | Factibilidad de pares observada a escala mayor | Reglas solo tamaño 2, IDs omitidos, 3/5% no probadas; persistencia no medida | Sí, agregado con limitación de detalle | Solo si se desea cierre por reglas completas/validación temporal |
| MD-2 | P02 umbrales/robustez | Documentada | Ninguna | Sin cambio; no se recalculó | Conclusión v2 sujeta a revisión | Sí, v2 | No por recuperación |
| MD-2 | P03 diaria/semanal/fronteras | Documentada | Ninguna | Sin cambio | Conclusión v2 | Sí, v2 | No por recuperación |
| MD-2 | P04 reglas congeladas/test/P99 | Documentada | Ninguna | Sin cambio | Conclusión v2 | Sí, v2 | No por recuperación |
| MD-3 | P01 baseline | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-3 | P02 ETS/SARIMA/rolling | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-3 | P03 pronósticos/test | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-3 | P04 sensibilidades/residuos | Documentada | Ninguna | Sin cambio | Limitación residual ETS ya informada | Sí, v2 | No por recuperación |
| MD-4 | P01 corpus/tokenizer | Documentada | Ninguna | Sin cambio | Ninguno nuevo | Sí, v2 | No por recuperación |
| MD-4 | P02 rankings y pertinencia | Parcial | 340 pares Q reconstruidos, 102 doble revisión listos, sin calificaciones | Diseño/insumos reproducidos | PPS0/1/2, Kappa, acuerdos y superioridad humana pendientes | Sí, para auditar protocolo; no para conclusión humana | Sí: evaluación humana genuina y análisis posterior |
| MD-4 | P03 métricas estructurales | Parcial | 48 identidades aritméticas verdaderas en 16 casos | Comprobación interna agregada añadida | Ratificación semántica de fórmulas y acrónimos | Sí, para revisar definiciones/procedimiento | Ratificación escrita; cálculo posterior solo si se redefinen |
| MD-4 | P04 sensibilidad/pertinencia | Parcial | Sin recalcular sensibilidad; plantilla PPS creada | Sin cambio científico | Juicio humano PPS y robustez de pertinencia | Sí, automático en v2; pertinencia aún no | Sí: ratings genuinos para pertinencia |

El complemento no requiere reejecutar los modelos para que ChatGPT audite las evidencias agregadas. Una evaluación humana posterior requiere completar hojas privadas y aportar resultados agregados de forma autorizada; no se inventaron ni publicaron calificaciones.
