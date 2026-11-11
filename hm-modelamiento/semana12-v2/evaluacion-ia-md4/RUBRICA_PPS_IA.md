# Rúbrica PPS para evaluación asistida por IA

El universo de evaluación contiene 656 pares únicos Q, V y R. La columna `origen_par` identifica la procedencia del par, no el modelo. Para cada par consulta–vecino, evalúa si la recomendación tiene una relación semántica o complementariedad justificable a partir de los nombres y descripciones proporcionados. La coincidencia de tipo o grupo es contexto, no evidencia suficiente por sí sola. Un producto de distinto tipo puede ser pertinente si complementa claramente al producto consultado; dos productos del mismo tipo pueden no ser pertinentes.

## Escala

- **0 — Sin relación útil suficientemente justificable:** los datos disponibles no muestran una relación de sustitución, estilo, uso, conjunto o complementariedad que haga útil la recomendación.
- **1 — Útil entre productos del mismo tipo:** existe una relación semántica o funcional defendible y ambos artículos son del mismo tipo de producto.
- **2 — Útil entre productos de tipos diferentes:** existe complementariedad semántica o de uso clara y defendible entre tipos distintos.

La puntuación debe basarse en el contenido del producto. No otorgues 1 solo porque coinciden las etiquetas de tipo/grupo, ni 2 solo porque difieren. No infieras materiales, ocasiones, estilos o funciones ausentes del texto.

## Ambigüedad o información insuficiente

Si nombres y descripciones no permiten decidir con confianza, asigna la mejor puntuación justificable y añade una nota breve de ambigüedad en un campo de comentarios separado. Indica si falta descripción, si el texto es genérico o si algún término no se entiende. No inventes atributos. Si no se puede justificar utilidad, usa 0 y marca la incertidumbre; no introduzcas una puntuación intermedia.

Evalúa `PARES_PPS_PARA_EVALUAR.csv` sin consultar `POSICIONES_MODELOS.csv` al asignar PPS. Ese segundo archivo contiene la clave para análisis posterior por modelo/régimen/posición. No presentes estas calificaciones como consenso humano ni calcules Cohen’s Kappa humano.

**Estas calificaciones serán producidas por un sistema de IA y no constituyen evaluación humana independiente.**
