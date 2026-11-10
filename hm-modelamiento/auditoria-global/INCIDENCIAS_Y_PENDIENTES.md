# Auditoría estructural de notebooks (JSON; sin ejecución)

## nb03-md1-segmentacion-modelo-y-evaluacion-sem12.ipynb
- Objetivo: MD-1; SHA-256 `b47fc4147fefeadf236103869c7d691909235fa6fac714a653917145c8b4d7ae`; 54323 bytes.
- Celdas Markdown: 15; código: 13; con execution_count: 13; outputs: 15; outputs de error: 0.
- Última celda ejecutada (índice base cero): 27; sección Semana 12: True; exportación ZIP: True.
- Error/traceback: ninguno.
- Publicación: publicado; ruta: hm-modelamiento/md1/notebook/nb03-md1-segmentacion-modelo-y-evaluacion-sem12.ipynb.

## nb03-md2-sem12-monitoreo-integral.ipynb
- Objetivo: MD-2; SHA-256 `6305ec7dd977679fdc18d71abcad42052cd0c64188534abcbca091d1a524f33e`; 129875 bytes.
- Celdas Markdown: 15; código: 14; con execution_count: 14; outputs: 48; outputs de error: 1.
- Última celda ejecutada (índice base cero): 28; sección Semana 12: True; exportación ZIP: True.
- Error/traceback: AttributeError: 'Pandas' object has no attribute 'consequent_support'.
- Publicación: publicado; ruta: hm-modelamiento/md2/notebook/nb03-md2-sem12-monitoreo-integral.ipynb.

## ../NB03_MD2_SEM12_MONITOREO_INTEGRAL.ipynb
- Objetivo: MD-2; SHA-256 `0abd60349dc26f562fceee45a22accfe3f2f058000f28889a64904c19b5fd994`; 77572 bytes.
- Celdas Markdown: 15; código: 13; con execution_count: 0; outputs: 0; outputs de error: 0.
- Última celda ejecutada (índice base cero): None; sección Semana 12: True; exportación ZIP: True.
- Error/traceback: ninguno.
- Publicación: excluido: notebook sin celdas ejecutadas; duplicado no es evidencia ejecutada; ruta: no publicada.

## nb03-md3-series-tiempo-modelo-y-evaluacion-sem12.ipynb
- Objetivo: MD-3; SHA-256 `5444768d8ae2d3e5e2c1def2a63d6131456dfd9b135a48a0f9c65c0893f3dd78`; 63953 bytes.
- Celdas Markdown: 14; código: 14; con execution_count: 14; outputs: 17; outputs de error: 0.
- Última celda ejecutada (índice base cero): 27; sección Semana 12: True; exportación ZIP: True.
- Error/traceback: ninguno.
- Publicación: ya publicado byte a byte; ruta: hm-modelamiento/md3/notebook/nb03-md3-series-tiempo-modelo-y-evaluacion-sem12.ipynb.

## nb03-md4-similitud-textual-modelo-y-evaluacion-sem.ipynb
- Objetivo: MD-4; SHA-256 `29a1f03d11ce7b7bd1a2f1618e0e585e585f23878bcb4bfc8b690030a19ae7a5`; 88479 bytes.
- Celdas Markdown: 15; código: 17; con execution_count: 17; outputs: 36; outputs de error: 0.
- Última celda ejecutada (índice base cero): 31; sección Semana 12: True; exportación ZIP: True.
- Error/traceback: ninguno.
- Publicación: publicado; ruta: hm-modelamiento/md4/notebook/nb03-md4-similitud-textual-modelo-y-evaluacion-sem.ipynb.

## Incidencias cruzadas

- MD-2: hay una celda de error guardado `AttributeError: 'Pandas' object has no attribute 'consequent_support'`. Outputs posteriores muestran recuperación secuencial de 5/20, 10/20, 15/20 y 20/20; ZIP contiene `md2_reglas_congeladas_test.csv`, `md2_control_popularidad_p99.csv`, `md2_resumen_prueba_final.json`; auditoría de entregables marca `completo_sin_fallos: true`. Documentar como fallo inicial recuperado en la misma sesión, sin borrar el traceback.
- Existe notebook MD-2 duplicado sin `execution_count` ni outputs: se excluye como no ejecutado.
- MD-4: el ZIP consigna `evaluacion_humana_real=false`, `PPS`/Kappa pendiente y fórmulas estructurales por ratificar; no declarar evaluación humana realizada.
- MD-3: tabla y artefactos nombran naive como selección; no se encontró objeto ETS/SARIMA guardado.
- Los inventarios fuente identifican múltiples datos/cache excluidos; el directorio del usuario conserva originales.

## Advertencias almacenadas en outputs

- MD-2: `FutureWarning` por el `fill_value` de `SparseDtype` y `DeprecationWarning` de `datetime.utcnow()` en el runtime; repetidos en varias celdas. El notebook también conserva una celda con error inicial MD2-P04, con outputs posteriores de recuperación descritos arriba.
- MD-3: `FutureWarning` de pandas para `DataFrameGroupBy.apply` sobre columnas de agrupación.
- MD-4: output dice autenticación Hugging Face anónima como advertencia no fatal; no se observa token/credencial en outputs.
- MD-1: no se detectaron warnings serializados relevantes.
