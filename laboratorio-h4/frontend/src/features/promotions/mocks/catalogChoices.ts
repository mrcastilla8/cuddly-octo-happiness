import type {
  CatalogCategoryChoice,
  CatalogProductChoice,
} from "../services/catalogRepository";
export const catalogProducts: readonly CatalogProductChoice[] = [
  {
    id: "running-essential",
    name: "Running Essential",
    active: true,
    categoryId: "running",
    skus: [
      { sku: "SKU-RUN-ESS-40", label: "Talla 40", active: true },
      { sku: "SKU-RUN-ESS-42", label: "Talla 42", active: true },
      {
        sku: "SKU-RUN-ESS-44",
        label: "Talla 44 · Nueva variante",
        active: true,
      },
    ],
  },
  {
    id: "running-pro",
    name: "Running Pro",
    active: true,
    categoryId: "running",
    skus: [{ sku: "RUN-PRO-42", label: "Talla 42", active: true }],
  },
  {
    id: "medias-tecnicas",
    name: "Medias técnicas",
    active: true,
    categoryId: "accessories",
    skus: [{ sku: "CAL-MED-01", label: "Medias técnicas", active: true }],
  },
  {
    id: "cinturon",
    name: "Cinturón de hidratación",
    active: true,
    categoryId: "accessories",
    skus: [
      { sku: "ACC-CIN-02", label: "Cinturón de hidratación", active: true },
    ],
  },
  {
    id: "gorra",
    name: "Gorra deportiva Inka Shield",
    active: true,
    categoryId: "accessories",
    skus: [{ sku: "SKU-GOR-UNI", label: "Talla única", active: true }],
  },
  {
    id: "retired",
    name: "Modelo retirado",
    active: false,
    categoryId: "running",
    skus: [{ sku: "RETIRADO-01", label: "Inactivo", active: false }],
  },
];
export const catalogCategories: readonly CatalogCategoryChoice[] = [
  { id: "running", name: "Running", active: true },
  { id: "accessories", name: "Accesorios", active: true },
  { id: "retired-category", name: "Categoría retirada", active: false },
];
