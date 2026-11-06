import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import {
  EntityTable,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SearchField,
  SectionCard,
  StatusBadge,
  type TableColumn,
  type TableState,
} from "../../../components/shared";
import { ListaBloqueos } from "../components/ListaBloqueos";
import { useCharacteristicDetail } from "../hooks/useCharacteristicDetail";
import { characteristicConfigDefaults } from "../services/characteristicRepository";
import { characteristicService } from "../services/characteristicService";
import { getPendingCharacteristicValueOperation } from "../adapters/mockCharacteristicAdapter";
import { estadoCaracteristicaSemantic } from "../services/estadoSemantic";
import type { CharacteristicValue, ValorBajaResult } from "../types";

// MK-009-S03: baja de un valor permitido. La pantalla solo transmite la solicitud vía
// servicio y representa el resultado (verificación en curso, rechazo por uso, baja
// confirmada o verificación no concluyente); nunca asume una desactivación inmediata
// por su cuenta y solo muta la tabla ante una confirmación real ("exito"/"confirmada").
type BajaValorUi =
  | { status: "idle" }
  | { status: "verificando"; valor: CharacteristicValue }
  | { status: "pendiente"; result: ValorBajaResult; error?: string }
  | { status: "rechazada"; result: ValorBajaResult }
  | { status: "no-concluyente"; result: ValorBajaResult }
  | { status: "exito"; result: ValorBajaResult }
  | { status: "error"; message: string };

export function CharacteristicValuesPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Característica no encontrada">
        La dirección no incluye una característica para gestionar sus valores.
      </FeedbackAlert>
    );
  }
  return <CharacteristicValuesLoader key={id} id={id} />;
}

function CharacteristicValuesLoader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state, reload } = useCharacteristicDetail(id);

  if (state.status === "loading") {
    return (
      <Group gap="sm" role="status">
        <Loader size="sm" />
        <Text size="sm">Cargando característica…</Text>
      </Group>
    );
  }
  if (state.status === "error") {
    return (
      <FeedbackAlert
        semantic="error"
        title="No se pudo cargar la característica"
        actions={
          <Group gap="sm">
            <Button variant="outline" onClick={reload}>Reintentar consulta</Button>
            <Button variant="outline" onClick={() => navigate("/caracteristicas")}>
              Volver al listado
            </Button>
          </Group>
        }
      >
        {state.message}
      </FeedbackAlert>
    );
  }
  if (state.status === "not-found") {
    return (
      <FeedbackAlert
        semantic="error"
        title="Característica no encontrada"
        actions={
          <Button variant="outline" onClick={() => navigate("/caracteristicas")}>
            Volver al listado
          </Button>
        }
      >
        No existe una característica con ese identificador.
      </FeedbackAlert>
    );
  }

  if (state.detalle.tipo !== "LISTA") {
    return (
      <FeedbackAlert
        semantic="warning"
        title="Esta característica no admite valores"
        actions={
          <Group gap="sm">
            <Button onClick={() => navigate(`/caracteristicas/${state.detalle.id}`)}>
              Ver detalle
            </Button>
            <Button variant="outline" onClick={() => navigate("/caracteristicas")}>
              Volver al listado
            </Button>
          </Group>
        }
      >
        Solo las características de tipo LISTA tienen valores permitidos.
      </FeedbackAlert>
    );
  }

  return <CharacteristicValuesContent detalle={state.detalle} />;
}

