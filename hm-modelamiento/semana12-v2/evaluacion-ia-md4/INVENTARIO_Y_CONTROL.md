# Inventario y control — evaluación IA MD-4

## Conteos recuperados

- Pares Q únicos: **340**.
- Pares V adicionales: **{len(V)}**.
- Pares totales sin duplicados: **{len(PAIR)}**.
- Pares Q de primera doble revisión planificada: **{len(round_ids)}**.
- Calificaciones existentes copiadas: **0**.

## Posiciones por modelo, régimen y k

- Total conservado: **3600** filas de `md4_comparacion_topk_modelos.csv`.
- `md4_posiciones_pps.csv`: 450 filas, 340 claves Q únicas (150 por modelo en completo, k=5). Las 450 claves e IDs concuerdan con las plantillas.

| Modelo | Régimen | k | Filas |
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

## Integridad y correspondencia

- Campos faltantes entre los 351 pares: **0**. Detalle por campo: `{"nombre_consulta": 0, "descripcion_consulta": 0, "tipo_consulta": 0, "grupo_consulta": 0, "nombre_vecino": 0, "descripcion_vecino": 0, "tipo_vecino": 0, "grupo_vecino": 0}`.
- Los 340 pares Q se reconstruyeron sin pérdida y cada Q está asociado a las filas originales de posiciones por consulta/vecino/ID. Los 11 V también aparecen en el ranking completo.
- Para los 351 pares, IDs, nombres, descripciones y tipos coinciden exactamente con la plantilla privada de PPS. Los campos de grupo provienen del catálogo local. Las descripciones se conservaron completas, sin truncamiento añadido.
- `PARES_PPS_PARA_EVALUAR.csv` no incluye modelo ni calificaciones. `POSICIONES_MODELOS.csv` mantiene las 3.600 posiciones de los 16 escenarios y enlaza `id_par` cuando el par pertenece al conjunto Q/V.
- No se inventaron pares ni calificaciones. No se modificaron resultados originales.

## Procedencia

Procedencia declarada por el responsable del proyecto: datos sintéticos proporcionados por el profesor; Kaggle se usó para ejecutar los notebooks. Archivos de origen consultados localmente:
- `HM_MD4_Plantillas_PPS_PRIVADO.zip` → `md4_complemento/md4_pps_evaluaciones_PLANTILLA.csv` (126,717 bytes); SHA-256 del ZIP: `74e6dd13baf73e5824a5a4fb6c11af776da9b86c80e2ac670eb8bd5e4f544124`.
- `HM_MD4_Evidencias.zip` → `md4/md4_posiciones_pps.csv` (41,689 bytes); SHA-256 del ZIP: `1280882bbfb9238501e1189ba3edd160a696e68a3218f20c64192564ec62a1af`.
- `HM_MD4_Evidencias.zip` → `md4/md4_comparacion_topk_modelos.csv` (320,361 bytes); SHA-256 del ZIP: `1280882bbfb9238501e1189ba3edd160a696e68a3218f20c64192564ec62a1af`.
- `HM_MD4_Evidencias.zip` → `md4/md4_primera_ronda_segundo_evaluador.csv` (35,309 bytes); SHA-256 del ZIP: `1280882bbfb9238501e1189ba3edd160a696e68a3218f20c64192564ec62a1af`.
- `HM_MD4_Modelos_PRIVADO.zip` → `md4/modelos/catalogo_indice.csv.gz` (3,120,145 bytes); SHA-256 del ZIP: `89c7f5b215784e195895867bceef2bbc0761a2047f8effe124eabc9075614cf1`.

## SHA-256 de los entregables

- `PARES_PPS_PARA_EVALUAR.csv` (134,776 bytes): `fa48f9d952a12f54111fed6bbf1985999e874c13d618e5ea2e6846c3207b7095`
- `POSICIONES_MODELOS.csv` (192,823 bytes): `509b4fa9f4b4e692540db119af3101cb32900776e6af2dac746df508845747a0`
- `RUBRICA_PPS_IA.md` (2,072 bytes): `d4833cb15b5d5f0e95b2abcd543201475b837d83868e81c8ae060594b5ba2d8a`
- Este inventario no incluye su propio SHA-256 para evitar una referencia circular.
