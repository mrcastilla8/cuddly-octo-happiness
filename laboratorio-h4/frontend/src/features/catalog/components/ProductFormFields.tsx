import {
  Alert,
  Box,
  Group,
  Image,
  NumberInput,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconInfoCircle, IconPhoto } from "@tabler/icons-react";
import { SectionCard } from "../../../components/shared";
import { calculateVolumeCm3 } from "../services/catalogPresentation";
import type { ProductFormData } from "../hooks/useProductForm";
import type {
  AttributeSchema,
  TaxonomyBrand,
  TaxonomyCategory,
  TaxonomyProductType,
} from "../services/taxonomyRepository";
import type { ProductDetailView } from "../services/catalogRepository";

interface ProductFormFieldsProps {
  formData: ProductFormData;
  updateField: <K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K],
  ) => void;
  updateAttribute: (caracteristicaId: string, value: string | number) => void;
  errors: Record<string, string>;
  categories: TaxonomyCategory[];
  brands: TaxonomyBrand[];
  productTypes: TaxonomyProductType[];
  attributeSchema: AttributeSchema[];
  schemaConfirmed: boolean;
  isEdit?: boolean;
  initialProduct?: ProductDetailView;
}

function parseNumericValue(val: string | number | undefined): number | undefined {
  if (val === undefined || val === "") return undefined;
  if (typeof val === "number") return Number.isNaN(val) ? undefined : val;
  const parsed = parseFloat(String(val).trim());
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function ProductFormFields({
  formData,
  updateField,
  updateAttribute,
  errors,
  categories,
  brands,
  productTypes,
  attributeSchema,
  schemaConfirmed,
  isEdit = false,
  initialProduct,
}: ProductFormFieldsProps) {
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.nombre,
    disabled: !c.activo,
  }));
  const brandOptions = brands.map((b) => ({
    value: b.id,
    label: b.nombre,
    disabled: !b.activo,
  }));
  const typeOptions = productTypes.map((t) => ({
    value: t.id,
    label: t.nombre,
    disabled: !t.activo,
  }));

  // SPEC-010 condition Q-06 for type correction in edit mode:
  // Eligible ONLY IF product is BORRADOR, has NO variants, and has NO commercial publications
  // Q-06 remains open: eligibility alone does not publish a PATCH field.
  const isTypeCorrectionEligible =
    isEdit &&
    initialProduct &&
    initialProduct.status === "BORRADOR" &&
    !initialProduct.hasVariants &&
    initialProduct.publishedCommercially === false;

  const volume = calculateVolumeCm3(
    formData.largoCm,
    formData.anchoCm,
    formData.altoCm,
  );

  return (
    <Stack gap="xl" maw={880}>
      {/* CARD 1: Identidad y Datos Generales */}
      <SectionCard
        title="1. Identidad y Datos Generales"
        description="Ingresa la información descriptiva y clasificaciones taxonómicas."
      >
        <Stack gap="md">
          <TextInput
            label="Nombre del producto"
            required
            placeholder="Ej. Camiseta Running Endurance"
            value={formData.nombre}
            onChange={(e) => updateField("nombre", e.currentTarget.value)}
            error={errors.nombre}
          />

          <Textarea
            label="Descripción comercial"
            required
            rows={3}
            placeholder="Describe las características principales, materiales, uso recomendado..."
            value={formData.descripcion}
            onChange={(e) => updateField("descripcion", e.currentTarget.value)}
            error={errors.descripcion}
          />

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Select
              label="Categoría"
              required
              data={categoryOptions}
              value={formData.categoriaId}
              onChange={(val) => updateField("categoriaId", val || "")}
              error={errors.categoriaId}
            />

            <Select
              label="Marca"
              required
              data={brandOptions}
              value={formData.marcaId}
              onChange={(val) => updateField("marcaId", val || "")}
              error={errors.marcaId}
            />

            <div>
              <Select
                label="Tipo de producto"
                required
                data={typeOptions}
                value={formData.tipoProductoId}
                onChange={(val) => updateField("tipoProductoId", val || "")}
                error={errors.tipoProductoId}
                disabled={isEdit}
              />
              {isEdit && (
                <Text size="xs" c="dimmed" mt={4}>
                  {isTypeCorrectionEligible
                    ? "El tipo de producto no se puede cambiar en este momento."
                    : "Completa los requisitos del producto antes de cambiar el tipo."}
                </Text>
              )}
            </div>
          </SimpleGrid>
        </Stack>
      </SectionCard>

      {/* CARD 2: Modelo de Venta y Precio Inicial */}
      <SectionCard
        title="2. Modelo de Venta y Precio Inicial"
        description="Define si el producto es simple o maneja variantes, y establece su SKU base."
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={600} mb={6}>
              Modelo de venta {!isEdit && <span style={{ color: "red" }}>*</span>}
            </Text>
            <Radio.Group
              value={formData.tieneVariantes ? "variants" : "simple"}
              onChange={(val) => updateField("tieneVariantes", val === "variants")}
            >
              <Group gap="xl">
                <Radio
                  value="simple"
                  label="Producto Simple (Unidad vendible directa con SKU propio)"
                  disabled={isEdit}
                />
                <Radio
                  value="variants"
                  label="Producto con Variantes (Padre agrupador de SKUs vendibles)"
                  disabled={isEdit}
                />
              </Group>
            </Radio.Group>
            {isEdit && (
              <Text size="xs" c="dimmed" mt={4}>
                El modelo de venta queda fijado permanentemente en el alta.
              </Text>
            )}
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <TextInput
                label="SKU Base"
                required={!isEdit}
                placeholder="Ej. CAM-RUN-001"
                value={formData.skuBase}
                onChange={(e) =>
                  updateField("skuBase", e.currentTarget.value.toUpperCase())
                }
                error={errors.skuBase}
                disabled={isEdit}
              />
              {isEdit && (
                <Text size="xs" c="dimmed" mt={4}>
                  El SKU base constituye la identidad inmutable del producto.
                </Text>
              )}
            </div>

            <div>
              <NumberInput
                label="Precio base inicial (S/.)"
                required={!isEdit}
                min={0.01}
                step={0.5}
                decimalScale={2}
                placeholder="0.00"
                value={formData.precioBaseInicial || ""}
                onChange={(val) =>
                  updateField("precioBaseInicial", parseNumericValue(val) ?? 0)
                }
                error={errors.precioBaseInicial}
                disabled={isEdit}
              />
              {isEdit ? (
                <Text size="xs" c="dimmed" mt={4}>
                  El precio vigente se gestiona desde el módulo de Precios.
                </Text>
              ) : (
                <Text size="xs" c="dimmed" mt={4}>
                  Iniciará la preparación automática de Pricing tras guardar el borrador.
                </Text>
              )}
            </div>
          </SimpleGrid>
        </Stack>
      </SectionCard>

      {/* CARD 3: Perfil Físico (Simple Only) */}
      <SectionCard
        title="3. Perfil Físico"
        description={
          formData.tieneVariantes
            ? "No aplica para producto con variantes"
            : "Medidas y peso del SKU simple vendible."
        }
      >
        {formData.tieneVariantes ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            Las dimensiones y el peso se gestionan en cada variante.
          </Alert>
        ) : (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <NumberInput
                label="Peso (kg)"
                min={0.01}
                step={0.1}
                decimalScale={2}
                placeholder="0.00"
                value={formData.pesoKg ?? ""}
                onChange={(val) =>
                  updateField("pesoKg", parseNumericValue(val))
                }
                error={errors.pesoKg}
              />
              <NumberInput
                label="Largo (cm)"
                min={0.1}
                step={1}
                placeholder="0.0"
                value={formData.largoCm ?? ""}
                onChange={(val) =>
                  updateField("largoCm", parseNumericValue(val))
                }
                error={errors.largoCm}
              />
              <NumberInput
                label="Ancho (cm)"
                min={0.1}
                step={1}
                placeholder="0.0"
                value={formData.anchoCm ?? ""}
                onChange={(val) =>
                  updateField("anchoCm", parseNumericValue(val))
                }
                error={errors.anchoCm}
              />
              <NumberInput
                label="Alto (cm)"
                min={0.1}
                step={1}
                placeholder="0.0"
                value={formData.altoCm ?? ""}
                onChange={(val) =>
                  updateField("altoCm", parseNumericValue(val))
                }
                error={errors.altoCm}
              />
            </SimpleGrid>

            {volume !== null && (
              <Text size="sm" c="dimmed" fw={500}>
                Volumen derivado estimado: <strong>{volume.toLocaleString()} cm³</strong> (no enviado como campo independiente).
              </Text>
            )}

            <Text size="xs" c="dimmed">
              Nota: en BORRADOR se permiten medidas parciales (siempre que los valores ingresados sean &gt; 0). Para publicar en ACTIVO se exigirán las 4 medidas completas.
            </Text>
          </Stack>
        )}
      </SectionCard>

      {/* CARD 4: Imagen y Características Técnicas */}
      <SectionCard
        title="4. Imagen y Características Técnicas"
        description="Agrega la referencia visual y los atributos según el tipo de producto seleccionado."
      >
        <Stack gap="lg">
          <div>
            <TextInput
              label="URL de imagen de publicación"
              placeholder="https://..."
              value={formData.imageUrl}
              onChange={(e) => updateField("imageUrl", e.currentTarget.value)}
              rightSection={<IconPhoto size={16} />}
            />
            {formData.imageUrl.trim() && (
              <Box mt="xs" p="xs" style={{ border: "1px solid var(--po-border)", borderRadius: 8 }} w="fit-content">
                <Image
                  src={formData.imageUrl}
                  alt="Vista previa de imagen"
                  h={100}
                  w={100}
                  fit="contain"
                  radius="sm"
                />
              </Box>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              En borrador no es obligatoria; se requerirá para activar el producto.
            </Text>
          </div>

          <div>
            <Text size="sm" fw={600} mb="xs">
              Características técnicas del tipo {schemaConfirmed ? `(${attributeSchema.length})` : "(sin confirmar)"}
            </Text>

            {!schemaConfirmed ? (
              <Text size="sm" c="dimmed">Las características no están disponibles hasta confirmar el esquema.</Text>
            ) : attributeSchema.length === 0 ? (
              <Text size="sm" c="dimmed">
                Este tipo de producto no tiene características asociadas en Taxonomía.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {attributeSchema.map((schema) => {
                  const currentValue = formData.atributos[schema.caracteristicaId];
                  const label = `${schema.nombre}${schema.obligatorio ? " *" : ""}`;

                  if (schema.tipo === "TEXTO") {
                    return (
                      <TextInput
                        key={schema.caracteristicaId}
                        label={label}
                        placeholder={`Ingresa ${schema.nombre.toLowerCase()}...`}
                        value={currentValue !== undefined ? String(currentValue) : ""}
                        onChange={(e) =>
                          updateAttribute(
                            schema.caracteristicaId,
                            e.currentTarget.value,
                          )
                        }
                      />
                    );
                  }

                  if (schema.tipo === "NUMERO") {
                    return (
                      <NumberInput
                        key={schema.caracteristicaId}
                        label={`${label} ${schema.unidad ? `(${schema.unidad})` : ""}`}
                        placeholder="0"
                        value={typeof currentValue === "number" ? currentValue : ""}
                        onChange={(val) => {
                          const parsed = parseNumericValue(val);
                          updateAttribute(
                            schema.caracteristicaId,
                            parsed !== undefined ? parsed : "",
                          );
                        }}
                      />
                    );
                  }

                  if (schema.tipo === "LISTA") {
                    const opts =
                      schema.opciones?.map((o) => ({
                        value: o.id,
                        label: o.valor,
                      })) || [];
                    return (
                      <Select
                        key={schema.caracteristicaId}
                        label={label}
                        placeholder="Selecciona una opción"
                        data={opts}
                        error={errors[`attr_${schema.caracteristicaId}`]}
                        value={currentValue ? String(currentValue) : null}
                        onChange={(val) =>
                          updateAttribute(schema.caracteristicaId, val || "")
                        }
                      />
                    );
                  }

                  return null;
                })}
              </SimpleGrid>
            )}
          </div>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
