import { Button, Select, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { EmptyState, FeedbackAlert } from "../../../components/shared";
import { usePricingContext } from "../hooks/usePricingContext";
import { useEditableRead } from "../hooks/usePriceEdit";
import { PricingPageFrame } from "../components/PricingPageFrame";
import { PriceEditForm } from "../components/PriceEditForm";

export function EditPricePage() {
  return (
    <PricingPageFrame
      title="Editar precio"
      description="Revisa el objetivo y su versión antes de confirmar una propuesta."
    >
      <EditContent />
    </PricingPageFrame>
  );
}
function EditContent() {
  const context = usePricingContext();
  const scope =
    context.target?.kind === "variant" &&
    context.params.get("scope") !== "product"
      ? "sku"
      : "product";
  const parentId =
    context.target?.kind === "variant"
      ? context.target.productTargetId
      : context.target?.id;
  const target = {
    targetId: scope === "product" ? (parentId ?? "") : context.query.targetId,
    channel: scope === "product" ? ("global" as const) : context.query.channel,
  };
  const read = useEditableRead(target);
  return (
    <>
      <Select
        label="Alcance del precio"
        value={scope}
        data={[
          { value: "product", label: "Precio base del producto" },
          ...(context.target?.kind === "variant"
            ? [
                {
                  value: "sku",
                  label: "Precio específico del SKU seleccionado",
                },
              ]
            : []),
        ]}
        onChange={(value) =>
          context.setParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("scope", value === "sku" ? "sku" : "product");
            return next;
          })
        }
        maw={480}
      />
      {read.state.status === "loading" && (
        <Text size="sm" role="status">
          Cargando objetivo de escritura…
        </Text>
      )}
      {read.state.status === "error" && (
        <FeedbackAlert semantic="error" title="Lectura requerida para editar">
          {read.state.message} La mutación está bloqueada.
        </FeedbackAlert>
      )}
      {read.state.status === "success" &&
        (read.state.result ? (
          <PriceEditForm
            key={`${target.targetId}:${target.channel}:${read.state.result.version}`}
            target={target}
            initial={read.state.result}
            back={`/precios${context.suffix}`}
          />
        ) : (
          <EmptyState
            title="Sin precio para editar"
            description="Selecciona un objetivo con una lectura disponible."
            action={
              <Button
                component={Link}
                to={`/precios${context.suffix}`}
                variant="outline"
              >
                Volver a precios
              </Button>
            }
          />
        ))}
    </>
  );
}
