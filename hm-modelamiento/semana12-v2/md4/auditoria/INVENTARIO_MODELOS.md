# MD-4 — inventario documental de modelos v2

**Estado:** `VERIFICADO_DOCUMENTALMENTE`

**Alcance:** metadatos, lista interna, hashes, source del notebook y outputs guardados. No se cargaron `pickle`/`joblib` ni se ejecutaron modelos. La etiqueta significa que el notebook contiene evidencia de una prueba de guardado/recarga; no es verificación independiente por esta auditoría.

## Archivos del ZIP privado — no publicados

| Ruta | Bytes | SHA-256 | Formato |
|---|---:|---|---|
| `md4/modelos/articulo_a_texto_unico.npy` | 422296 | `115998ead93fc6aa867e4a6585d05010463fdcef19089fc2d47ef628253470ec` | .npy |
| `md4/modelos/catalogo_indice.csv.gz` | 3120145 | `b806667f290b38449a1bf0deebdbfb61e7013a72f44a3939022c2406ce1bb065` | .gz |
| `md4/modelos/configuracion.json` | 365 | `33aa74e6da8de61970926c518af74f0952c3c66a02ba31c1faae325b7a6a7bb3` | .json |
| `md4/modelos/estado_modelos.json` | 391 | `ab1f7f22d49bc3aee940f96979b2bf266e799e4e21d7fb574458c2862fed38cf` | .json |
| `md4/modelos/lsa_svd.joblib` | 26991870 | `b9c9d9461e220ce85566a8d851d9431634993dba64d7c36bc4655ff69eb1ee00` | .joblib |
| `md4/modelos/lsa_unicos.npy` | 35023328 | `595f6d7c2a4510016f2a524d8615261d56e1d8221425f344978a2c7fadaf2ba5` | .npy |
| `md4/modelos/sbert_modelo_local/1_Pooling/config.json` | 90 | `4fef0a7e8c8ee36e74c0fad89bab60ade72324442d43f559ea219bb7c2580710` | .json |
| `md4/modelos/sbert_modelo_local/README.md` | 10502 | `dcd602d2fd35c203a247304a06fec6654a12f7941b739f9221a064fe8dc3b7f0` | .md |
| `md4/modelos/sbert_modelo_local/config.json` | 745 | `6a7e130bc39a770a4b1a1ec78e95c8206c4dc3003e82b40ed939a1128bd18449` | .json |
| `md4/modelos/sbert_modelo_local/config_sentence_transformers.json` | 284 | `a242b9debd625b29b80b2bec22bc14d95f535a6b4b39913ff86da4f22874fa93` | .json |
| `md4/modelos/sbert_modelo_local/model.safetensors` | 90864192 | `1377e9af0ca0b016a9f2aa584d6fc71ab3ea6804fae21ef9fb1416e2944057ac` | .safetensors |
| `md4/modelos/sbert_modelo_local/modules.json` | 429 | `fa7d796a215e1b2416773062891923b191fc5a4849bc44e322997433c90f459c` | .json |
| `md4/modelos/sbert_modelo_local/sentence_bert_config.json` | 241 | `3084164002c0bca01b0259c5327123803fce32e660a57feb93184ffead186fc8` | .json |
| `md4/modelos/sbert_modelo_local/tokenizer.json` | 711649 | `851ca67100d372ca3ae031a6abd168f53489eebfd7d89523f35c5c9b4d372c3c` | .json |
| `md4/modelos/sbert_modelo_local/tokenizer_config.json` | 594 | `4817907ff3846ed899a62cccad0193c21d0792130c6139d8362187153eeff283` | .json |
| `md4/modelos/sbert_unicos.npy` | 67244672 | `2b0cc6868dbd365b14f82545d4971262396b987e976a87515c8a14d88724907c` | .npy |
| `md4/modelos/tfidf_unicos.npz` | 5970087 | `b576ddea6ea77fd6ede1cb110c8250af87305a91e2a4c81cc881f4b2788c568a` | .npz |
| `md4/modelos/tfidf_vectorizador.joblib` | 367540 | `6315f2cbc387eb8881c59509cce751e341dfbe120b615d43a431c86d0a19255c` | .joblib |
| `md4/manifest_exportacion.json` | 3340 | `d8272ca56b2337071f3d8299cb5bb98a6d4b9f01041db059a8d01acdb997f904` | .json |

## Contenido y reutilización

Joblib TF-IDF/SVD; NPZ/NPY para matrices/vectorización e índices; CSV.GZ de catálogo→texto; configuración JSON; modelo Sentence-BERT local (safetensors/tokenizer). Metadata declara 105,542 artículos, 43,779 textos únicos, SBERT dimensión 384, LSA=200. Source realiza roundtrip de artefactos y `allclose` en muestra de 100 y recarga vectorizador/SVD.

Requiere catálogo textual con esquema/orden compatible, normalización, índice de correspondencia y versiones de sklearn/scipy/joblib/torch/transformers/sentence-transformers; no están fijadas en manifiesto. Los arrays y pesos son grandes/privados. PPS/Kappa no forman parte de la persistencia y siguen pendientes.

Los ocho ZIP privados quedan locales. Los hashes completos también están en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv).
