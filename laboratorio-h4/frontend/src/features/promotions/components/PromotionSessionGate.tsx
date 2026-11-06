import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { FeedbackAlert, SectionCard } from "../../../components/shared";
import type { G7Session } from "../adapters/g7Session";

export function PromotionSessionGate({
  session,
  children,
}: {
  session: G7Session;
  children: ReactNode;
}) {
  const view = useSyncExternalStore(session.subscribe, session.snapshot);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [codigo, setCodigo] = useState("");
  if (view.user)
    return (
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm">Sesión de {view.user.nombreCompleto}</Text>
          <Button
            variant="default"
            onClick={() => {
              void session.logout();
            }}
          >
            Cerrar sesión
          </Button>
        </Group>
        {children}
      </Stack>
    );
  return (
    <SectionCard
      title="Iniciar sesión"
      description="Identifícate para administrar promociones, cupones y recomendaciones."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (view.busy) return;
          if (view.mfa) {
            void session.verifyCode(codigo);
            setCodigo("");
          } else {
            void session.login(correo, contrasena);
            setContrasena("");
          }
        }}
      >
        <Stack gap="md">
          {view.notice && (
            <FeedbackAlert semantic="info" title="Sesión">
              {view.notice}
            </FeedbackAlert>
          )}
          {view.mfa ? (
            <>
              <Text>
                Confirma tu identidad con el código que recibirás por correo.
              </Text>
              <Button
                variant="default"
                disabled={view.busy}
                onClick={() => {
                  void session.sendCode();
                }}
              >
                Enviar código al correo
              </Button>
              <TextInput
                label="Código de verificación"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={codigo}
                onChange={(event) => setCodigo(event.currentTarget.value)}
                disabled={view.busy}
              />
              <Button type="submit" loading={view.busy}>
                Verificar código
              </Button>
              <Button
                variant="subtle"
                disabled={view.busy}
                onClick={() => {
                  void session.logout();
                }}
              >
                Volver al inicio de sesión
              </Button>
            </>
          ) : (
            <>
              <TextInput
                label="Correo electrónico"
                type="email"
                autoComplete="username"
                required
                value={correo}
                onChange={(event) => setCorreo(event.currentTarget.value)}
                disabled={view.busy}
              />
              <PasswordInput
                label="Contraseña"
                autoComplete="current-password"
                required
                value={contrasena}
                onChange={(event) => setContrasena(event.currentTarget.value)}
                disabled={view.busy}
              />
              <Button type="submit" loading={view.busy}>
                Iniciar sesión
              </Button>
            </>
          )}
        </Stack>
      </form>
    </SectionCard>
  );
}
