import { Button, Skeleton, Stack } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { FeedbackAlert } from "../../../components/shared";
import type { InventoryAlert } from "../services/inventoryTypes";

interface DashboardAlertsProps {
  alerts: InventoryAlert[];
  loading?: boolean;
  error?: string | null;
  blockedReason?: string | null;
  onRetry?: () => void;
}

export function DashboardAlerts({
  alerts,
  loading,
  error,
  blockedReason,
  onRetry,
}: DashboardAlertsProps) {
  if (blockedReason) {
    return (
      <FeedbackAlert
        semantic="warning"
        title="Alertas no verificables con el contrato vigente"
      >
        {blockedReason}
      </FeedbackAlert>
    );
  }

  if (error) {
    return (
      <FeedbackAlert
        semantic="error"
        title="No se pudieron cargar las alertas"
        actions={
          onRetry && (
            <Button size="xs" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          )
        }
      >
        {error}
      </FeedbackAlert>
    );
  }

  if (loading) {
    return (
      <Stack gap="sm">
        <Skeleton height={64} radius="sm" />
        <Skeleton height={64} radius="sm" />
      </Stack>
    );
  }

  if (alerts.length === 0) {
    return (
      <FeedbackAlert semantic="success" title="Sin alertas operativas activas">
        No se registran faltantes, roturas críticas ni traslados con discrepancia en el inventario actual.
      </FeedbackAlert>
    );
  }

  return (
    <Stack gap="sm">
      {alerts.map((alt) => (
        <FeedbackAlert
          key={alt.id}
          semantic={alt.severity}
          title={alt.title}
          actions={
            <Button
              component={Link}
              to={alt.targetRoute}
              size="sm"
              variant="subtle"
              rightSection={<IconArrowRight size={14} />}
            >
              {alt.actionLabel}
            </Button>
          }
        >
          {alt.message}
        </FeedbackAlert>
      ))}
    </Stack>
  );
}
