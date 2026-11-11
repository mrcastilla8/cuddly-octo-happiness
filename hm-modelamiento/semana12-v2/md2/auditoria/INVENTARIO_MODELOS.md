# MD-2 — inventario documental de modelos v2

**Estado:** `VERIFICADO_DOCUMENTALMENTE`

**Alcance:** metadatos, lista interna, hashes, source del notebook y outputs guardados. No se cargaron `pickle`/`joblib` ni se ejecutaron modelos. La etiqueta significa que el notebook contiene evidencia de una prueba de guardado/recarga; no es verificación independiente por esta auditoría.

## Archivos del ZIP privado — no publicados

| Ruta | Bytes | SHA-256 | Formato |
|---|---:|---|---|
| `md2/modelos/contrato_cestas.json` | 1712 | `c7c83fb695ea949ca2da32fc0fb6ef35595a8fab816051a63566a3efb2f61c16` | .json |
| `md2/modelos/estado_modelos.json` | 309 | `96d1f4d3eb8da1d804deee3e20ae71a5e25ae0bd29fb7a1fbe2de15d3b058dd9` | .json |
| `md2/modelos/itemsets_frecuentes.csv` | 83568 | `0822e9f5c4380156668df9af03775cab3600da27bb7e6f251c5d2996d838680f` | .csv |
| `md2/modelos/reglas_desarrollo.csv` | 149689 | `0490840c2c452363f3bcb44b5eb5dbd4878adbf3a2d37ed3e2808be1c3daea68` | .csv |
| `md2/manifest_exportacion.json` | 801 | `7098299ae59b9c253203550cc575a3e6e7109c318daf7570eec4595f0df768e3` | .json |

## Contenido y reutilización

CSV UTF-8 (`itemsets_frecuentes.csv`, `reglas_desarrollo.csv`) + JSON contrato de cesta y estado. 1,831 itemsets / 1,717 reglas; contrato define `product_type_name`, unidad cliente-día, corte de desarrollo, soporte/piso y restricciones. El estado afirma que reglas/soportes coinciden tras recarga.

Inferencia/consulta requiere nuevos artículos transaccionales convertidos a la misma cesta cliente-día/categoría, vocabulario, fechas y regla congelada; no existe estimador Apriori/FP-Growth empaquetado ni código de producción independiente en el ZIP. Estado de exportación no prueba comportamiento fuera del notebook.

Los ocho ZIP privados quedan locales. Los hashes completos también están en [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv).
