import { usePromotionServices } from "../hooks/usePromotionServices";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ActionIcon, Button, Group, Menu, Select, Stack } from "@mantine/core";
import { IconDotsVertical, IconEdit, IconEye } from "@tabler/icons-react";
import {
  EntityTable,
  FilterBar,
  PageHeader,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { useAdministrationRead } from "../hooks/useAdministrationRead";

import {
  recommendationKindLabel,
  type RecommendationView,
} from "../services/recommendationRepository";
import { readPositiveInteger } from "../services/couponPresentation";
export function RecommendationsPage() {
  const [params, setParams] = useSearchParams();
  const { services, confirmedServices, revision, retry } = usePromotionServices();
  const status =
    params.get("estado") === "active"
      ? "active"
      : params.get("estado") === "inactive"
        ? "inactive"
        : "all";
  const kind =
    params.get("tipo") === "cross-sell"
      ? "cross-sell"
      : params.get("tipo") === "upsell"
        ? "upsell"
        : "all";
  const page = readPositiveInteger(
      params.get("pagina"),
      1,
      Number.MAX_SAFE_INTEGER,
    ),
    pageSize = readPositiveInteger(params.get("tamanio"), 10, 100);
  const read = useCallback(
    (signal: AbortSignal) =>
      services.recommendations.list(
        { status, kind, page, pageSize },
        signal,
      ),
    [status, kind, page, pageSize, services],
  );
  const state = useAdministrationRead(
    JSON.stringify([status, kind, page, pageSize, revision]),
    read,
  );
  const readCatalog = useCallback(
    async (signal: AbortSignal) => ({
      products: await confirmedServices.catalog.products(signal),
      categories: await confirmedServices.catalog.categories(signal),
    }),
    [confirmedServices],
  );
  const catalog = useAdministrationRead("origins", readCatalog);
  const update = (key: string, value: string, reset = true) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === "all" || value === "1") next.delete(key);
      else next.set(key, value);
      if (reset) next.delete("pagina");
      return next;
    });
  const clear = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("estado");
      next.delete("tipo");
      next.delete("pagina");
      return next;
    });
  const columns: TableColumn<RecommendationView>[] = [
    { key: "name", header: "Nombre", width: 195, render: (row) => row.name },
    {
      key: "kind",
      header: "Tipo",
      width: 125,
      render: (row) => recommendationKindLabel(row.configuration.kind),
    },
    {
      key: "origin",
      header: "Origen",
      width: 210,
      render: (row) => {
        const list =
          catalog.status === "success"
            ? row.configuration.originType === "category"
              ? catalog.result.categories
              : catalog.result.products
            : [];
        return `${row.configuration.originType === "category" ? "Categoría" : "Producto"}: ${list.find((item) => item.id === row.configuration.originId)?.name ?? "No disponible"}`;
      },
    },
    {
      key: "priority",
      header: "Prioridad",
      width: 85,
      align: "right",
      render: (row) => row.configuration.priority,
    },
    {
      key: "period",
      header: "Vigencia (Lima)",
      width: 200,
      render: (row) =>
        `${row.configuration.validFrom.replace("T", " ")} al ${row.configuration.validUntil.replace("T", " ")}`,
    },
    {
      key: "status",
      header: "Estado",
      width: 110,
      render: (row) => (
        <StatusBadge>
          {row.status === "active" ? "Activa" : "Inactiva"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: 120,
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <ActionIcon
            component={Link}
            to={`/recomendaciones/${row.id}?${params}`}
            aria-label={`Ver detalle de ${row.name}`}
            title="Ver detalle"
          >
            <IconEye size={16} stroke={2} aria-hidden="true" />
          </ActionIcon>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon
                aria-label={`Más acciones de ${row.name}`}
                title="Más acciones"
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                component={Link}
                to={`/recomendaciones/${row.id}/editar?${params}`}
                leftSection={<IconEdit size={16} stroke={2} aria-hidden="true" />}
              >
                Editar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      ),
    },
  ];
  const blocked = state.status === "error" && state.access;
  return (
    <>
      <PageHeader
        title="Venta cruzada y upselling"
        description="Configura complementos y alternativas con criterios explícitos."
        actions={
          <Group gap="sm">
            <Button
              component={Link}
              disabled={blocked}
              to={`/recomendaciones/nueva/venta-cruzada?${params}`}
            >
              Crear venta cruzada
            </Button>
            <Button
              component={Link}
              variant="outline"
              disabled={blocked}
              to={`/recomendaciones/nueva/upselling?${params}`}
            >
              Crear upselling
            </Button>
          </Group>
        }
      />
      <Stack gap="lg">
        <PromotionDataNotice kind="recommendations" />
        <FilterBar
          summary={
            state.status === "success"
              ? `${state.result.total} reglas encontradas`
              : "Consulta de reglas"
          }
        >
          <Select
            label="Estado de la regla"
            value={status}
            data={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activa" },
              { value: "inactive", label: "Inactiva" },
            ]}
            onChange={(value) => update("estado", value ?? "all")}
          />
          <Select
            label="Tipo de regla"
            value={kind}
            data={[
              { value: "all", label: "Todos" },
              { value: "cross-sell", label: "Venta cruzada" },
              { value: "upsell", label: "Upselling" },
            ]}
            onChange={(value) => update("tipo", value ?? "all")}
          />
          <Button
            variant="subtle"
            onClick={clear}
            disabled={status === "all" && kind === "all"}
          >
            Limpiar filtros
          </Button>
        </FilterBar>
        <EntityTable
          caption="Reglas de recomendación"
          rows={state.status === "success" ? state.result.items : []}
          columns={columns}
          rowKey={(row) => row.id}
          state={
            state.status === "error"
              ? {
                  status: "error",
                  message: state.message,
                  action: state.access ? undefined : (
                    <Button
                      variant="outline"
                      onClick={retry}
                    >
                      Volver a consultar
                    </Button>
                  ),
                }
              : { status: state.status }
          }
          empty={{
            title:
              status === "all" && kind === "all"
                ? "Todavía no hay reglas"
                : "Sin coincidencias",
            description: "No hay reglas con esta consulta.",
            action: (
              <Button variant="outline" onClick={clear}>
                Restablecer filtros
              </Button>
            ),
          }}
          pagination={
            state.status === "success"
              ? {
                  page: state.result.page,
                  pageSize,
                  total: state.result.total,
                  onChange: (value) => update("pagina", String(value), false),
                }
              : undefined
          }
        />
      </Stack>
    </>
  );
}
