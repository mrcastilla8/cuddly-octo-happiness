import {
  IconBox,
  IconCalculator,
  IconChartBar,
  IconHistory,
  IconCategory,
  IconUpload,
  IconComponents,
  IconForms,
  IconLayoutList,
  IconMessageCircle,
  IconTag,
  IconBrandApple,
  IconSeo,
  IconTicket,
  IconDiscount2,
  IconArrowsShuffle,
  IconPackage,
  IconFileSpreadsheet,
  IconTruckDelivery,
  IconPackages,
  type TablerIcon,
} from "@tabler/icons-react";
export interface NavigationItem {
  to: string;
  label: string;
  icon: TablerIcon;
  group?: string;
  matchPaths?: readonly string[];
}

export const bulkNavigation: NavigationItem[] = [
  {
    to: "/carga-masiva",
    label: "Carga masiva",
    icon: IconUpload,
    group: "Catálogo",
    matchPaths: [
      "/carga-masiva",
      "/carga-masiva/revisar",
      "/carga-masiva/importaciones",
    ],
  },
  {
    to: "/carga-masiva/descargas",
    label: "Descargas y exportación",
    icon: IconFileSpreadsheet,
    group: "Catálogo",
    matchPaths: ["/carga-masiva/descargas"],
  },
];
export const productNavigation: NavigationItem[] = [
  {
    to: "/combos",
    label: "Gestión de combos",
    icon: IconPackage,
    group: "Catálogo",
  },
  {
    to: "/productos",
    label: "Gestión de productos",
    icon: IconPackage,
    group: "Catálogo",
    matchPaths: ["/productos"],
  },
  {
    to: "/recomendaciones",
    label: "Venta cruzada y upselling",
    icon: IconArrowsShuffle,
    group: "Promociones",
  },
  {
    to: "/promociones",
    label: "Ofertas y promociones",
    icon: IconDiscount2,
    group: "Promociones",
  },
  {
    to: "/precios",
    label: "Consultar precios",
    icon: IconCalculator,
    group: "Precios",
  },
  {
    to: "/cupones",
    label: "Cupones de descuento",
    icon: IconTicket,
    group: "Promociones",
  },
  {
    to: "/precios/importar",
    label: "Importar precios",
    icon: IconUpload,
    group: "Precios",
    matchPaths: ["/precios/importaciones"],
  },
  {
    to: "/precios/auditoria",
    label: "Historial de precios",
    icon: IconHistory,
    group: "Precios",
  },
  {
    to: "/inventario",
    label: "Control de stock",
    icon: IconBox,
    group: "Inventario",
    matchPaths: ["/inventario/umbrales"],
  },
  {
    to: "/inventario/traslados",
    label: "Traslados de stock",
    icon: IconTruckDelivery,
    group: "Inventario",
  },
  {
    to: "/inventario/dashboard",
    label: "Dashboard analítico",
    icon: IconChartBar,
    group: "Inventario",
  },
];
export const taxonomyNavigation: NavigationItem[] = [
  { to: "/categorias", label: "Categorías", icon: IconCategory },
  { to: "/caracteristicas", label: "Características", icon: IconTag },
  { to: "/tipos-producto", label: "Tipos de producto", icon: IconPackages },
  { to: "/marcas", label: "Marcas", icon: IconBrandApple },
  { to: "/seo", label: "SEO", icon: IconSeo },
];
export const demoNavigation: NavigationItem[] = [
  {
    to: "/foundation/listados",
    label: "Listados y filtros",
    icon: IconLayoutList,
  },
  { to: "/foundation/formularios", label: "Formularios", icon: IconForms },
  {
    to: "/foundation/estados",
    label: "Mensajes y estados",
    icon: IconMessageCircle,
  },
  {
    to: "/foundation/pricing",
    label: "Componentes Pricing",
    icon: IconComponents,
  },
];
