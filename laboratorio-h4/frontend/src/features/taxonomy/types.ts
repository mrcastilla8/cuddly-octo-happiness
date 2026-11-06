export interface CategoryNode {
  id: string;
  nombre: string;
  nivel: number;
  estado: "Activo" | "Inactivo" | "Verificando baja";
  slug?: string;
  orden?: number;
  descripcion?: string;
  hijas?: CategoryNode[];
}

export interface CategoryTreeProps {
  nodos: CategoryNode[];
  nodoSeleccionadoId?: string;
  colapsadosPorId?: string[];
  estadoPorNodo?: Map<string, "Activo" | "Inactivo" | "Verificando baja">;
  onSeleccionar?: (id: string) => void;
  onExpandir?: (id: string) => void;
  onClicar?: (id: string) => void;
}

export type CategoryTreeStates =
  | "default"
  | "loading"
  | "empty"
  | "sin-resultados"
  | "error";

export interface CategoryTreeFixture {
  default: CategoryNode[];
  loading: CategoryNode[];
  empty: CategoryNode[];
  sinResultados: CategoryNode[];
  error: {
    problem: string;
    codigo: "VALIDACION" | "ERROR_INTERNO";
  };
  sesion: {
    codigo: "TOKEN_INVALIDO" | "SCOPE_INSUFICIENTE";
    mensaje: string;
  };
}

// S02 (Crear categoría) — presentation models. Not provider DTOs or a new HTTP contract.
export interface CategoryCreateInput {
  nombre: string;
  slug: string;
  padreId?: string;
  descripcion?: string;
}

export interface SlugCheckResult {
  slug: string;
  disponible: boolean;
  alternativo?: string;
}

export interface CategoryCreateResult {
  id: string;
  nombre: string;
  slug: string;
}

// S03/S05 (Editar y Detalle) — presentation models for a single category.
export interface CategoryDetail {
  id: string;
  nombre: string;
  slug: string;
  nivel: number;
  orden: number;
  estado: CategoryNode["estado"];
  descripcion?: string;
  padreId?: string;
  padreNombre?: string;
  hijas: CategoryNode[];
}

export interface CategoryUpdateInput {
  id: string;
  nombre: string;
  slug: string;
  padreId?: string;
  descripcion?: string;
  orden: number;
}

// S04/S04-B/S05-R (Baja y reactivación) — presentation models. Simulated dependencies,
// not an agency over product or inventory state.
export interface BloqueoDependencia {
  tipo: "subcategorias" | "productos" | "padre";
  cantidad: number;
  detalle: string;
}

export interface BajaSolicitudResult {
  resultado: "verificando" | "rechazada";
  categoria: CategoryDetail;
  bloqueos: BloqueoDependencia[];
  mensaje: string;
  operacionId?: string;
}

export interface ReactivacionResult {
  resultado: "reactivada" | "bloqueada";
  categoria: CategoryDetail;
  bloqueos: BloqueoDependencia[];
  mensaje: string;
}

// MK-009 (Características y sus valores) — presentation models. Not provider DTOs
// or a new HTTP contract. SPEC/HU/FLOW/WF-009.
export type CharacteristicType = "TEXTO" | "NUMERO" | "LISTA";

export type EntityStatus = "Activo" | "Inactivo";
export type CharacteristicStatus = EntityStatus;
export type CharacteristicValueStatus = EntityStatus;

export interface CharacteristicValue {
  valorId: string;
  nombre: string;
  estado: CharacteristicValueStatus;
  version: number;
}

export interface CharacteristicValueInput {
  nombre: string;
}

// MK-009 — baja de un valor permitido (SPEC-009/010). Simula el protocolo transversal
// S04 sin afirmar un contrato HTTP: "pendiente" admite la solicitud (202) sin
// confirmar la desactivación, "rechazada" conserva el valor Activo y
// "no-concluyente" no obtiene una respuesta determinante. Solo "exito"/"confirmada"
// autoriza la mutación del estado en el modelo de presentación.
export type ValorBajaResultado =
  | "pendiente"
  | "rechazada"
  | "no-concluyente"
  | "exito";

export interface ValorBajaResult {
  resultado: ValorBajaResultado;
  valor: CharacteristicValue;
  mensaje: string;
  bloqueos: BloqueoDependencia[];
  operacionId?: string;
}

export interface CharacteristicListItem {
  id: string;
  nombre: string;
  tipo: CharacteristicType;
  estado: CharacteristicStatus;
  unidad?: string;
  valoresActivos: number;
}

export interface CharacteristicCatalogConfig {
  maxTexto: number;
  maxValoresLista: number;
}

// S02 (Crear característica) — presentation models. The type is chosen at creation
// and cannot change afterwards; NUMERO requires a unit.
export interface CharacteristicCreateInput {
  nombre: string;
  tipo: CharacteristicType;
  estado: CharacteristicStatus;
  unidad?: string;
}

export interface CharacteristicCreateResult {
  id: string;
  nombre: string;
  tipo: CharacteristicType;
  estado: CharacteristicStatus;
  unidad?: string;
}

// S03/S06 (Editar y Detalle) — single characteristic. SPEC-009 defines the type as
// immutable, so the update input intentionally excludes it and the state.
export interface CharacteristicDetail {
  id: string;
  nombre: string;
  tipo: CharacteristicType;
  estado: CharacteristicStatus;
  unidad?: string;
  valoresActivos: number;
  valores?: CharacteristicValue[];
}

