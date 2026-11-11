# MD-3 — resumen de ejecución v2

Notebook fuente: [`MD3_COMPLETA_v2.ipynb`](../notebook/MD3_COMPLETA_v2.ipynb); SHA-256 inventariado en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv). No se ejecutó el notebook en esta auditoría.

- Estado declarado por artefactos: `EVALUADO`.
- Celdas: 37 (14 Markdown, 23 código); celdas de código con contador: 23/23.
- Outputs guardados: 46; salidas de error/traceback en tipo `error`: 0.
- Gráficas raster visibles: 5; tablas HTML visibles: 5.
- Última celda ejecutada: celda 36 / contador 23.
- Resultados clave: Validación rolling-origin: 15 orígenes × horizonte 7, 6 ETS y búsqueda SARIMA con AICc; tablas de MAE/RMSE por modelo y origen. Test retenido: 15 ventanas y métricas publicadas.
- Interpretación observada: La baseline congelada está documentada como naive. No se ve selección retrospectiva a partir del test; el test evalúa los finalistas ya fijados. Diagnósticos residuales muestran autocorrelación para ETS (Ljung–Box p<0.01 a lags 7/14/21); SARIMA no rechaza a esos lags según tabla.

Los contadores y outputs guardados prueban que el archivo contiene resultados de una ejecución, pero no son una repetición independiente de la ejecución. Revisar cobertura y visualizaciones con [`COBERTURA_PRUEBAS.md`](COBERTURA_PRUEBAS.md) y el informe global.
