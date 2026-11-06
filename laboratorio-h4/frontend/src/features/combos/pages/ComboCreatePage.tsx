import { Button } from "@mantine/core";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/shared";
import { ComboEditor } from "../components/ComboEditor";

export function ComboCreatePage() {
  return <>
    <PageHeader title="Crear combo" description="Configura sus componentes directos y establece el precio comercial." breadcrumbs={[{ label: "Combos", to: "/combos" }, { label: "Crear combo" }]} actions={<Button component={Link} to="/combos" variant="outline">Volver a combos</Button>} />
    <ComboEditor />
  </>;
}
