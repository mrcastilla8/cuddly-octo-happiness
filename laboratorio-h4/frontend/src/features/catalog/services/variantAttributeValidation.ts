import type { ProductAttributeValue } from "./catalogRepository";
import type { AttributeSchema } from "./taxonomyRepository";

export function validateVariantAttributes(
  identifying: ProductAttributeValue[],
  complementary: ProductAttributeValue[],
  schemas: AttributeSchema[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  if (!identifying.length) errors.identifyingAttributes = "Debe definir al menos un atributo identificador.";
  for (const [entries, isIdentity, prefix] of [[identifying, true, "id"], [complementary, false, "non"]] as const) {
    entries.forEach((entry, index) => {
      const key = `${prefix}_attr_${index}_valor`;
      const schema = schemas.find(s => s.caracteristicaId === entry.caracteristicaId);
      if (!schema || schema.esIdentificadora !== isIdentity || seen.has(entry.caracteristicaId)) {
        errors[key] = "Característica no autorizada, duplicada o con rol incorrecto.";
        return;
      }
      seen.add(entry.caracteristicaId);
      const value = String(entry.valor).trim();
      if (!value) {
        if (schema.obligatorio) errors[key] = `${schema.nombre} es obligatorio.`;
        return;
      }
      if (schema.tipo === "LISTA" && !schema.opciones?.some(o => o.id === entry.valorId)) {
        errors[key] = "Seleccione un valor autorizado de Taxonomía.";
      }
      if (schema.tipo === "NUMERO") {
        const number = Number(value);
        if (!Number.isFinite(number) || (schema.minimum !== undefined && number < schema.minimum) ||
          (schema.maximum !== undefined && number > schema.maximum)) {
          errors[key] = "Valor numérico inválido o fuera de los límites del esquema.";
        }
      }
      if (schema.tipo === "TEXTO" && schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors[key] = `Máximo ${schema.maxLength} caracteres.`;
      }
    });
  }
  schemas.filter(s => s.obligatorio).forEach(schema => {
    if (!seen.has(schema.caracteristicaId)) errors.attributes = `Falta la característica obligatoria ${schema.nombre}.`;
  });
  return errors;
}
