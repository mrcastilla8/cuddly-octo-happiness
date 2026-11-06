import type {
  TaxonomyBrand,
  TaxonomyCategory,
  TaxonomyProductType,
  AttributeSchema,
} from "../services/taxonomyRepository";

export const initialCategories: TaxonomyCategory[] = [
  { id: "CAT-ROPA", nombre: "Ropa", activo: true },
  { id: "CAT-CALZADO", nombre: "Calzado", activo: true },
  { id: "CAT-ACC", nombre: "Accesorios", activo: true },
];

export const initialBrands: TaxonomyBrand[] = [
  { id: "BRD-INKA", nombre: "Inka Athletic", activo: true },
  { id: "BRD-ANDES", nombre: "Andean Peak", activo: true },
  { id: "BRD-QENTE", nombre: "Q'ente Sport", activo: true },
];

export const initialProductTypes: TaxonomyProductType[] = [
  { id: "TIP-CAMISETA", nombre: "Camiseta deportiva", activo: true },
  { id: "TIP-CASACA", nombre: "Casaca", activo: true },
  { id: "TIP-ZAPATILLA", nombre: "Zapatilla", activo: true },
  { id: "TIP-MOCHILA", nombre: "Mochila", activo: true },
];

export const attributeSchemasByType: Record<string, AttributeSchema[]> = {
  "TIP-CAMISETA": [
    {
      caracteristicaId: "CAR-COLOR",
      nombre: "Color principal",
      tipo: "LISTA",
      obligatorio: true,
      esIdentificadora: true,
      opciones: [
        { id: "COL-BLA", valor: "Blanco" },
        { id: "COL-AZU", valor: "Azul Índigo" },
        { id: "COL-NEG", valor: "Negro Ónix" },
        { id: "COL-ROJ", valor: "Rojo Carmesí" },
      ],
    },
    {
      caracteristicaId: "CAR-TALLA",
      nombre: "Talla",
      tipo: "LISTA",
      obligatorio: true,
      esIdentificadora: true,
      opciones: [
        { id: "TAL-S", valor: "S" },
        { id: "TAL-M", valor: "M" },
        { id: "TAL-L", valor: "L" },
        { id: "TAL-XL", valor: "XL" },
      ],
    },
    {
      caracteristicaId: "CAR-MAT",
      nombre: "Material principal",
      tipo: "TEXTO",
      obligatorio: true,
      esIdentificadora: false,
    },
    {
      caracteristicaId: "CAR-CUELLO",
      nombre: "Circunferencia de cuello",
      tipo: "NUMERO",
      obligatorio: false,
      unidad: "cm",
      esIdentificadora: false,
    },
    {
      caracteristicaId: "CAR-CORTE",
      nombre: "Tipo de corte",
      tipo: "LISTA",
      obligatorio: true,
      esIdentificadora: false,
      opciones: [
        { id: "VAL-REG", valor: "Regular Fit" },
        { id: "VAL-SLIM", valor: "Slim Fit" },
        { id: "VAL-RELAX", valor: "Relaxed Fit" },
      ],
    },
  ],
  "TIP-CASACA": [
    {
      caracteristicaId: "CAR-IMP",
      nombre: "Nivel de impermeabilidad",
      tipo: "TEXTO",
      obligatorio: true,
    },
    {
      caracteristicaId: "CAR-TERM",
      nombre: "Resistencia térmica",
      tipo: "NUMERO",
      obligatorio: false,
      unidad: "°C",
    },
    {
      caracteristicaId: "CAR-CIERRE",
      nombre: "Tipo de cierre",
      tipo: "LISTA",
      obligatorio: true,
      opciones: [
        { id: "VAL-CREM", valor: "Cremallera sellada" },
        { id: "VAL-BOT", valor: "Botones a presión" },
      ],
    },
  ],
  "TIP-ZAPATILLA": [
    {
      caracteristicaId: "CAR-COLOR",
      nombre: "Color principal",
      tipo: "LISTA",
      obligatorio: true,
      esIdentificadora: true,
      opciones: [
        { id: "COL-NEG", valor: "Negro Ónix" },
        { id: "COL-GRI", valor: "Gris Grafito" },
        { id: "COL-AZU", valor: "Azul Marino" },
      ],
    },
    {
      caracteristicaId: "CAR-TALLA",
      nombre: "Talla",
      tipo: "LISTA",
      obligatorio: true,
      esIdentificadora: true,
      opciones: [
        { id: "TAL-39", valor: "39" },
        { id: "TAL-40", valor: "40" },
        { id: "TAL-41", valor: "41" },
        { id: "TAL-42", valor: "42" },
        { id: "TAL-43", valor: "43" },
      ],
    },
    {
      caracteristicaId: "CAR-SUELA",
      nombre: "Material de suela",
      tipo: "TEXTO",
      obligatorio: true,
      esIdentificadora: false,
    },
    {
      caracteristicaId: "CAR-DROP",
      nombre: "Drop del talón",
      tipo: "NUMERO",
      obligatorio: false,
      unidad: "mm",
    },
    {
      caracteristicaId: "CAR-PISADA",
      nombre: "Tipo de pisada",
      tipo: "LISTA",
      obligatorio: true,
      opciones: [
        { id: "VAL-NEU", valor: "Neutra" },
        { id: "VAL-PRO", valor: "Pronadora" },
        { id: "VAL-SUP", valor: "Supinadora" },
      ],
    },
  ],
  "TIP-MOCHILA": [
    {
      caracteristicaId: "CAR-CAP",
      nombre: "Capacidad",
      tipo: "NUMERO",
      obligatorio: true,
      unidad: "litros",
    },
    {
      caracteristicaId: "CAR-COMP",
      nombre: "Compartimento para laptop",
      tipo: "LISTA",
      obligatorio: true,
      opciones: [
        { id: "VAL-SI", valor: "Sí (hasta 15.6\")" },
        { id: "VAL-NO", valor: "No" },
      ],
    },
  ],
};