export interface CharacteristicUpdateInput {
  id: string;
  nombre: string;
  unidad?: string;
}

// MK-010 (Tipos de producto y esquemas de características) — presentation models.
export type ProductTypeStatus = EntityStatus;

export interface ProductTypeListItem {
  tipoProductoId: string;
  nombre: string;
  estado: ProductTypeStatus;
  schemaVersion: number;
  caracteristicasAsignadas: number;
  limiteCaracteristicas: number;
}

export interface ProductTypeCreateInput {
  nombre: string;
}

export interface ProductTypeCreateResult {
  tipoProductoId: string;
  nombre: string;
  estado: ProductTypeStatus;
  schemaVersion: number;
}

export interface ProductTypeAssociationCharacteristic {
  id: string;
  nombre: string;
  tipo: CharacteristicType;
  estado: CharacteristicStatus;
  unidad?: string;
  valoresActivos: number;
}

export interface ProductTypeAssociation {
  caracteristicaId: string;
  obligatoria: boolean;
  estado: CharacteristicStatus;
  schemaVersion: number;
  caracteristica: ProductTypeAssociationCharacteristic;
}

export interface ProductTypeDetail {
  tipoProductoId: string;
  nombre: string;
  estado: ProductTypeStatus;
  schemaVersion: number;
  limiteCaracteristicas: number;
  caracteristicasAsignadas: number;
  asociadas: ProductTypeAssociation[];
}

export interface ProductTypeAssociarInput {
  tipoProductoId: string;
  caracteristicaId: string;
  obligatoria: boolean;
}

// MK-010 — cambio de obligatoriedad de una asociación existente.
// Contrato: PATCH /tipos-producto/{tipoProductoId}/caracteristicas/{caracteristicaId}.
// Solo incrementa schemaVersion cuando la asociación cambia realmente.
export interface ProductTypeObligatoriedadInput {
  tipoProductoId: string;
  caracteristicaId: string;
  obligatoria: boolean;
}

export type OperationResultState = "exito" | "pendiente" | "rechazada";

export interface ProductTypeDesasociarResult {
  resultado: OperationResultState;
  mensaje: string;
  operacionId?: string;
}

// MK-010 — desactivación de tipo de producto. "pendiente" (202) conserva el estado
// actual y expone un operacionId para el seguimiento; solo "exito" confirma la baja.
export interface ProductTypeDesactivarResult {
  resultado: OperationResultState;
  mensaje: string;
  operacionId?: string;
}

// MK-011 (Marcas) — presentation models aligned to MarcaAdmin.
export type BrandStatus = EntityStatus;

export interface BrandListItem {
  marcaId: string;
  nombre: string;
  estado: BrandStatus;
  logoUrl?: string | null;
  paisOrigenIso?: string | null;
}

export interface BrandDetail {
  marcaId: string;
  nombre: string;
  estado: BrandStatus;
  logoUrl?: string | null;
  paisOrigenIso?: string | null;
  descripcion?: string | null;
  version: number;
}

export interface BrandCreateInput {
  nombre: string;
  descripcion?: string | null;
  paisOrigenIso?: string | null;
}

export interface BrandUpdateInput {
  marcaId: string;
  nombre: string;
  descripcion?: string | null;
  paisOrigenIso?: string | null;
}

// MK-011 — baja segura de marca (protocolo transversal BRAND, SPEC-011).
// La baja es lógica; solo un CLEAR vigente confirma. Error/timeout no autorizan.
// "no-concluyente" = verificación sin respuesta determinante; la marca conserva su estado.
export type BrandBajaResultado = "exito" | "pendiente" | "rechazada" | "no-concluyente";

export interface BrandBajaResult {
  resultado: BrandBajaResultado;
  mensaje: string;
  operacionId?: string;
  bloqueos?: BloqueoDependencia[];
}

// MK-012 (SEO y metadatos) — presentation models. Aligned to SPEC-012/HU-012/WF-012.
export interface SeoMetadatos {
  metaTitulo: string;
  metaDescripcion: string;
}

export interface SlugPropuesta {
  slug: string;
  colisionResuelta: boolean;
}

export interface SeoCategory {
  id: string;
  nombre: string;
  slug: string;
  slugAnterior?: string;
  metaTitulo?: string;
  metaDescripcion?: string;
  colisionResuelta?: boolean;
}

export interface HistorialSlugItem {
  slugAnterior: string;
  slugActual: string;
  fecha: string;
}

// MK-008/009/010 — Seguimiento de operaciones asíncronas (202 Accepted).
// Contrato: GET /taxonomia/operaciones/{operationId}. Estos modelos representan el
// estado que consume la UI; el mock no inventa un endpoint propio ni afirma que el
// sondeo HTTP esté integrado en este PR.
export type OperationFollowUpStatus =
  | "pendiente"
  | "confirmada"
  | "rechazada"
  | "no-concluyente";

export interface OperationFollowUpResult {
  operacionId: string;
  estado: OperationFollowUpStatus;
  mensaje: string;
}

export interface BajaCategoriaSeguimiento extends OperationFollowUpResult {
  categoria?: CategoryDetail;
}

export interface ValorBajaSeguimiento extends OperationFollowUpResult {
  valor?: CharacteristicValue;
}

export interface ProductTypeSeguimiento extends OperationFollowUpResult {
  tipoProducto?: ProductTypeDetail;
}

// Alias retrocompatible: la desasociación es una operación sobre un tipo de producto.
export type DesasociacionSeguimiento = ProductTypeSeguimiento;