import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCoins,
  IconPhoto,
  IconPlus,
  IconScale,
  IconTrash,
} from "@tabler/icons-react";
import { SectionCard, StatusBadge } from "../../../components/shared";
import type { ProductDetailView } from "../services/catalogRepository";
import type { useVariantForm } from "../hooks/useVariantForm";

interface VariantFormFieldsProps {
  form: ReturnType<typeof useVariantForm>;
  parentProduct: ProductDetailView;
}

function parseNumericValue(val: string | number | undefined): number | undefined {
  if (val === undefined || val === "") return undefined;
  if (typeof val === "number") return Number.isNaN(val) ? undefined : val;
  const parsed = parseFloat(String(val).trim());
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function VariantFormFields({ form, parentProduct }: VariantFormFieldsProps) {
  const {
    formData,
    attributeSchemas,
    schemaLoading,
    schemaError,
    updateField,
    addIdentifyingAttribute,
    removeIdentifyingAttribute,
    updateIdentifyingAttribute,
    addNonIdentifyingAttribute,
    removeNonIdentifyingAttribute,
    updateNonIdentifyingAttribute,
    derivedVolumeCm3,
    errors,
    isEdit,
  } = form;

  return (
    <Stack gap="lg">
      {/* CARD 1: Identidad y Contexto del Padre */}
      <SectionCard
        title="1. Identidad y SKU"
        description="El SKU es la identidad comercial única de la variante. Debe ingresarse explícitamente al crear."
      >
        <Stack gap="md">
          <Paper p="sm" withBorder bg="var(--po-subtle)">
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  Producto Padre
                </Text>
                <Text size="sm" fw={600}>
                  {parentProduct.name}
                </Text>
              </div>
              <Group gap="xs">
                <Badge variant="outline" color="gray" size="sm">
                  SKU Base: {parentProduct.skuBase ?? "Sin SKU base"}
                </Badge>
                <StatusBadge semantic="neutral">
                  {parentProduct.hasVariants ? "Con variantes" : "Simple"}
                </StatusBadge>
              </Group>
            </Group>
          </Paper>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="SKU de la Variante"
                placeholder={isEdit ? "" : "Ej. PROD-RUN-AZUL-M"}
                description={
                  isEdit
                    ? "El SKU es inmutable una vez creado."
                    : "Obligatorio. Se conserva sin generación automática."
                }
                value={formData.sku}
                onChange={(e) => updateField("sku", e.currentTarget.value)}
                error={errors.sku}
                disabled={isEdit}
                required={!isEdit}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </SectionCard>

      {/* CARD 2: Atributos Identificadores y No Identificadores */}
      <SectionCard
        title="2. Atributos de la Variante (Taxonomía)"
        description={
          isEdit
            ? "Los atributos identificadores son inmutables para preservar la identidad del SKU. Puede modificar atributos complementarios autorizados."
            : "Define los atributos identificadores que distinguen este SKU según el esquema oficial de Taxonomía."
        }
      >
        <Stack gap="lg">
          {schemaError && (
            <Alert icon={<IconAlertCircle size={14} />} color="red" variant="light">
              <Text size="xs">Error al cargar esquema de taxonomía: {schemaError}</Text>
            </Alert>
          )}

          {errors.attributes && <Alert color="danger">{errors.attributes}</Alert>}
          {([true, false] as const).map(identity => {
            const entries = identity ? formData.identifyingAttributes : formData.nonIdentifyingAttributes;
            const update = identity ? updateIdentifyingAttribute : updateNonIdentifyingAttribute;
            const remove = identity ? removeIdentifyingAttribute : removeNonIdentifyingAttribute;
            const available = attributeSchemas.filter(s => s.esIdentificadora === identity);
            const locked = identity && isEdit;
            return <Box key={String(identity)}>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{identity ? "Atributos identificadores" : "Atributos complementarios"}</Text>
                {!locked && <Button variant="subtle" size="xs" leftSection={<IconPlus size={14} />}
                  onClick={identity ? addIdentifyingAttribute : addNonIdentifyingAttribute}
                  disabled={schemaLoading || Boolean(schemaError) || available.every(s =>
                    entries.some(a => a.caracteristicaId === s.caracteristicaId))}>
                  {identity ? "Agregar atributo" : "Agregar complementario"}
                </Button>}
              </Group>
              {errors.identifyingAttributes && identity && <Alert color="danger">{errors.identifyingAttributes}</Alert>}
              <Stack gap="sm">
                {entries.map((attr, idx) => {
                  const schema = available.find(s => s.caracteristicaId === attr.caracteristicaId);
                  const error = errors[`${identity ? "id" : "non"}_attr_${idx}_valor`];
                  return <Paper key={attr.key} p="sm" withBorder>
                    <Group align="flex-start" wrap="nowrap">
                      <Select label="Característica (Taxonomía)" value={attr.caracteristicaId}
                        data={available.filter(s => s.caracteristicaId === attr.caracteristicaId ||
                          !entries.some(a => a.caracteristicaId === s.caracteristicaId))
                          .map(s => ({ value: s.caracteristicaId, label: s.nombre }))}
                        disabled={locked || Boolean(attr.obligatorio) || schemaLoading || Boolean(schemaError)}
                        onChange={value => { if (value) update(idx, "caracteristicaId", value); }}
                        style={{ flex: 1 }} />
                      {locked ? <Text pt="lg">{attr.nombre}: {attr.valor}</Text> :
                        schema?.tipo === "LISTA" ?
                          <Select label={attr.nombre} required={schema.obligatorio}
                            data={(schema.opciones ?? []).map(o => ({ value: o.id, label: o.valor }))}
                            value={attr.valor || null} onChange={value => update(idx, "valor", value ?? "")}
                            error={error} disabled={schemaLoading || Boolean(schemaError)} style={{ flex: 1 }} /> :
                        schema?.tipo === "NUMERO" ?
                          <NumberInput label={attr.nombre} required={schema.obligatorio} clampBehavior="none"
                            value={attr.valor} onChange={value => update(idx, "valor", String(value))}
                            min={schema.minimum} max={schema.maximum} description={schema.unidad}
                            error={error} style={{ flex: 1 }} /> :
                          <TextInput label={attr.nombre} required={schema?.obligatorio} maxLength={schema?.maxLength}
                            value={attr.valor} onChange={e => update(idx, "valor", e.currentTarget.value)}
                            error={error} disabled={!schema || schemaLoading || Boolean(schemaError)} style={{ flex: 1 }} />}
                      {!locked && <Button variant="subtle" color="danger" mt="lg"
                        aria-label={`Quitar ${attr.nombre}`} disabled={Boolean(attr.obligatorio)}
                        onClick={() => remove(idx)}><IconTrash size={16} /></Button>}
                    </Group>
                  </Paper>;
                })}
              </Stack>
            </Box>;
          })}
        </Stack>
      </SectionCard>

      {/* CARD 3: Imagen y Perfil Físico */}
      <SectionCard
        title="3. Imagen y Perfil Físico"
        description="Cada variante posee su propio perfil físico para inventario y logística. Se admiten valores parciales en borrador, pero se exigirán completos para activación."
      >
        <Stack gap="md">
          <TextInput
            label={`URL de Imagen de la Variante ${isEdit ? "" : "*"}`}
            placeholder="https://ejemplo.com/imagenes/variante-azul.jpg"
            description={
              isEdit
                ? "URL de la imagen de la variante."
                : "Obligatoria al crear variante (VarianteCreateRequest) y para su activación comercial."
            }
            leftSection={<IconPhoto size={16} />}
            value={formData.imageUrl}
            onChange={(e) => updateField("imageUrl", e.currentTarget.value)}
            error={errors.imageUrl}
            required={!isEdit}
          />

          <div>
            <Group gap="xs" mb="xs">
              <IconScale size={16} />
              <Text size="sm" fw={600}>
                Dimensiones y Peso Físico (kg / cm)
              </Text>
            </Group>
            <Grid gap="md">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <NumberInput
                  label="Peso (kg)"
                  placeholder="0.00"
                  clampBehavior="none"
                  step={0.05}
                  decimalScale={2}
                  value={formData.pesoKg ?? ""}
                  onChange={(val) =>
                    updateField("pesoKg", parseNumericValue(val))
                  }
                  error={errors.pesoKg}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <NumberInput
                  label="Largo (cm)"
                  placeholder="0.0"
                  clampBehavior="none"
                  step={1}
                  decimalScale={1}
                  value={formData.largoCm ?? ""}
                  onChange={(val) =>
                    updateField("largoCm", parseNumericValue(val))
                  }
                  error={errors.largoCm}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <NumberInput
                  label="Ancho (cm)"
                  placeholder="0.0"
                  clampBehavior="none"
                  step={1}
                  decimalScale={1}
                  value={formData.anchoCm ?? ""}
                  onChange={(val) =>
                    updateField("anchoCm", parseNumericValue(val))
                  }
                  error={errors.anchoCm}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <NumberInput
                  label="Alto (cm)"
                  placeholder="0.0"
                  clampBehavior="none"
                  step={1}
                  decimalScale={1}
                  value={formData.altoCm ?? ""}
                  onChange={(val) =>
                    updateField("altoCm", parseNumericValue(val))
                  }
                  error={errors.altoCm}
                />
              </Grid.Col>
            </Grid>

            {derivedVolumeCm3 !== null && (
              <Group gap="xs" mt="xs">
                <Text size="xs" c="dimmed">
                  Volumen calculado (informativo):
                </Text>
                <Badge variant="light" color="gray" size="sm">
                  {derivedVolumeCm3} cm³
                </Badge>
              </Group>
            )}
          </div>
        </Stack>
      </SectionCard>

      {/* CARD 4: Herencia de Precio Base */}
      <Alert
        icon={<IconCoins size={18} />}
        title="Precio inicial de Catálogo"
        color="blue"
        variant="light"
      >
        <Stack gap="xs">
          <Text size="xs">
            Precio inicial registrado del padre: {parentProduct.priceInitial === undefined ? "No disponible" :
              `S/. ${parentProduct.priceInitial.toFixed(2)}`}. El precio vigente debe consultarse en Pricing.
          </Text>
          <Text size="xs" c="dimmed">
            No se define un precio propio en el Catálogo para la variante. Las sobreescrituras de precio
            por SKU son gestionadas posteriormente de manera autoritativa por el módulo de Pricing.
          </Text>
        </Stack>
      </Alert>
    </Stack>
  );
}
