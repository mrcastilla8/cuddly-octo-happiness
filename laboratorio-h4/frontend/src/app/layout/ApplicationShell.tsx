import { Suspense } from "react";
import { AppShell, Box, Group, Stack, Text } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { tokens } from "../../theme/tokens";
import brandLogo from "../../assets/brand/INKA_ATHLETICS.svg";
import { ApplicationNavigation } from "../navigation/ApplicationNavigation";
import classes from "../app.module.css";
import { CommercialModeGate } from "../config/CommercialModeGate";
import { TaxonomyModeGate } from "../config/TaxonomyModeGate";

export function ApplicationShell() {
  return (
    <AppShell
      header={{ height: tokens.layout.header }}
      navbar={{ width: tokens.layout.sidebar, breakpoint: 0 }}
      padding={tokens.layout.padding}
    >
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="lg" gap="lg">
          <Box className={classes.brand}>
            <img
              className={classes.brandLogo}
              src={brandLogo}
              alt="Inka Athletics"
              width={59}
              height={44}
            />
          </Box>
          <Text size="sm">Productos y Ofertas</Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" bg="var(--po-surface)" className={classes.navbar}>
        <Stack gap="lg">
          <Text fw={600} size="sm">
            Navegación
          </Text>
          <ApplicationNavigation />
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main id="contenido" style={{ minWidth: 0 }}>
        <Suspense
          fallback={
            <Text size="sm" role="status">
              Cargando página…
            </Text>
          }
        >
          <CommercialModeGate>
            <TaxonomyModeGate>
              <Outlet />
            </TaxonomyModeGate>
          </CommercialModeGate>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}
