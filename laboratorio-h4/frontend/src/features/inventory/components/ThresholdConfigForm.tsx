import { useState } from "react";
import {
  Button,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { IconCheck, IconDeviceFloppy } from "@tabler/icons-react";
import { SectionCard } from "../../../components/shared";
import type { StockItem, ThresholdConfig } from "../services/inventoryTypes";

interface ThresholdConfigFormProps {
  thresholds: ThresholdConfig;
  stockItems: StockItem[];
  saving: boolean;
  onUpdateGlobal: (val: number) => Promise<boolean>;
  onUpdateSku: (sku: string, val: number) => Promise<boolean>;
  // Limpia el feedback de la operación anterior al iniciar una nueva. El
  // mensaje de resultado lo aporta exclusivamente el hook (CONFIRMED/VERIFIED/
  // error); este formulario no genera confirmaciones propias.
  onUpdateStart?: () => void;
}

export function ThresholdConfigForm({
  thresholds,
  stockItems,
  saving,
  onUpdateGlobal,
  onUpdateSku,
  onUpdateStart,
}: ThresholdConfigFormProps) {
  const [globalVal, setGlobalVal] = useState<number | string>(
    thresholds.globalThreshold,
  );
  const [selectedSku, setSelectedSku] = useState<string | null>(
    stockItems[0]?.sku ?? null,
  );
  const [skuVal, setSkuVal] = useState<number | string>(
    selectedSku ? thresholds.skuOverrides[selectedSku] ?? thresholds.globalThreshold : 10,
  );

  const handleGlobalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(globalVal);
    if (!isNaN(val) && val >= 0) {
      onUpdateStart?.();
      await onUpdateGlobal(val);
    }
  };

  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku) return;
    const val = Number(skuVal);
    if (!isNaN(val) && val >= 0) {
      onUpdateStart?.();
      await onUpdateSku(selectedSku, val);
    }
  };

  const catalog = Array.from(
    new Map(stockItems.map((item) => [item.sku, item])).values(),
  );

  const skuOptions = catalog.map((item) => ({
    value: item.sku,
    label: `${item.sku} — ${item.productName}`,
  }));

  const overrideEntries = Object.entries(thresholds.skuOverrides);

  return (
    <Stack gap="lg">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard
            title="Umbral global por defecto"
            description="Aplica como valor base a todos los SKUs que no tengan un override específico."
          >
            <form onSubmit={handleGlobalSubmit}>
              <Stack gap="md">
                <NumberInput
                  label="Unidades mínimas de stock bajo"
                  description="Valor entero mayor o igual a 0 (default normativo: 10)."
                  min={0}
                  value={globalVal}
                  onChange={setGlobalVal}
                  disabled={saving}
                  aria-label="Umbral global de stock bajo"
                />
                <Group justify="flex-end">
                  <Button
                    type="submit"
                    loading={saving}
                    leftSection={<IconDeviceFloppy size={16} />}
                  >
                    Guardar umbral global
                  </Button>
                </Group>
              </Stack>
            </form>
          </SectionCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <SectionCard
            title="Configurar excepción por SKU"
            description="Sobrescribe el umbral global para un SKU específico (prioridad alta)."
          >
            <form onSubmit={handleSkuSubmit}>
              <Stack gap="md">
                <Select
                  label="Seleccionar SKU"
                  data={skuOptions}
                  value={selectedSku}
                  onChange={(val) => {
                    setSelectedSku(val);
                    if (val) {
                      setSkuVal(thresholds.skuOverrides[val] ?? thresholds.globalThreshold);
                    }
                  }}
                  disabled={saving}
                  aria-label="Seleccionar SKU para umbral"
                />
                <NumberInput
                  label="Unidades de umbral para este SKU"
                  description="Si el disponible es menor o igual a este valor, se marcará STOCK_BAJO."
                  min={0}
                  value={skuVal}
                  onChange={setSkuVal}
                  disabled={saving}
                  aria-label="Umbral específico por SKU"
                />
                <Group justify="flex-end">
                  <Button
                    type="submit"
                    variant="filled"
                    loading={saving}
                    disabled={!selectedSku}
                    leftSection={<IconCheck size={16} />}
                  >
                    Aplicar a SKU
                  </Button>
                </Group>
              </Stack>
            </form>
          </SectionCard>
        </Grid.Col>
      </Grid>

      <SectionCard
        title="Excepciones activas por SKU"
        description="Listado de SKUs con umbral diferenciado sobre el global vigente."
      >
        {overrideEntries.length === 0 ? (
          <Text size="sm" c="dimmed">
            No hay excepciones configuradas. Todos los SKUs utilizan el umbral global ({thresholds.globalThreshold} unidades).
          </Text>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>SKU</Table.Th>
                <Table.Th>Producto</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Umbral específico</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Diferencia vs Global</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {overrideEntries.map(([sku, val]) => {
                const item = catalog.find((s) => s.sku === sku);
                const diff = val - thresholds.globalThreshold;
                return (
                  <Table.Tr key={sku}>
                    <Table.Td fw={600}>{sku}</Table.Td>
                    <Table.Td>{item?.productName ?? "—"}</Table.Td>
                    <Table.Td style={{ textAlign: "right" }} fw={700}>
                      {val} unidades
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }} c={diff < 0 ? "orange" : "blue"}>
                      {diff === 0 ? "Igual" : diff > 0 ? `+${diff}` : `${diff}`} unidades
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </SectionCard>
    </Stack>
  );
}
