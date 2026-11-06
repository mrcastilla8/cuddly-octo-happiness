import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ActionIcon, Avatar, Button, Group, Stack, Text } from "@mantine/core";
import { IconEye, IconPlus } from "@tabler/icons-react";
import {
  EntityTable,
  FeedbackAlert,
  PageHeader,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { useProductList } from "../hooks/useProductList";
import { ProductFilters } from "../components/ProductFilters";
import {
  productStatusLabel,
  readCatalogScenario,
  readPositiveInteger,
} from "../services/catalogPresentation";
import type { CatalogQuery, ProductView } from "../services/catalogRepository";
import { useTaxonomyFilters } from "../hooks/useTaxonomyFilters";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [revision, setRevision] = useState(0);
  const mockRevision = useMockStateRevision([
    "catalog",
    "taxonomy",
    "taxonomy-categories",
    "taxonomy-brands",
    "taxonomy-product-types",
  ]);
  const effectiveRevision = revision + mockRevision;
  const taxonomy = useTaxonomyFilters(effectiveRevision);

  const query: CatalogQuery = {
    q: params.get("q") || undefined,
    categoryId: params.get("categoriaId") || "all",
    typeId: params.get("tipoId") || "all",
    saleModel: (params.get("modelo") as CatalogQuery["saleModel"]) || "all",
    status: (params.get("estado") as CatalogQuery["status"]) || "all",
    page: readPositiveInteger(params.get("pagina"), 1),
    pageSize: readPositiveInteger(params.get("tamanio"), 10, 100),
  };

  const scenario = readCatalogScenario(params);
  const state = useProductList(query, scenario, effectiveRevision);

  const updateQuery = (patch: Partial<CatalogQuery>) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (patch.q !== undefined) {
        if (!patch.q.trim()) next.delete("q");
        else next.set("q", patch.q.trim());
      }
      if (patch.categoryId !== undefined) {
        if (patch.categoryId === "all") next.delete("categoriaId");
        else next.set("categoriaId", patch.categoryId);
      }
      if (patch.typeId !== undefined) {
        if (patch.typeId === "all") next.delete("tipoId");
        else next.set("tipoId", patch.typeId);
      }
      if (patch.saleModel !== undefined) {
        if (patch.saleModel === "all") next.delete("modelo");
        else next.set("modelo", patch.saleModel);
      }
      if (patch.status !== undefined) {
        if (patch.status === "all") next.delete("estado");
        else next.set("estado", patch.status);
      }
      if (patch.page !== undefined) {
        if (patch.page === 1) next.delete("pagina");
        else next.set("pagina", String(patch.page));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("q");
      next.delete("categoriaId");
      next.delete("tipoId");
      next.delete("modelo");
      next.delete("estado");
      next.delete("pagina");
      return next;
    });
  };

  const handleRetry = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("escenario");
        return next;
      },
      { replace: true },
    );
    setRevision((v) => v + 1);
  };

  const hasSearchOrFilters = Boolean(
    query.q ||
      query.categoryId !== "all" ||
      query.typeId !== "all" ||
      query.saleModel !== "all" ||
      query.status !== "all",
  );

  const columns: TableColumn<ProductView>[] = [
    {
      key: "name",
      header: "PRODUCTO",
      width: 280,
      render: (row) => (
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={row.imageUrl}
            alt={row.name}
            radius="sm"
            size="md"
            color="gray"
          >
            {row.name.slice(0, 2).toUpperCase()}
          </Avatar>
          <div>
            <Text fw={600} size="sm" lineClamp={1}>
              {row.name}
            </Text>
            <Text size="xs" c="dimmed">
              {row.categoryName} · {row.typeName}
            </Text>
          </div>
        </Group>
      ),
    },
    {
      key: "skuBase",
      header: "SKU BASE",
      width: 160,
      render: (row) => (
        <Text size="sm" ff="monospace" fw={500} c="dimmed">
          {row.skuBase ?? "Sin SKU base"}
        </Text>
      ),
    },
    {
      key: "hasVariants",
      header: "MODELO DE VENTA",
      width: 160,
      render: (row) => (
        <StatusBadge semantic="neutral" size="sm">
          {row.hasVariants ? "Con variantes" : "Simple"}
        </StatusBadge>
      ),
    },
    {
      key: "preparationSummary",
      header: "PREPARACIÓN",
      width: 160,
      render: (row) => {
        switch (row.preparationSummary) {
          case "COMPLETED":
            return (
              <StatusBadge semantic="success" size="sm">
                Completada
              </StatusBadge>
            );
          case "PARTIAL":
            return (
              <StatusBadge semantic="warning" size="sm">
                Parcial
              </StatusBadge>
            );
          case "REJECTED":
            return (
              <StatusBadge semantic="error" size="sm">
                Rechazada
              </StatusBadge>
            );
          default:
            return (
              <StatusBadge semantic="info" size="sm">
                En curso
              </StatusBadge>
            );
        }
      },
    },
    {
      key: "status",
      header: "ESTADO",
      width: 140,
      render: (row) => {
        return (
          <StatusBadge semantic="neutral" size="sm">
            {productStatusLabel(row.status)}
          </StatusBadge>
        );
      },
    },
    {
      key: "actions",
      header: "ACCIONES",
      width: 80,
      align: "right",
      render: (row) => (
        <ActionIcon
          component={Link}
          to={{ pathname: `/productos/${row.id}`, search: location.search }}
          aria-label={`Ver detalle de ${row.name}`}
          title="Ver detalle"
        >
          <IconEye size={16} />
        </ActionIcon>
      ),
    },
  ];

  if (state.status === "forbidden" || state.status === "session") {
    return (
      <Stack gap="xl">
        <PageHeader
          title="Gestión de productos"
          breadcrumbs={[
            { label: "Inicio", to: "/precios" },
            { label: "Catálogo", to: "/productos" },
            { label: "Productos" },
          ]}
        />
        <FeedbackAlert
          semantic="error"
          title={state.status === "forbidden" ? "Acceso denegado" : "Sesión expirada"}
        >
          {state.error}
        </FeedbackAlert>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <PageHeader
        title="Gestión de productos"
        description="Administra productos simples y productos con variantes. Consulta el estado de catálogo y las preparaciones antes de publicar."
        breadcrumbs={[
          { label: "Inicio", to: "/precios" },
          { label: "Catálogo", to: "/productos" },
          { label: "Productos" },
        ]}
        actions={
          <Button
            component={Link}
            to="/productos/nuevo"
            leftSection={<IconPlus size={16} />}
          >
            Crear producto
          </Button>
        }
      />

      {taxonomy.loading && <Text size="sm">Cargando filtros de Taxonomía...</Text>}
      {taxonomy.error && <FeedbackAlert semantic="error" title="Error al cargar filtros"
        actions={<Button variant="outline" onClick={handleRetry}>Reintentar filtros</Button>}>
        {taxonomy.error}
      </FeedbackAlert>}
      <ProductFilters
        loading={taxonomy.loading}
        query={query}
        categories={taxonomy.categories}
        productTypes={taxonomy.productTypes}
        total={state.data?.total || 0}
        shownCount={state.data?.items.length || 0}
        onChange={updateQuery}
        onClear={clearFilters}
      />

      {state.status === "error" ? (
        <FeedbackAlert
          semantic="error"
          title="Error al consultar productos"
          actions={
            <Button size="xs" variant="outline" onClick={handleRetry}>
              Reintentar consulta
            </Button>
          }
        >
          {state.error || "No se pudieron consultar los productos. Los filtros se conservan."}
        </FeedbackAlert>
      ) : (
        <EntityTable<ProductView>
          caption="Listado de productos"
          columns={columns}
          rows={state.data?.items || []}
          rowKey={(row) => row.id}
          state={{ status: state.status === "loading" ? "loading" : "success" }}
          empty={{
            title: hasSearchOrFilters
              ? "No hay productos con estos filtros"
              : "Aún no hay productos",
            description: hasSearchOrFilters
              ? "Intenta modificando los criterios de búsqueda o limpiando los filtros seleccionados."
              : "Crea tu primer producto para comenzar a gestionar el catálogo.",
            action: hasSearchOrFilters ? (
              <Button variant="outline" size="xs" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button
                component={Link}
                to="/productos/nuevo"
                size="xs"
                leftSection={<IconPlus size={14} />}
              >
                Crear producto
              </Button>
            ),
          }}
          pagination={
            state.data && state.data.total > query.pageSize
              ? {
                  page: query.page,
                  pageSize: query.pageSize,
                  total: state.data.total,
                  onChange: (page) => updateQuery({ page }),
                }
              : undefined
          }
        />
      )}
    </Stack>
  );
}
