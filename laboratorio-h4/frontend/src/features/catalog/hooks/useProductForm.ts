import { useEffect, useState, useCallback } from "react";
import type {
  ProductAttributeValue,
  ProductCreatePayload,
  ProductDetailView,
  ProductImageRef,
  ProductUpdatePayload,
} from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import type {
  AttributeSchema,
  TaxonomyBrand,
  TaxonomyCategory,
  TaxonomyProductType,
} from "../services/taxonomyRepository";
import { useCatalogServices } from "./useCatalogServices";

export interface ProductFormData {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  tipoProductoId: string;
  marcaId: string;
  skuBase: string;
  tieneVariantes: boolean;
  precioBaseInicial: number;
  imageUrl: string;
  atributos: Record<string, string | number>;
  pesoKg?: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
}

export interface UseProductFormOptions {
  initialProduct?: ProductDetailView;
  scenario?: string;
  onSuccess?: (product: ProductDetailView) => void;
}

export function useProductForm({
  initialProduct,
  scenario,
  onSuccess,
}: UseProductFormOptions) {
  const isEdit = Boolean(initialProduct);
  const { catalog: catalogService, taxonomy: taxonomyService } = useCatalogServices();

  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [brands, setBrands] = useState<TaxonomyBrand[]>([]);
  const [productTypes, setProductTypes] = useState<TaxonomyProductType[]>([]);
  const [schemaResult, setSchemaResult] = useState<{
    typeId: string;
    service: typeof taxonomyService;
    attributes?: AttributeSchema[];
    error?: string;
  } | null>(null);
  const [schemaAttempt, setSchemaAttempt] = useState(0);
  const [loadingMasters, setLoadingMasters] = useState(true);

  // Form fields state
  const [formData, setFormData] = useState<ProductFormData>(() => {
    if (initialProduct) {
      const attrs: Record<string, string | number> = {};
      initialProduct.attributes.forEach((a) => {
        attrs[a.caracteristicaId] = a.tipo === "LISTA" ? a.valorId ?? "" : a.valor;
      });
      return {
        nombre: initialProduct.name,
        descripcion: initialProduct.description,
        categoriaId: initialProduct.categoryId,
        tipoProductoId: initialProduct.typeId,
        marcaId: initialProduct.brandId,
        skuBase: initialProduct.skuBase ?? "",
        tieneVariantes: initialProduct.hasVariants,
        precioBaseInicial: initialProduct.priceInitial || 0,
        imageUrl: initialProduct.imageUrl || "",
        atributos: attrs,
        pesoKg: initialProduct.physicalProfile?.pesoKg,
        largoCm: initialProduct.physicalProfile?.largoCm,
        anchoCm: initialProduct.physicalProfile?.anchoCm,
        altoCm: initialProduct.physicalProfile?.altoCm,
      };
    }
    return {
      nombre: "",
      descripcion: "",
      categoriaId: "",
      tipoProductoId: "",
      marcaId: "",
      skuBase: "",
      tieneVariantes: false,
      precioBaseInicial: 0,
      imageUrl: "",
      atributos: {},
      pesoKg: undefined,
      largoCm: undefined,
      anchoCm: undefined,
      altoCm: undefined,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load masters on mount
  useEffect(() => {
    let active = true;
    Promise.all([
      taxonomyService.getCategories(),
      taxonomyService.getBrands(),
      taxonomyService.getProductTypes(),
    ])
      .then(([cats, brds, types]) => {
        if (!active) return;
        setCategories(cats);
        setBrands(brds);
        setProductTypes(types);
        if (!initialProduct && cats.length > 0 && brds.length > 0 && types.length > 0) {
          const firstCat = cats[0]?.id || "";
          const firstBrd = brds[0]?.id || "";
          const firstType = types[0]?.id || "";
          setFormData((prev) => ({
            ...prev,
            categoriaId: prev.categoriaId || firstCat,
            marcaId: prev.marcaId || firstBrd,
            tipoProductoId: prev.tipoProductoId || firstType,
          }));
        }
        setLoadingMasters(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setGeneralError(error instanceof Error ? error.message : "Error al cargar los datos maestros de Taxonomía.");
        setLoadingMasters(false);
      });

    return () => {
      active = false;
    };
  }, [initialProduct, taxonomyService]);

  // Load attribute schema when type changes
  useEffect(() => {
    if (!formData.tipoProductoId) return;
    let active = true;
    taxonomyService
      .getAttributeSchema(formData.tipoProductoId)
      .then((schemas) => {
        if (!active) return;
        setSchemaResult({ typeId: formData.tipoProductoId, service: taxonomyService, attributes: schemas });
        // Historical mocks sometimes stored an option ID in valor. Accept it only
        // when the confirmed provider lists that exact ID; never infer from labels.
        if (initialProduct) setFormData((previous) => {
          const atributos = { ...previous.atributos };
          initialProduct.attributes.forEach((attribute) => {
            if (attribute.tipo !== "LISTA" || attribute.valorId !== undefined || atributos[attribute.caracteristicaId] !== "") return;
            const option = schemas.find((schema) => schema.caracteristicaId === attribute.caracteristicaId)
              ?.opciones?.find((item) => item.id === attribute.valor);
            if (option) atributos[attribute.caracteristicaId] = option.id;
          });
          return { ...previous, atributos };
        });
      })
      .catch((error: unknown) => {
        if (active) setSchemaResult({ typeId: formData.tipoProductoId, service: taxonomyService, error: error instanceof Error ? error.message : "No se pudo confirmar el esquema de Taxonomía. Tus atributos se conservan; reintenta antes de guardar." });
      });
    return () => {
      active = false;
    };
  }, [formData.tipoProductoId, taxonomyService, schemaAttempt, initialProduct]);

  const currentSchema = schemaResult?.typeId === formData.tipoProductoId && schemaResult.service === taxonomyService
    ? schemaResult : null;
  const attributeSchema = currentSchema?.attributes ?? [];
  const schemaError = currentSchema?.error ?? null;
  const schemaLoading = !currentSchema;
  const schemaConfirmed = currentSchema?.attributes !== undefined;
  const retrySchema = () => { setSchemaResult(null); setSchemaAttempt((attempt) => attempt + 1); };

  const updateField = useCallback(
    <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
      // Q-06 is still open: no ordinary edit may propose a type correction.
      if (isEdit && field === "tipoProductoId") return;
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    },
    [isEdit],
  );

  const updateAttribute = useCallback(
    (caracteristicaId: string, value: string | number) => {
      setFormData((prev) => ({
        ...prev,
        atributos: { ...prev.atributos, [caracteristicaId]: value },
      }));
      setIsDirty(true);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`attr_${caracteristicaId}`];
        return next;
      });
    },
    [],
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio.";
    }
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = "La descripción es obligatoria.";
    }
    if (!isEdit && !formData.skuBase.trim()) {
      newErrors.skuBase = "El SKU base es obligatorio.";
    }
    if (!isEdit && (!formData.precioBaseInicial || formData.precioBaseInicial <= 0)) {
      newErrors.precioBaseInicial = "El precio base inicial debe ser mayor que cero.";
    }
    if (!formData.categoriaId) {
      newErrors.categoriaId = "Selecciona una categoría.";
    }
    if (!formData.marcaId) {
      newErrors.marcaId = "Selecciona una marca.";
    }
    if (!formData.tipoProductoId) {
      newErrors.tipoProductoId = "Selecciona un tipo de producto.";
    }

    // Physical profile: if simple, any supplied dimension must be > 0
    if (!formData.tieneVariantes) {
      if (formData.pesoKg !== undefined && formData.pesoKg <= 0) {
        newErrors.pesoKg = "El peso debe ser mayor que cero.";
      }
      if (formData.largoCm !== undefined && formData.largoCm <= 0) {
        newErrors.largoCm = "El largo debe ser mayor que cero.";
      }
      if (formData.anchoCm !== undefined && formData.anchoCm <= 0) {
        newErrors.anchoCm = "El ancho debe ser mayor que cero.";
      }
      if (formData.altoCm !== undefined && formData.altoCm <= 0) {
        newErrors.altoCm = "El alto debe ser mayor que cero.";
      }
    }

    attributeSchema.filter((schema) => schema.tipo === "LISTA").forEach((schema) => {
      const valueId = formData.atributos[schema.caracteristicaId];
      const previous = initialProduct?.attributes.find((attribute) => attribute.caracteristicaId === schema.caracteristicaId);
      const needsConfirmation = previous?.tipo === "LISTA" && previous.valorId === undefined;
      if ((valueId !== undefined && valueId !== "") || needsConfirmation) {
        if (!schema.opciones?.some((option) => option.id === valueId)) {
          newErrors[`attr_${schema.caracteristicaId}`] = "Selecciona una opción vigente de Taxonomía para confirmar su identificador.";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;
    if (!schemaConfirmed || loadingMasters) {
      setGeneralError(schemaError ?? "Espera a que se confirme el esquema de Taxonomía antes de guardar.");
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setGeneralError(null);

    // Format attributes
    const formattedAttributes: ProductAttributeValue[] = [];
    attributeSchema.forEach((schema) => {
      const val = formData.atributos[schema.caracteristicaId];
      if (val !== undefined && val !== "") {
        const option = schema.tipo === "LISTA" ? schema.opciones?.find((item) => item.id === val) : undefined;
        formattedAttributes.push({
          caracteristicaId: schema.caracteristicaId,
          nombre: schema.nombre,
          tipo: schema.tipo,
          valor: option ? option.valor : schema.tipo === "NUMERO" ? Number(val) : val,
          ...(option ? { valorId: option.id } : {}),
          unidad: schema.unidad,
        });
      }
    });
    // Preserve historical attributes not represented by the confirmed schema.
    // An empty valid schema does not authorize deleting existing product data.
    initialProduct?.attributes.forEach((attribute) => {
      if (!attributeSchema.some((schema) => schema.caracteristicaId === attribute.caracteristicaId)) {
        formattedAttributes.push({ ...attribute });
      }
    });

    const images: ProductImageRef[] = formData.imageUrl.trim()
      ? [{ url: formData.imageUrl.trim(), principal: true }]
      : [];

    const hasAnyPhysical =
      formData.pesoKg !== undefined ||
      formData.largoCm !== undefined ||
      formData.anchoCm !== undefined ||
      formData.altoCm !== undefined;

    const physicalProfile =
      !formData.tieneVariantes && hasAnyPhysical
        ? {
            pesoKg: formData.pesoKg,
            largoCm: formData.largoCm,
            anchoCm: formData.anchoCm,
            altoCm: formData.altoCm,
          }
        : null;

    try {
      if (isEdit && initialProduct) {
        const payload: ProductUpdatePayload = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          categoriaId: formData.categoriaId,
          marcaId: formData.marcaId,
          atributos: formattedAttributes,
          imagenes: images,
          perfilFisico: physicalProfile,
          catalogVersion: initialProduct.catalogVersion,
        };
        const updated = await catalogService.update(
          initialProduct.id,
          payload,
          scenario,
        );
        setIsDirty(false);
        onSuccess?.(updated);
      } else {
        const payload: ProductCreatePayload = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          categoriaId: formData.categoriaId,
          tipoProductoId: formData.tipoProductoId,
          marcaId: formData.marcaId,
          skuBase: formData.skuBase,
          tieneVariantes: formData.tieneVariantes,
          precioBaseInicial: formData.precioBaseInicial,
          atributos: formattedAttributes,
          imagenes: images,
          perfilFisico: physicalProfile,
        };
        const created = await catalogService.create(payload, scenario);
        setIsDirty(false);
        onSuccess?.(created);
      }
    } catch (err) {
      if (err instanceof CatalogError) {
        if (err.kind === "duplicate_sku") {
          setErrors((prev) => ({
            ...prev,
            skuBase: err.message,
          }));
        } else if (err.kind === "invalid_physical") {
          setGeneralError(err.message);
        } else if (err.kind === "version_conflict") {
          setGeneralError(
            "Conflicto de versión (409): Otro usuario modificó este producto. Conservamos tus cambios para que puedas revisarlos.",
          );
        } else if (err.kind === "active_rejected") {
          setGeneralError(
            "La edición fue rechazada: el producto ACTIVO no puede perder sus requisitos de publicación.",
          );
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError("Error inesperado al procesar la solicitud.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    updateField,
    updateAttribute,
    errors,
    generalError,
    submitting,
    isDirty,
    categories,
    brands,
    productTypes,
    attributeSchema,
    schemaLoading,
    schemaError,
    schemaConfirmed,
    retrySchema,
    loadingMasters,
    handleSubmit,
    isEdit,
  };
}
