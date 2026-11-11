# Auditoría documental de persistencia — v2

No se cargaron pickle/joblib desconocidos ni se ejecutó inferencia durante esta auditoría. Se inspeccionaron CRC, listas de miembros, formatos, manifiestos/hash SHA-256, estado JSON, source de las celdas de persistencia y outputs guardados. “Verificado documentalmente” indica que hay evidencia de roundtrip/assert en el notebook; no equivale a que esta auditoría haya repetido la inferencia en un entorno limpio.

| MD | Estado | Artefactos privados detectados | Prueba de guardado/recarga documentada | Datos mínimos y límite |
|---|---|---|---|---|
| MD-1 | `VERIFICADO_DOCUMENTALMENTE` | dos NPZ y estado JSON: centros K-means/PAM, mediana, escala, cap y medoid rows; manifiesto. | `np.load(...,allow_pickle=False)`, compara parámetros guardados y etiquetas idénticas en referencia de 2,000. Estado indica alcance fit n=4,000. | Tres variables RFM en misma transformación. Dependencias/versiones no fijadas en manifiesto; no se hizo carga independiente. |
| MD-2 | `VERIFICADO_DOCUMENTALMENTE` | CSV itemsets/reglas, JSON contrato de cestas y estado; manifiesto. 1,831 itemsets/1,717 reglas. | Estado dice que reglas/soportes coinciden tras recarga; artefacto reutilizable es ruleset, no estimador del minero. | Transacciones agregadas a cesta cliente-día por `product_type_name`, mismo vocabulario/corte/umbrales. Sin prueba de inferencia en sistema aparte. |
| MD-3 | `VERIFICADO_DOCUMENTALMENTE` | dos PKL (ETS y SARIMA), JSON baseline/estado; manifiesto. | El estado marca verificadas las tres entradas y conserva tiempos de reload para ETS (0.017 s) y SARIMA (0.653 s). No se cargaron aquí por seguridad. | Serie diaria ordenada e historia temporal; naive usa último dato y snaive7 última semana. PKL depende de versión compatible de Python/statsmodels, no fijada. |
| MD-4 | `VERIFICADO_DOCUMENTALMENTE` | joblib TF-IDF/SVD; NPZ/NPY matrices/índice; catálogo gzip; modelo SBERT local (safetensors/tokenizer); configuración y manifiesto. | Source carga archivos guardados y compara por `allclose` una muestra de 100; reabre TF-IDF/SVD; estado declara validación. No se repitió aquí. | Mismo corpus/normalización/orden y mapa artículo↔texto único. Requiere versiones sklearn/scipy/joblib/torch/transformers compatibles, no fijadas. PPS/Kappa no son prueba de persistencia. |

## Inventario completo por archivo

Consulte `md1/auditoria/INVENTARIO_MODELOS.md` … `md4/auditoria/INVENTARIO_MODELOS.md` para rutas internas, tamaños, hashes y formatos. El ZIP privado de MD-4 pesa 215,028,930 bytes comprimido; no se publica. Los otros tres ZIP privados tampoco se publican. Todos permanecen intactos en la carpeta local.