function CharacteristicValuesContent({
  detalle,
}: {
  detalle: import("../types").CharacteristicDetail;
}) {
  const navigate = useNavigate();
  const [valores, setValores] = useState<CharacteristicValue[]>([]);
  const [loadingValores, setLoadingValores] = useState(true);
  const [errorValores, setErrorValores] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [agregarError, setAgregarError] = useState<string | null>(null);
  const [renamingValueId, setRenamingValueId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");
  const [renamingError, setRenamingError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renamingMessage, setRenamingMessage] = useState<string | null>(null);
  const [baja, setBaja] = useState<BajaValorUi>({ status: "idle" });
  const bajaControllerRef = useRef<AbortController | null>(null);
  const soloLectura = detalle.estado !== "Activo";
  const valoresActivos = useMemo(
    () => valores.filter((valor) => valor.estado === "Activo").length,
    [valores],
  );
  const maxLista = characteristicConfigDefaults.maxValoresLista;
  const limiteAlcanzado = valoresActivos >= maxLista;
  const valorEnComprobacionId =
    baja.status === "verificando"
      ? baja.valor.valorId
      : baja.status === "pendiente"
        ? baja.result.valor.valorId
        : null;

  const termino = busqueda.trim().toLocaleLowerCase("es");
  const filas = useMemo(
    () =>
      valores.filter(
        (item) =>
          termino === "" ||
          item.nombre.toLocaleLowerCase("es").includes(termino),
      ),
    [valores, termino],
  );

  useEffect(() => {
    const controller = new AbortController();
    const idDetalle = detalle.id;
    characteristicService
      .listarValores(idDetalle, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res) {
          setValores(res);
          const pending = getPendingCharacteristicValueOperation(idDetalle);
          const value = pending
            ? res.find((item) => item.valorId === pending.valorId)
            : undefined;
          if (pending && value)
            setBaja({
              status: "pendiente",
              result: {
                resultado: "pendiente",
                valor: value,
                mensaje: "La solicitud de baja se recuperó después de recargar.",
                bloqueos: [],
                operacionId: pending.operacionId,
              },
            });
        } else {
          setValores([]);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErrorValores(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los valores de la característica.",
        );
        setValores([]);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoadingValores(false);
      });
    return () => controller.abort();
  }, [detalle.id]);

  useEffect(
    () => () => {
      bajaControllerRef.current?.abort();
    },
    [],
  );

  const cargarValores = () => {
    const controller = new AbortController();
    setLoadingValores(true);
    setErrorValores(null);
    characteristicService
      .listarValores(detalle.id, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res) {
          setValores(res);
        } else {
          setValores([]);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErrorValores(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los valores de la característica.",
        );
        setValores([]);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoadingValores(false);
      });
  };

  const handleAgregar = () => {
    if (soloLectura || limiteAlcanzado || baja.status !== "idle") return;
    const nombre = nuevoValor.trim();
    if (nombre === "") {
      setAgregarError("Ingresa el nombre del valor.");
      return;
    }
    const controller = new AbortController();
    setAgregando(true);
    setAgregarError(null);
    characteristicService
      .agregarValor(detalle.id, nombre, controller.signal)
      .then((valor) => {
        setValores((prev) => [...prev, valor]);
        setNuevoValor("");
      })
      .catch((err) => {
        setAgregarError(
          err instanceof Error ? err.message : "No se pudo agregar el valor.",
        );
      })
      .finally(() => {
        setAgregando(false);
      });
  };

  const iniciarRenombrado = (valor: CharacteristicValue) => {
    if (soloLectura || baja.status !== "idle") return;
    setRenamingValueId(valor.valorId);
    setRenamingName(valor.nombre);
    setRenamingError(null);
    setRenamingMessage(null);
  };

  const cancelarRenombrado = () => {
    setRenamingValueId(null);
    setRenamingName("");
    setRenamingError(null);
    setRenaming(false);
  };

  const handleRenombrar = (valor: CharacteristicValue) => {
    if (soloLectura || baja.status !== "idle" || renaming) return;
    const nombre = renamingName.trim();
    if (!nombre) {
      setRenamingError("Ingresa el nombre del valor.");
      return;
    }
    if (nombre === valor.nombre) {
      cancelarRenombrado();
      return;
    }

    const controller = new AbortController();
    setRenaming(true);
    setRenamingError(null);
    setRenamingMessage(null);
    characteristicService
      .renombrarValor(detalle.id, valor.valorId, nombre, controller.signal)
      .then((renombrado) => {
        setValores((prev) =>
          prev.map((item) =>
            item.valorId === renombrado.valorId ? renombrado : item,
          ),
        );
        setRenamingMessage(
          `El valor se renombró en la demostración; se conservó el identificador ${renombrado.valorId}.`,
        );
        cancelarRenombrado();
      })
      .catch((err) => {
        setRenamingError(
          err instanceof Error ? err.message : "No se pudo renombrar el valor.",
        );
      })
      .finally(() => setRenaming(false));
  };

  const handleSolicitarBaja = (valor: CharacteristicValue) => {
    if (soloLectura || baja.status !== "idle" || renaming) return;
    bajaControllerRef.current?.abort();
    const controller = new AbortController();
    bajaControllerRef.current = controller;
    setBaja({ status: "verificando", valor });
    characteristicService
      .solicitarBajaValor(detalle.id, valor.valorId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.resultado === "exito") {
          setValores((prev) =>
            prev.map((item) =>
              item.valorId === result.valor.valorId ? result.valor : item,
            ),
          );
        }
        setBaja({ status: result.resultado, result });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setBaja({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "No se pudo verificar el uso del valor.",
        });
      });
  };

  const cancelarBaja = () => {
    bajaControllerRef.current?.abort();
    bajaControllerRef.current = null;
    setBaja({ status: "idle" });
  };

  const handleConsultarBaja = () => {
    if (baja.status !== "pendiente" || !baja.result.operacionId) return;
    const operacionId = baja.result.operacionId;
    const valorActual = baja.result.valor;
    bajaControllerRef.current?.abort();
    const controller = new AbortController();
    bajaControllerRef.current = controller;
    characteristicService
      .consultarEstadoOperacion(operacionId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const valor = res.valor ?? valorActual;
        if (res.estado === "confirmada") {
          setValores((prev) =>
            prev.map((item) =>
              item.valorId === valor.valorId ? valor : item,
            ),
          );
          setBaja({
            status: "exito",
            result: {
              resultado: "exito",
              valor,
              mensaje: res.mensaje,
              bloqueos: [],
              operacionId,
            },
          });
        } else if (res.estado === "rechazada") {
          setBaja({
            status: "rechazada",
            result: {
              resultado: "rechazada",
              valor,
              mensaje: res.mensaje,
              bloqueos: [],
              operacionId,
            },
          });
        } else if (res.estado === "no-concluyente") {
          setBaja({
            status: "no-concluyente",
            result: {
              resultado: "no-concluyente",
              valor,
              mensaje: res.mensaje,
              bloqueos: [],
              operacionId,
            },
          });
        } else {
          setBaja({
            status: "pendiente",
            result: {
              resultado: "pendiente",
              valor,
              mensaje: res.mensaje,
              bloqueos: [],
              operacionId,
            },
          });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setBaja({
          status: "pendiente",
          result: {
            resultado: "pendiente",
            valor: valorActual,
            mensaje: "No se pudo consultar el estado; puedes reintentar sin reenviar la solicitud.",
            bloqueos: [],
            operacionId,
          },
          error:
            err instanceof Error
              ? err.message
              : "No se pudo consultar el estado de la baja.",
        });
      });
  };

  const columnas: TableColumn<CharacteristicValue>[] = [
    {
      key: "nombre",
      header: "Valor",
      render: (item) => (
        <Stack gap={0}>
          {renamingValueId === item.valorId ? (
            <TextInput
              aria-label={`Nuevo nombre de ${item.nombre}`}
              value={renamingName}
              error={renamingError}
              disabled={renaming}
              onChange={(event) => {
                setRenamingName(event.currentTarget.value);
                setRenamingError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleRenombrar(item);
                }
                if (event.key === "Escape") cancelarRenombrado();
              }}
            />
          ) : (
            <Text size="sm" fw={600}>
              {item.nombre}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      key: "identificador",
      header: "Identificador",
      width: 200,
      render: (item) => <Text size="sm">{item.valorId}</Text>,
    },
    {
      key: "estado",
      header: "Estado",
      width: 140,
      render: (item) => (
        <StatusBadge
          semantic={
            valorEnComprobacionId === item.valorId
              ? "info"
              : estadoCaracteristicaSemantic[item.estado]
          }
        >
          {valorEnComprobacionId === item.valorId
            ? `Comprobando uso · ${item.estado}`
            : item.estado}
        </StatusBadge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      width: 150,
      align: "right",
      render: (item) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          {renamingValueId === item.valorId ? (
            <>
              <ActionIcon
                variant="subtle"
                aria-label={`Guardar nombre de ${item.nombre}`}
                disabled={renaming}
                onClick={() => handleRenombrar(item)}
              >
                <IconCheck size={16} stroke={2} aria-hidden="true" />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                aria-label={`Cancelar renombrado de ${item.nombre}`}
                disabled={renaming}
                onClick={cancelarRenombrado}
              >
                <IconX size={16} stroke={2} aria-hidden="true" />
              </ActionIcon>
            </>
          ) : (
            <>
              <ActionIcon
                variant="subtle"
                aria-label={`Renombrar ${item.nombre}`}
                disabled={soloLectura || baja.status !== "idle" || renaming}
                onClick={() => iniciarRenombrado(item)}
              >
                <IconPencil size={16} stroke={2} aria-hidden="true" />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                disabled={
                  item.estado !== "Activo" ||
                  soloLectura ||
                  baja.status !== "idle" ||
                  renaming
                }
                aria-label={`Solicitar baja de ${item.nombre}`}
                onClick={() => handleSolicitarBaja(item)}
              >
                <IconTrash size={16} stroke={2} aria-hidden="true" />
              </ActionIcon>
            </>
          )}
        </Group>
      ),
    },
  ];

  const tablaState: TableState = loadingValores
    ? { status: "loading" }
    : errorValores
      ? {
          status: "error",
          message: errorValores,
          action: (
            <Button variant="outline" onClick={cargarValores}>
              Volver a intentar
            </Button>
          ),
        }
      : { status: "success" };

  const vacio =
    valores.length === 0
      ? {
          title: "Sin valores permitidos",
          description:
            "Esta característica de tipo LISTA aún no tiene valores definidos.",
        }
      : {
          title: "Sin resultados",
          description: "Ningún valor coincide con la búsqueda.",
        };

  return (
    <>
      <PageHeader
        title={`Valores de: ${detalle.nombre}`}
        description="Gestiona los valores permitidos para una característica tipo LISTA."
        breadcrumbs={[
          { label: "Taxonomía" },
          { label: "Características", to: "/caracteristicas" },
          { label: "Detalle", to: `/caracteristicas/${detalle.id}` },
          { label: "Valores" },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(`/caracteristicas/${detalle.id}`)}>
            Volver al detalle
          </Button>
        }
      />
      <Stack gap="lg">
        {soloLectura && (
          <FeedbackAlert semantic="info" title="Característica inactiva">
            Los valores se muestran en modo de solo lectura. No se admiten nuevas
            altas, renombrados ni bajas.
          </FeedbackAlert>
        )}
        {renamingMessage && (
          <FeedbackAlert semantic="success" title="Valor renombrado">
            {renamingMessage}
          </FeedbackAlert>
        )}

        {baja.status === "verificando" && (
          <FeedbackAlert
            semantic="info"
            title="Comprobando uso del valor"
            actions={
              <Button variant="outline" onClick={cancelarBaja}>
                Cancelar comprobación
              </Button>
            }
          >
            Se está verificando si el valor «{baja.valor.nombre}» está en uso
            por el esquema de un tipo de producto antes de confirmar su baja.
          </FeedbackAlert>
        )}

        {baja.status === "pendiente" && (
          <FeedbackAlert
            semantic={baja.error ? "error" : "warning"}
            title={
              baja.error
                ? "No se pudo consultar el resultado"
                : "Solicitud de baja admitida (202 Accepted)"
            }
            actions={
              <Group gap="sm">
                {baja.result.operacionId && (
                  <Button onClick={handleConsultarBaja}>
                    {baja.error ? "Reintentar consulta" : "Consultar estado"}
                  </Button>
                )}
                {baja.error && (
                  <Button variant="outline" onClick={cancelarBaja}>
                    Cerrar
                  </Button>
                )}
              </Group>
            }
          >
            <Stack gap="sm">
              <Text size="sm">{baja.error ?? baja.result.mensaje}</Text>
              <Text size="sm" c="dimmed">
                El valor conserva su estado actual. La verificación de uso quedó
                en curso y no confirma la desactivación con una sola respuesta.
              </Text>
            </Stack>
          </FeedbackAlert>
        )}

        {baja.status === "rechazada" && (
          <FeedbackAlert
            semantic="error"
            title="No se pudo dar de baja el valor"
            actions={
              <Button onClick={cancelarBaja}>Entendido</Button>
            }
          >
            <Stack gap="sm">
              <Text size="sm">{baja.result.mensaje}</Text>
              {baja.result.bloqueos.length > 0 && (
                <ListaBloqueos bloqueos={baja.result.bloqueos} />
              )}
              <Text size="sm" c="dimmed">
                El valor conserva su estado Activo; no se eliminó ni se
                desactivó nada.
              </Text>
            </Stack>
          </FeedbackAlert>
        )}

        {baja.status === "no-concluyente" && (
          <FeedbackAlert
            semantic="warning"
            title="Verificación no concluyente"
            actions={
              <Button onClick={cancelarBaja}>Entendido</Button>
            }
          >
            <Stack gap="sm">
              <Text size="sm">{baja.result.mensaje}</Text>
              <Text size="sm" c="dimmed">
                No se obtuvo una respuesta determinante. El valor conserva su
                estado actual; no se eliminó ni se desactivó nada.
              </Text>
            </Stack>
          </FeedbackAlert>
        )}

        {baja.status === "exito" && (
          <FeedbackAlert
            semantic="success"
            title="Baja de valor confirmada"
            actions={
              <Button onClick={cancelarBaja}>Continuar</Button>
            }
          >
            <Text size="sm">{baja.result.mensaje}</Text>
          </FeedbackAlert>
        )}

        {baja.status === "error" && (
          <FeedbackAlert
            semantic="error"
            title="No se pudo verificar la baja del valor"
            actions={
              <Button variant="outline" onClick={cancelarBaja}>
                Cerrar
              </Button>
            }
          >
            {baja.message}
          </FeedbackAlert>
        )}

        <SectionCard
          title="Agregar valor permitido"
          description={`Valores permitidos activos: ${valoresActivos} (máx. ${maxLista})`}
        >
          <Stack gap="md">
            {soloLectura && (
              <Text size="sm" c="dimmed">
                Reactiva la característica para administrar sus valores.
              </Text>
            )}
            {limiteAlcanzado && !soloLectura && (
              <FeedbackAlert semantic="warning" title="Límite de valores activos alcanzado">
                Renombra o solicita la baja de un valor existente antes de agregar
                otro.
              </FeedbackAlert>
            )}
            <TextInput
              label="Nombre del valor"
              placeholder="Ej. XL"
              value={nuevoValor}
              error={agregarError}
              disabled={agregando || soloLectura || limiteAlcanzado || baja.status !== "idle"}
              onChange={(e) => {
                setNuevoValor(e.currentTarget.value);
                setAgregarError(null);
              }}
            />
            <Group justify="flex-start">
              <Button
                onClick={handleAgregar}
                loading={agregando}
                disabled={soloLectura || limiteAlcanzado || baja.status !== "idle"}
              >
                Agregar valor
              </Button>
            </Group>
          </Stack>
        </SectionCard>

        <FilterBar summary={`${filas.length} valores visibles`}>
          <Box w={320}>
            <SearchField
              label="Buscar valor"
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre del valor"
            />
          </Box>
        </FilterBar>
        <EntityTable
          caption="Valores permitidos de la característica"
          columns={columnas}
          rows={filas}
          rowKey={(item) => item.valorId}
          state={tablaState}
          minWidth={700}
          empty={vacio}
        />
      </Stack>
    </>
  );
}
