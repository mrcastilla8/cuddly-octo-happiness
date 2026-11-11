# Auditoría estructural de notebooks — v2

Se analizaron los cuatro JSON `.ipynb` de forma estática; no se ejecutó código experimental.

| Notebook | Celdas | Markdown | Código | Código con contador | Outputs | Tablas HTML visibles | Imágenes inline | Error output/traceback | Último contador |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| MD-1 | 36 | 14 | 22 | 22/22 | 43 | 5 | 5 | 0 | celda 35 / 22 |
| MD-2 | 33 | 15 | 18 | 18/18 | 81 | 6 | 4 | 0 | celda 32 / 18 |
| MD-3 | 37 | 14 | 23 | 23/23 | 46 | 5 | 5 | 0 | celda 36 / 23 |
| MD-4 | 43 | 14 | 29 | 29/29 | 76 | 20 | 4 | 0 | celda 42 / 29 |

## Esqueleto común

Los cuatro contienen las mismas 13 secciones numeradas: planteamiento; entorno; carga/validación; exploración; diseño experimental; preparación; modelamiento; evaluación; validación final; interpretación; persistencia; auditoría/exportación; conclusiones. Cada notebook también tiene título y subtítulo, por eso el recuento total de headings H1–H3 es 15 (título/subtítulo más 13 secciones). MD-4 tiene más celdas internas en modelamiento/evaluación, sin cambiar la secuencia común.

Todas las celdas de código tienen contador y outputs guardados. No hay objetos de salida de tipo `error`/traceback en los JSON; la auditoría de texto tampoco encontró `consequent_support` en source/output de MD-2 v2. Eso no prueba que la celda produjo resultados científicamente correctos: se cotejaron los outputs con CSV/JSON/estado y se señalan diferencias o reservas en informes particulares. No se encontró celda de código sin contador.

## Interpretación y código sin ejecución

No aparecen celdas de código sin contador. Hay texto de alcance/limitaciones escrito de forma estática y salidas de Markdown/tablas para interpretación resultante. MD-1 deriva decisión desde sus JSON de resultado; MD-2/MD-3/MD-4 presentan resultados y cierres con diferentes reservas. Ver [`AUDITORIA_VISUALIZACIONES.md`](AUDITORIA_VISUALIZACIONES.md) para diferenciar figuras y tablas inline de ficheros externos.
