# Fórmulas operativas MD-4 pendientes de ratificación

Estas expresiones provienen del notebook v2 y son PROPUESTAS, no definiciones aprobadas por el docente.

- **TCC@k** = recuperados / D, donde D = consultas × k.
- **TCT@k** = pares con intersección no vacía de palabras normalizadas / D.
- **TCMG@k** = pares con igual product_group_name / D.
- **TDIG@k** = (recuperados - pares de igual product_group_name) / D.
- **TCTipo@k** = pares con igual product_type_name / D.
- **TDIT@k** = (recuperados - pares de igual product_type_name) / D.

**Decisión requerida:** verificar que los acrónimos significan esas cantidades en la documentación del curso; ratificar definición y denominadores por escrito antes de dar por cerrado MD4-P03.
**Nota:** TCMG + TDIG = TCC y TCTipo + TDIT = TCC cuando cada posición recuperada tiene etiquetas definidas.
