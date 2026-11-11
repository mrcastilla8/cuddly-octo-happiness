# Comparación antes/después — recuperación v2.1

## MD2-P01

| Momento | Fracción clientes | Cestas | Artículos elegibles | Itemsets/pares | Reglas | Cobertura | Soporte mínimo | Piso absoluto | Estado | Limitaciones |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| v2 artículo | 0,1% | 8.321 | 0 | 0 | 0 | 0% | 0,00005 | 30 | Sin patrones elegibles | Sin ítems frecuentes en la unidad cliente–día |
| v2 artículo | 0,01% | 792 | 0 | 0 | 0 | 0% | 0,00005 | 30 | Sin patrones elegibles | Piloto menor; no evidencia de reglas |
| v2.1 complementario | 1% | 81.660 | 886 | 18 pares | 30 dirigidas | 35,22% cestas con elegible; 17,17% de presencias elegibles | 0,00005 | 30 | Reglas de pares encontradas | Desarrollo solamente, pares de tamaño 2; 3% y 5% no ejecutados; sin persistencia fuera de muestra |

En v2.1 el soporte efectivo mínimo para pares fue max(30, ceil(0,00005×81.660))=30. Las reglas tienen soporte 0,000367–0,000894, confianza 0,20073–0,9375, lift 41,60–2.183,42. No mezclar con la corrida categórica del 1% (8.321 cestas, soporte categórico 0,0005) ni con la evaluación congelada del test.

## MD4

| Indicador | v2 anterior | Complemento v2.1 | Cambio documental |
|---|---|---|---|
| Pares únicos Q | 340 previstos/registrados | 340 reconstruidos | Diseño reproducido |
| Doble evaluación primera ronda | 102 previstos | 102 seleccionados/exportados | Hojas generadas; no implica revisión completada |
| Calificaciones humanas reales | 0 disponibles | 0 adjuntas | Sin cambio |
| PPS0/PPS1/PPS2 | No calculados | No calculados | Pendiente |
| Kappa | Vacío/NaN, n=102 planificados | null/NaN, n=102 planificados | Pendiente por falta de ratings |
| Desacuerdos/arbitrajes | No observables | No observables | No hay calificaciones que comparar |
| Métricas estructurales | Tabuladas con definiciones provisionales | 16 combinaciones verificadas; 48 identidades aritméticas verdaderas | Mejora de verificación interna |
| Ratificación semántica | Pendiente | Pendiente | Ninguna |
| Sensibilidades automáticas | Disponibles en v2 | No recalculadas | Se mantienen como evidencia automática, no PPS |

**Separación de cambios:** código: detección de entradas corregida para ZIP o carpetas y reconstrucción reproducible; nueva evidencia: salidas agregadas PPS y chequeos aritméticos; resultado científico nuevo: ninguno de pertinencia humana, acuerdo, Kappa o superioridad semántica. MD-2 sí aporta nueva observación exploratoria de reglas por artículo, sin evaluación fuera de muestra.
