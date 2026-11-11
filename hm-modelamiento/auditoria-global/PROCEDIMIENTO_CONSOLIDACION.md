# Procedimiento de consolidación e integridad

- Se inspeccionó el árbol recursivo local: cuatro ZIP y cinco notebooks (cuatro en la carpeta de trabajo y el duplicado MD-2 en la carpeta padre de Descargas).
- Se validó cada ZIP con `ZipFile.testzip()` y se extrajo cada miembro a una carpeta temporal única `hm-evidencias-seguras-*`; se rechazaron rutas absolutas, `..`, separadores inversos y colisiones/sobrescritura. Los hashes de archivos temporales se cotejaron con los bytes del miembro. Los ZIP originales quedaron intactos.
- Se copiaron desde bytes originales únicamente artefactos compactos seguros. No se cargaron pickles/joblib ni se ejecutó código de notebooks, modelos, inferencia o entrenamiento.
- Los notebooks se analizaron como JSON: conteos de celdas/outputs, errores/tracebacks, warnings, última ejecución, secciones Semana 12 y exportación. La evidencia se cruzó con CSV/JSON del ZIP. El `execution_count` no se usó como dictamen de cobertura.
- SHA-256 del material original y las rutas de publicación constan en `MANIFIESTO_GLOBAL.json`/`INVENTARIO_COMPLETO.csv`. Para reutilización de MD-4 se detectaron diez hashes iguales a archivos ya existentes en HEAD previo del PR y se conservaron sus rutas sin crear nuevas copias. Las versiones con contenido distinto se guardan en carpeta fechada.
- Se revisaron patrones de credenciales y datos individuales en outputs; las referencias a identificadores internos de widgets, columnas y tokens del tokenizer no se clasificaron como customer IDs. Los notebooks públicos no mostraron customer IDs en outputs.
- `git diff --check`, integridad JSON, enlaces/rutas y límites por tamaño se verificaron antes de commit.
