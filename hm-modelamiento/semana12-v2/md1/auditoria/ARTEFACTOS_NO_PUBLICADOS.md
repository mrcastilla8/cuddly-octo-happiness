# MD-1 — artefactos no publicados v2

- ZIP privado `HM_MD1_Modelos_PRIVADO.zip` y todo su contenido binario/datos: conservado local, no subido.
- ZIP público completo `HM_MD1_Evidencias.zip`: no se subió como ZIP; se extrajeron solo archivos de la whitelist y se revisaron individualmente.
- Evidencia de origen inventariada: [`INVENTARIO_COMPLETO_V2.csv`](../../auditoria-global/INVENTARIO_COMPLETO_V2.csv).
- Evidencias publicadas: `estado_experimentos.csv`, `md1_ari_repeticiones.csv`, `md1_cobertura_semana12.csv`, `md1_decision_final.json`, `md1_estado_semana12.json`, `md1_evaluacion_final.csv`, `md1_evaluacion_k_y_estabilidad.png`, `md1_evaluacion_sensibilidad.png`, `md1_firmas.csv`, `md1_informe_evaluacion_semana12.md`, `md1_invariantes_evaluacion.csv`, `md1_k_congelado.json`, `md1_perfiles_finales.csv`, `md1_perfiles_frecuencia_registros.png`, `md1_perfiles_recencia_dias.png`, `md1_perfiles_valor_agregado_price.png`, `md1_piloto_pam.csv`, `md1_seleccion_k.csv`, `md1_sensibilidad.csv`.
- Se excluyen manifiestos ZIP redundantes, cachés/intermedios y registros o filas de nivel artículo/revisión humana donde no eran necesarios para el agregado; en particular MD-4 no publica mapas fila-a-artículo, posiciones/rondas PPS ni embeddings/modelos completos.
- No se halló columna de customer_id en los archivos CSV seleccionados ni credencial/token en el contenido textual analizado. El notebook se copia byte a byte y se publican sus outputs guardados; la búsqueda de privacidad en outputs excluyó cargas de imagen/base64.
