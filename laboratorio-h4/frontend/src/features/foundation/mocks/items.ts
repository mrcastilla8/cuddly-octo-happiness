import type { DemoItem } from "../services/demoRepository";
export const demoItems: readonly DemoItem[] = [
  {
    id: "fixture-01",
    name: "Kit entrenamiento diario",
    reference: "DEMO-001",
    kind: "Ejemplo compuesto",
    status: "active",
  },
  {
    id: "fixture-02",
    name: "Pack running esencial",
    reference: "DEMO-002",
    kind: "Ejemplo compuesto",
    status: "active",
  },
  {
    id: "fixture-03",
    name: "Mochila de entrenamiento",
    reference: "DEMO-003",
    kind: "Ejemplo simple",
    status: "inactive",
  },
  {
    id: "fixture-04",
    name: "Set fitness cardio",
    reference: "DEMO-004",
    kind: "Ejemplo compuesto",
    status: "active",
  },
  {
    id: "fixture-05",
    name: "Botella térmica deportiva",
    reference: "DEMO-005",
    kind: "Ejemplo simple",
    status: "active",
  },
  {
    id: "fixture-06",
    name: "Pack yoga y movilidad",
    reference: "DEMO-006",
    kind: "Ejemplo compuesto",
    status: "inactive",
  },
];
