import { useParams } from "react-router-dom";
import { Button, Group, Loader, Stack, Table, Text } from "@mantine/core";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { FeedbackAlert, PageHeader, SectionCard, StatusBadge } from "../../../components/shared";
import { useProductTypeSchema } from "../hooks/useProductTypeSchema";

export function ProductTypeSchemaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Esquema no disponible">
        La dirección no incluye un tipo de producto para consultar.
      </FeedbackAlert>
    );
  }
  return <ProductTypeSchemaContent key={id} id={id} onBack={() => navigate("/tipos-producto")} />;
}

function ProductTypeSchemaContent({ id, onBack }: { id: string; onBack: () => void }) {
  const { state, reload } = useProductTypeSchema(id);
  if (state.status === "loading") {
    return (
      <Stack gap="lg">
        <PageHeader title="Esquema del tipo de producto" breadcrumbs={[{ label: "Catálogo" }, { label: "Tipos de producto", to: "/tipos-producto" }]} />
        <SectionCard title="Cargando esquema">
          <Group><Loader size="sm" /><Text role="status">Consultando el esquema vigente…</Text></Group>
        </SectionCard>
      </Stack>
    );
  }
  if (state.status === "not-found") {
    return <FeedbackAlert semantic="error" title="Tipo de producto no encontrado" actions={<Button leftSection={<IconArrowLeft size={16} />} onClick={onBack}>Volver al listado</Button>}>No existe un esquema para el tipo de producto solicitado.</FeedbackAlert>;
  }
  if (state.status === "error") {
    return <FeedbackAlert semantic="error" title="No se pudo cargar el esquema" actions={<Button leftSection={<IconRefresh size={16} />} onClick={reload}>Volver a intentar</Button>}>{state.message}</FeedbackAlert>;
  }

  const { esquema } = state;
  return (
    <>
      <PageHeader
        title={esquema.tipoProducto.nombre}
        description="Consulta de solo lectura del esquema efectivo de características."
        breadcrumbs={[{ label: "Catálogo" }, { label: "Tipos de producto", to: "/tipos-producto" }, { label: esquema.tipoProducto.nombre }]}
        actions={<Button variant="outline" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>Volver al listado</Button>}
      />
      <Stack gap="lg">
        <SectionCard title="Datos del tipo">
          <Group gap="xs">
            <Text size="sm">Estado:</Text>
            <StatusBadge semantic="neutral">{esquema.tipoProducto.estado === "ACTIVO" ? "Activo" : "Inactivo"}</StatusBadge>
            <Text size="sm">Versión del esquema: {esquema.schemaVersion}</Text>
          </Group>
        </SectionCard>
        <SectionCard title="Características asociadas">
          {esquema.caracteristicas.length === 0 ? (
            <Text size="sm">Este tipo de producto no tiene características asociadas.</Text>
          ) : (
            <Table.ScrollContainer minWidth={780}>
              <Table striped={false} highlightOnHover={false}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Característica</Table.Th>
                    <Table.Th>Tipo de dato</Table.Th>
                    <Table.Th>Unidad</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Condición</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {esquema.caracteristicas.map((asociacion) => (
                    <Table.Tr key={asociacion.caracteristicaId}>
                      <Table.Td>{asociacion.caracteristica?.nombre ?? "Característica no disponible"}</Table.Td>
                      <Table.Td>{asociacion.caracteristica?.tipo ?? "No disponible"}</Table.Td>
                      <Table.Td>{asociacion.caracteristica?.unidadMedida ?? "No aplica"}</Table.Td>
                      <Table.Td>{asociacion.estado === "ACTIVO" ? "Activa" : "Inactiva"}</Table.Td>
                      <Table.Td>{asociacion.obligatoria ? "Obligatoria" : "Opcional"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </SectionCard>
      </Stack>
    </>
  );
}
