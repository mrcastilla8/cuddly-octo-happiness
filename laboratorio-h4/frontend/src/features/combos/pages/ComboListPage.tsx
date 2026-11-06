import { useEffect, useRef, useState } from "react";
import { ActionIcon, Button, Group, Menu, Pagination, Select, Skeleton, Table, Text } from "@mantine/core";
import { IconDotsVertical, IconEdit, IconEye, IconPlus, IconPower, IconRefresh } from "@tabler/icons-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, FeedbackAlert, PageHeader, ConfirmDialog } from "../../../components/shared";
import { ComboAvailability } from "../components/ComboAvailability";
import { useCombosRuntime } from "../hooks/useCombosRuntime";
import { formatMoney } from "../services/comboRules";
import { parseComboPage } from "../services/parseComboPage";
import { RequestIdentity } from "../services/requestIdentity";
import type { Combo, ComboPage, ComboStatus } from "../types/combos";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

type ListState =
  | { key: string; status: "loading" }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "success"; result: ComboPage };

export function ComboListPage() {
  const { combos } = useCombosRuntime();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<ListState>({ key: "", status: "loading" });
  const [refresh, setRefresh] = useState(0);
  const revision = useMockStateRevision(["combos", "inventory", "catalog", "pricing"]);
  const [deactivationTarget, setDeactivationTarget] = useState<Combo | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const identity = useRef(new RequestIdentity());
  const rawPage = params.get("pagina");
  const page = parseComboPage(rawPage);
  const rawStatus = params.get("estado");
  const status: ComboStatus | "TODOS" = rawStatus === "ACTIVO" || rawStatus === "INACTIVO" ? rawStatus : "TODOS";
  const scenario = params.get("scenario") ?? undefined;
  const queryKey = JSON.stringify([status, page, scenario, refresh, revision]);

  useEffect(() => {
    if (rawPage !== null && rawPage !== String(page)) {
      const next = new URLSearchParams(params);
      next.set("pagina", String(page));
      setParams(next, { replace: true });
    }
  }, [page, params, rawPage, setParams]);

  useEffect(() => {
    const controller = new AbortController();
    const requests = identity.current;
    const requestId = requests.begin();
    void combos.list({ status, page, pageSize: 5, scenario }, controller.signal).then((result) => {
      if (requests.isCurrent(requestId, controller.signal)) {
        setState({ key: queryKey, status: "success", result });
      }
    }).catch((reason: unknown) => {
      if (requests.isCurrent(requestId, controller.signal)) {
        setState({ key: queryKey, status: "error", message: reason instanceof Error ? reason.message : "No se pudieron consultar los combos." });
      }
    });
    return () => {
      controller.abort();
      requests.invalidate();
    };
  }, [combos, page, queryKey, scenario, status]);

  const currentState = state.key === queryKey ? state : { key: queryKey, status: "loading" as const };
  const result = currentState.status === "success" ? currentState.result : null;
  const rows = result?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((result?.total ?? 0) / 5));

  useEffect(() => {
    if (!result || page <= pageCount) return;
    const next = new URLSearchParams(params);
    if (pageCount > 1) next.set("pagina", String(pageCount));
    else next.delete("pagina");
    setParams(next, { replace: true });
  }, [page, pageCount, params, result, setParams]);

  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "estado") next.delete("pagina");
    setParams(next);
  }

  async function confirmDeactivation() {
    if (!deactivationTarget || deactivating) return;
    setDeactivating(true);
    setMutationError(null);
    try {
      await combos.deactivate(deactivationTarget.id);
      setDeactivationTarget(null);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : "No se pudo desactivar el combo.");
    } finally {
      setDeactivating(false);
    }
  }

  return <>
    <PageHeader title="Gestión de combos" description="Administra las definiciones comerciales y consulta su disponibilidad estimada." breadcrumbs={[{ label: "Catálogo", to: "/productos" }, { label: "Combos" }]} actions={<Button component={Link} to="/combos/nuevo" leftSection={<IconPlus size={18} />}>Crear combo</Button>} />
    <Group justify="space-between" mb="md">
      <Select aria-label="Filtrar por estado" label="Estado" value={status} data={[{ value: "TODOS", label: "Todos" }, { value: "ACTIVO", label: "Activo" }, { value: "INACTIVO", label: "Inactivo" }]} onChange={(value) => change("estado", value === "TODOS" ? "" : value ?? "")} w={220} />
      {currentState.status === "error" && <Button leftSection={<IconRefresh size={16} />} variant="outline" onClick={() => setRefresh((value) => value + 1)}>Reintentar</Button>}
    </Group>
    {mutationError && <FeedbackAlert semantic="error" title="No se pudo desactivar el combo">{mutationError}</FeedbackAlert>}
    {currentState.status === "error" && <FeedbackAlert semantic="error" title="No se pudieron consultar los combos">{currentState.message}</FeedbackAlert>}
    {currentState.status === "loading" ? <Table><Table.Tbody>{[0, 1, 2].map((row) => <Table.Tr key={row}><Table.Td><Skeleton height={18} /></Table.Td><Table.Td><Skeleton height={18} /></Table.Td><Table.Td><Skeleton height={18} /></Table.Td><Table.Td><Skeleton height={18} /></Table.Td><Table.Td><Skeleton height={18} /></Table.Td><Table.Td><Skeleton height={18} /></Table.Td></Table.Tr>)}</Table.Tbody></Table> : currentState.status === "success" && rows.length === 0 ? <EmptyState title="No hay combos para mostrar" description="Crea un combo para definir una oferta comercial compuesta." action={<Button component={Link} to="/combos/nuevo">Crear combo</Button>} /> : currentState.status === "success" && <>
      <Table.ScrollContainer minWidth={1000}><Table highlightOnHover><Table.Thead><Table.Tr><Table.Th>Combo</Table.Th><Table.Th>Precio</Table.Th><Table.Th>Componentes</Table.Th><Table.Th>Disponibilidad estimada</Table.Th><Table.Th>Estado</Table.Th><Table.Th style={{ width: 120, textAlign: "right" }}>Acciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows.map((combo) => <Table.Tr key={combo.id}>
        <Table.Td><Text fw={600}>{combo.name}</Text><Text size="sm" c="dimmed" lineClamp={1}>{combo.description}</Text></Table.Td>
        <Table.Td>{formatMoney(combo.priceMinor)}</Table.Td><Table.Td>{combo.components.length} SKU</Table.Td><Table.Td><ComboAvailability combo={combo} /></Table.Td><Table.Td>{combo.status}</Table.Td>
        <Table.Td style={{ textAlign: "right" }}><Group gap="xs" justify="flex-end" wrap="nowrap"><ActionIcon component={Link} to={`/combos/${combo.id}`} aria-label={`Ver detalle de ${combo.name}`} title="Ver detalle"><IconEye size={16} /></ActionIcon><Menu position="bottom-end" shadow="md"><Menu.Target><ActionIcon aria-label={`Más acciones de ${combo.name}`} title="Más acciones"><IconDotsVertical size={16} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item component={Link} to={`/combos/${combo.id}/editar`} leftSection={<IconEdit size={16} />}>Editar</Menu.Item>{combo.status === "ACTIVO" && <Menu.Item color="danger" leftSection={<IconPower size={16} />} onClick={() => { setMutationError(null); setDeactivationTarget(combo); }}>Desactivar</Menu.Item>}</Menu.Dropdown></Menu></Group></Table.Td>
      </Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>
      <Group justify="space-between" mt="md"><Text size="sm" c="dimmed">{result?.total ?? 0} combos</Text><Pagination value={page} total={pageCount} onChange={(value) => change("pagina", String(value))} /></Group>
    </>}
    <ConfirmDialog opened={deactivationTarget !== null} title="Desactivar combo" confirmLabel="Desactivar combo" destructive submitting={deactivating} onCancel={() => { if (!deactivating) setDeactivationTarget(null); }} onConfirm={() => void confirmDeactivation()} error={mutationError ? <Text c="red" role="alert">{mutationError}</Text> : undefined}>
      {deactivationTarget && <Text>El combo <strong>{deactivationTarget.name}</strong> dejará de ofrecerse para nuevas ventas. Su definición histórica y sus componentes permanecerán conservados.</Text>}
    </ConfirmDialog>
  </>;
}
