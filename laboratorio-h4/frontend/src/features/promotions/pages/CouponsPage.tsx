import { usePromotionServices } from "../hooks/usePromotionServices";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import { Link, useSearchParams } from "react-router-dom";
import { ActionIcon, Button, Group, Menu, Select, Stack, Text } from "@mantine/core";
import { IconDotsVertical, IconEdit, IconEye } from "@tabler/icons-react";
import {
  EntityTable,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { useCouponList } from "../hooks/useCoupons";
import {
  couponLimitLabel,
  couponStatusLabel,
  couponUsageLabel,
  readPositiveInteger,
} from "../services/couponPresentation";
import type { CouponQuery, CouponView } from "../services/couponRepository";

export function CouponsPage() {
  const [params, setParams] = useSearchParams();
  const { services, revision, retry } = usePromotionServices();
  const status = params.get("estado");
  const query: CouponQuery = {
    status: status === "active" || status === "inactive" ? status : "all",
    page: readPositiveInteger(params.get("pagina"), 1, Number.MAX_SAFE_INTEGER),
    pageSize: readPositiveInteger(params.get("tamanio"), 10, 100),
  };
  const state = useCouponList(query, services.coupons, revision);
  const update = (status: CouponQuery["status"], page = 1) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (status === "all") next.delete("estado");
      else next.set("estado", status);
      if (page === 1) next.delete("pagina");
      else next.set("pagina", String(page));
      return next;
    });
  const columns: TableColumn<CouponView>[] = [
    {
      key: "code",
      header: "Código",
      width: 180,
      render: (row) => (
        <Text fw={600} size="sm">
          {row.code}
        </Text>
      ),
    },
    {
      key: "promotion",
      header: "Promoción asociada",
      width: 240,
      render: (row) => row.promotion?.name ?? "No disponible",
    },
    {
      key: "status",
      header: "Estado",
      width: 120,
      render: (row) => (
        <StatusBadge>{couponStatusLabel(row.status)}</StatusBadge>
      ),
    },
    {
      key: "uses",
      header: "Uso global",
      width: 140,
      align: "right",
      render: (row) => couponUsageLabel(row.consumedUses),
    },
    {
      key: "limit",
      header: "Límite global",
      width: 140,
      align: "right",
      render: (row) => couponLimitLabel(row.globalLimit),
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
            to={`/cupones/${row.id}?${params.toString()}`}
            aria-label={`Ver detalle de ${row.code}`}
            title="Ver detalle"
          >
            <IconEye size={16} stroke={2} aria-hidden="true" />
          </ActionIcon>
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon
                aria-label={`Más acciones de ${row.code}`}
                title="Más acciones"
              >
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                component={Link}
                to={`/cupones/${row.id}/editar?${params}`}
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
  const accessBlocked =
    state.status === "error" && state.kind !== "unavailable";
  return (
    <>
      <PageHeader
        actions={
          <Button
            component={Link}
            to={`/cupones/nuevo?${params.toString()}`}
            disabled={accessBlocked}
          >
            Crear cupón
          </Button>
        }
        title="Cupones de descuento"
        description="Consulta la configuración, los límites y el uso global de los cupones."
        breadcrumbs={[
          { label: "Promociones" },
          { label: "Cupones de descuento" },
        ]}
      />
      <Stack gap="lg">
        <PromotionDataNotice kind="coupons" />
        {state.status === "success" && state.result.items.some(row => row.relatedDataUnavailable) && (
          <FeedbackAlert semantic="warning" title="Datos relacionados no disponibles">
            Los cupones se consultaron correctamente. No se pudo consultar la
            promoción de algunos registros; sus datos complementarios figuran
            como no disponibles.
          </FeedbackAlert>
        )}
        <FilterBar
          summary={
            state.status === "success"
              ? `${state.result.total} cupones encontrados`
              : "Consulta de cupones"
          }
        >
          <Select
            label="Estado del cupón"
            value={query.status}
            data={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
            onChange={(value) => {
              if (value === "all" || value === "active" || value === "inactive")
                update(value);
            }}
          />
          <Button
            variant="subtle"
            disabled={query.status === "all"}
            onClick={() => update("all")}
          >
            Limpiar filtros
          </Button>
        </FilterBar>
        {accessBlocked ? (
          <FeedbackAlert
            semantic="warning"
            title={
              state.kind === "session"
                ? "Verifica tu sesión"
                : "Acceso no disponible"
            }
          >
            {state.message}
          </FeedbackAlert>
        ) : (
          <EntityTable
            caption="Cupones de descuento"
            columns={columns}
            rows={state.status === "success" ? state.result.items : []}
            rowKey={(row) => row.id}
            state={
              state.status === "error"
                ? {
                    ...state,
                    action: (
                      <Button variant="outline" onClick={retry}>
                        Volver a consultar
                      </Button>
                    ),
                  }
                : { status: state.status }
            }
            empty={{
              title:
                query.status === "all"
                  ? "Todavía no hay cupones"
                  : "Sin coincidencias",
              description:
                query.status === "all"
                  ? "No hay cupones registrados en esta consulta."
                  : "No hay cupones con el estado seleccionado.",
              action:
                query.status !== "all" ? (
                  <Button variant="outline" onClick={() => update("all")}>
                    Restablecer filtros
                  </Button>
                ) : undefined,
            }}
            pagination={
              state.status === "success"
                ? {
                    page: state.result.page,
                    pageSize: query.pageSize,
                    total: state.result.total,
                    onChange: (page) => update(query.status, page),
                  }
                : undefined
            }
          />
        )}
      </Stack>
    </>
  );
}
