# Inventario y control — evaluación IA MD-4

## Universo PPS

- Pares Q originales: **340** (`Q0001`–`Q0340`).
- Pares V originales: **11** (`V0001`–`V0011`).
- Pares R recuperados de rankings: **305** (`R0001`–`R0305`).
- Total de pares únicos: **656**. IDs Q/V preservados; R ordenados determinísticamente por `(consulta, vecino)`.
- Pares con doble revisión planificada: **102**, preservados desde la selección original; R nuevos en `False`.
- Puntuaciones PPS incluidas o generadas: **0**.

## Posiciones y cobertura

- Filas en `POSICIONES_MODELOS.csv`: **3.600**, todas asociadas a un ID Q/V/R válido.
- Consultas: **30**. Combinaciones modelo/régimen/k: **16**.
- Top-5: **1.200/1.200** posiciones enlazadas (100%).
- Top-10: **2.400/2.400** posiciones enlazadas (100%).
- Antes de ampliar: 1.456/2.400 top-10 estaban enlazadas y 944 carecían de ID; esas posiciones corresponden a 305 claves únicas añadidas como R.

| Modelo | Régimen | k | Posiciones |
|---|---|---:|---:|
| LSA | completo | 10 | 300 |
| LSA | completo | 5 | 150 |
| LSA | refit_orig | 10 | 300 |
| LSA | refit_orig | 5 | 150 |
| LSA | sin_imputados_modelo_fijo | 10 | 300 |
| LSA | sin_imputados_modelo_fijo | 5 | 150 |
| SBERT | completo | 10 | 300 |
| SBERT | completo | 5 | 150 |
| SBERT | sin_imputados_modelo_fijo | 10 | 300 |
| SBERT | sin_imputados_modelo_fijo | 5 | 150 |
| TFIDF | completo | 10 | 300 |
| TFIDF | completo | 5 | 150 |
| TFIDF | refit_orig | 10 | 300 |
| TFIDF | refit_orig | 5 | 150 |
| TFIDF | sin_imputados_modelo_fijo | 10 | 300 |
| TFIDF | sin_imputados_modelo_fijo | 5 | 150 |

## Controles ejecutados

- [PASS] Exactamente 656 pares únicos: 340 Q, 11 V y 305 R; sin claves consulta/vecino duplicadas.
- [PASS] IDs Q/V originales preservados; R0001–R0305 determinísticos, sin colisiones.
- [PASS] 102 flags de doble revisión; flags Q/V conservados y R en `False`.
- [PASS] 3.600/3.600 posiciones enlazadas; consulta+vecino+ID consistente.
- [PASS] Sin IDs huérfanos, contradictorios o posiciones duplicadas por modelo/régimen/k/consulta/posición.
- [PASS] Rangos consecutivos 1..k para cada consulta/modelo/régimen.
- [PASS] Top-5 coincide con las primeras cinco posiciones del top-10 para cada consulta/modelo/régimen.
- [PASS] TFIDF, LSA y SBERT y los 16 escenarios originales conservados.
- [PASS] Ranking original igual en sus 3.600 filas y valores; solo se completó `id_par`. No se modificaron métricas.
- [PASS] Atributos verificados contra catálogo local; descripciones completas, sin truncamiento añadido; campos faltantes: 0. Recuento: `{"nombre_consulta": 0, "descripcion_consulta": 0, "tipo_consulta": 0, "grupo_consulta": 0, "nombre_vecino": 0, "descripcion_vecino": 0, "tipo_vecino": 0, "grupo_vecino": 0}`.
- [PASS] Sin puntuaciones PPS generadas ni experimentos/modelos recalculados.

## Fuentes locales

- `HM_MD4_Evidencias.zip` (`md4_posiciones_pps.csv`, `md4_comparacion_topk_modelos.csv`, `md4_primera_ronda_segundo_evaluador.csv`), SHA-256: `1280882bbfb9238501e1189ba3edd160a696e68a3218f20c64192564ec62a1af`.
- `HM_MD4_Plantillas_PPS_PRIVADO.zip` (`md4_complemento/md4_pps_evaluaciones_PLANTILLA.csv`), SHA-256: `74e6dd13baf73e5824a5a4fb6c11af776da9b86c80e2ac670eb8bd5e4f544124`.
- `HM_MD4_Modelos_PRIVADO.zip` (`md4/modelos/catalogo_indice.csv.gz` usado para atributos), SHA-256: `89c7f5b215784e195895867bceef2bbc0761a2047f8effe124eabc9075614cf1`.
- R se deriva solo de claves consulta/vecino adicionales en rankings originales; no se inventaron pares.

## SHA-256 de entregables

- `PARES_PPS_PARA_EVALUAR.csv` (253,970 bytes): `d1be1e4e1f7afd5aa46c6bb263ea0a2058832f7c1177e2dbee7139a431968b10`.
- `POSICIONES_MODELOS.csv` (197,543 bytes): `bde8078c24c1ae67716170cbb2fc65f002e00e06f0eeb0e3d935e838596fb8a4`.
- `RUBRICA_PPS_IA.md` (2,209 bytes): `daaf62a8549a1396f1216eda1195c0d8d0230af0d6bde98123106bdfffe84262`.
- `INVENTARIO_Y_CONTROL.md`: sin hash propio para evitar referencia circular.
