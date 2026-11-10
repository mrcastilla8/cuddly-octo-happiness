# Guía de auditoría científica final

1. Verificar primero la matriz y evidencias originales v2 en [`../../auditoria-global/MATRIZ_16_PRUEBAS.md`](../../auditoria-global/MATRIZ_16_PRUEBAS.md); sus 127 archivos no se duplican.
2. Leer [comparación antes/después](COMPARACION_ANTES_DESPUES.md), [auditoría MD2](AUDITORIA_MD2_P01.md) y [auditoría MD4](AUDITORIA_MD4_PPS.md).
3. Para MD2, separar la factibilidad exploratoria (1%, 81.660 cestas, 18 pares, 30 reglas) de persistencia/test y de minería completa. La tabla de reglas con IDs se mantuvo privada; examinar la prudencia del lift y limitación de cobertura usando solo agregados disponibles.
4. Para MD4, distinguir 340 pares reconstruidos/102 asignados a doble revisión de 0 ratings humanos. Kappa vacío/NaN significa pendiente. No inferir PPS a partir de tipos/categorías.
5. Las identidades aritméticas MD4 prueban consistencia algebraica de fórmulas propuestas; comprobar aparte su significado, nombres y denominadores con la documentación metodológica.
6. Usar [impacto en las 16 pruebas](IMPACTO_EN_16_PRUEBAS.md) como índice complementario, no como nota ni aprobación. Consultar [pendientes](INCIDENCIAS_PENDIENTES.md).
7. Privacidad: no solicitar ZIP de modelos ni plantillas para evaluar las conclusiones agregadas de esta entrega. Si una auditoría por elemento se considera indispensable, acordar un mecanismo controlado por separado.
