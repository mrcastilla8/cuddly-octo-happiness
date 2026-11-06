import { lazy } from "react";
export const AuditLayout = lazy(() =>
  import("../../features/price-audit/components/AuditLayout").then(
    (module) => ({ default: module.AuditLayout }),
  ),
);
export const AuditHistoryPage = lazy(() =>
  import("../../features/price-audit/pages/AuditHistoryPage").then(
    (module) => ({ default: module.AuditHistoryPage }),
  ),
);
export const AuditDetailPage = lazy(() =>
  import("../../features/price-audit/pages/AuditDetailPage").then((module) => ({
    default: module.AuditDetailPage,
  })),
);
export const AuditExportPage = lazy(() =>
  import("../../features/price-audit/pages/AuditExportPage").then((module) => ({
    default: module.AuditExportPage,
  })),
);

export const RecommendationsPage = lazy(() =>
  import("../../features/promotions/pages/RecommendationsPage").then(
    (module) => ({ default: module.RecommendationsPage }),
  ),
);
export const RecommendationDetailPage = lazy(() =>
  import("../../features/promotions/pages/RecommendationDetailPage").then(
    (module) => ({ default: module.RecommendationDetailPage }),
  ),
);
export const RecommendationEditorLayout = lazy(() =>
  import("../../features/promotions/pages/RecommendationEditorLayout").then(
    (module) => ({ default: module.RecommendationEditorLayout }),
  ),
);
export const RecommendationFormPage = lazy(() =>
  import("../../features/promotions/pages/RecommendationFormPage").then(
    (module) => ({ default: module.RecommendationFormPage }),
  ),
);
export const RecommendationSelectorPage = lazy(() =>
  import("../../features/promotions/pages/RecommendationSelectorPage").then(
    (module) => ({ default: module.RecommendationSelectorPage }),
  ),
);
export const CampaignsPage = lazy(() =>
  import("../../features/promotions/pages/CampaignsPage").then((module) => ({
    default: module.CampaignsPage,
  })),
);
export const CampaignDetailPage = lazy(() =>
  import("../../features/promotions/pages/CampaignDetailPage").then(
    (module) => ({ default: module.CampaignDetailPage }),
  ),
);
export const CampaignEditorLayout = lazy(() =>
  import("../../features/promotions/pages/CampaignEditorLayout").then(
    (module) => ({ default: module.CampaignEditorLayout }),
  ),
);
export const CampaignFormPage = lazy(() =>
  import("../../features/promotions/pages/CampaignFormPage").then((module) => ({
    default: module.CampaignFormPage,
  })),
);
export const CampaignScopePage = lazy(() =>
  import("../../features/promotions/pages/CampaignScopePage").then(
    (module) => ({ default: module.CampaignScopePage }),
  ),
);
export const CouponFormPage = lazy(() =>
  import("../../features/promotions/pages/CouponFormPage").then((module) => ({
    default: module.CouponFormPage,
  })),
);
export const CouponsPage = lazy(() =>
  import("../../features/promotions/pages/CouponsPage").then((module) => ({
    default: module.CouponsPage,
  })),
);
export const CouponDetailPage = lazy(() =>
  import("../../features/promotions/pages/CouponDetailPage").then((module) => ({
    default: module.CouponDetailPage,
  })),
);
export const CurrentPricePage = lazy(() =>
  import("../../features/pricing/pages/CurrentPricePage").then((module) => ({
    default: module.CurrentPricePage,
  })),
);
export const ProductsPage = lazy(() =>
  import("../../features/catalog/pages/ProductsPage").then((module) => ({
    default: module.ProductsPage,
  })),
);
export const ProductCreatePage = lazy(() =>
  import("../../features/catalog/pages/ProductCreatePage").then((module) => ({
    default: module.ProductCreatePage,
  })),
);
export const ProductEditPage = lazy(() =>
  import("../../features/catalog/pages/ProductEditPage").then((module) => ({
    default: module.ProductEditPage,
  })),
);
export const ProductDetailPage = lazy(() =>
  import("../../features/catalog/pages/ProductDetailPage").then((module) => ({
    default: module.ProductDetailPage,
  })),
);
export const ProductPreparationPage = lazy(() =>
  import("../../features/catalog/pages/ProductPreparationPage").then((module) => ({
    default: module.ProductPreparationPage,
  })),
);
export const VariantListPage = lazy(() =>
  import("../../features/catalog/pages/VariantListPage").then((module) => ({
    default: module.VariantListPage,
  })),
);
export const VariantCreatePage = lazy(() =>
  import("../../features/catalog/pages/VariantCreatePage").then((module) => ({
    default: module.VariantCreatePage,
  })),
);
export const VariantEditPage = lazy(() =>
  import("../../features/catalog/pages/VariantEditPage").then((module) => ({
    default: module.VariantEditPage,
  })),
);
export const VariantDetailPage = lazy(() =>
  import("../../features/catalog/pages/VariantDetailPage").then((module) => ({
    default: module.VariantDetailPage,
  })),
);
export const VariantPreparationPage = lazy(() =>
  import("../../features/catalog/pages/VariantPreparationPage").then((module) => ({
    default: module.VariantPreparationPage,
  })),
);
export const EditPricePage = lazy(() =>
  import("../../features/pricing/pages/EditPricePage").then((module) => ({
    default: module.EditPricePage,
  })),
);
export const PriceSchedulesPage = lazy(() =>
  import("../../features/pricing/pages/PriceSchedulesPage").then((module) => ({
    default: module.PriceSchedulesPage,
  })),
);
export const ImportPricesPage = lazy(() =>
  import("../../features/pricing/pages/ImportPricesPage").then((module) => ({
    default: module.ImportPricesPage,
  })),
);
export const PriceImportResultPage = lazy(() =>
  import("../../features/pricing/pages/PriceImportResultPage").then(
    (module) => ({ default: module.PriceImportResultPage }),
  ),
);
export const HistoricalPricePage = lazy(() =>
  import("../../features/pricing/pages/HistoricalPricePage").then((module) => ({
    default: module.HistoricalPricePage,
  })),
);
export const CategoryTreePage = lazy(() =>
  import("../../features/taxonomy/pages/CategoryTreePage").then((module) => ({
    default: module.CategoryTreePage,
  })),
);
export const CreateCategoryPage = lazy(() =>
  import("../../features/taxonomy/pages/CreateCategoryPage").then((module) => ({
    default: module.CreateCategoryPage,
  })),
);
export const EditCategoryPage = lazy(() =>
  import("../../features/taxonomy/pages/EditCategoryPage").then((module) => ({
    default: module.EditCategoryPage,
  })),
);
export const CategoryDetailPage = lazy(() =>
  import("../../features/taxonomy/pages/CategoryDetailPage").then((module) => ({
    default: module.CategoryDetailPage,
  })),
);
export const DeactivateCategoryPage = lazy(() =>
  import("../../features/taxonomy/pages/DeactivateCategoryPage").then((module) => ({
    default: module.DeactivateCategoryPage,
  })),
);
export const CharacteristicListPage = lazy(() =>
  import("../../features/taxonomy/pages/CharacteristicListPage").then(
    (module) => ({
      default: module.CharacteristicListPage,
    }),
  ),
);
export const CharacteristicCreatePage = lazy(() =>
  import("../../features/taxonomy/pages/CharacteristicCreatePage").then(
    (module) => ({
      default: module.CharacteristicCreatePage,
    }),
  ),
);
export const CharacteristicEditPage = lazy(() =>
  import("../../features/taxonomy/pages/CharacteristicEditPage").then(
    (module) => ({
      default: module.CharacteristicEditPage,
    }),
  ),
);
export const CharacteristicDetailPage = lazy(() =>
  import("../../features/taxonomy/pages/CharacteristicDetailPage").then(
    (module) => ({
      default: module.CharacteristicDetailPage,
    }),
  ),
);
export const CharacteristicValuesPage = lazy(() =>
  import("../../features/taxonomy/pages/CharacteristicValuesPage").then(
    (module) => ({
      default: module.CharacteristicValuesPage,
    }),
  ),
);
export const CharacteristicStatePage = lazy(() =>
  import("../../features/taxonomy/pages/CharacteristicStatePage").then(
    (module) => ({
      default: module.CharacteristicStatePage,
    }),
  ),
);
export const ProductTypeListPage = lazy(() =>
  import("../../features/taxonomy/pages/ProductTypeListPage").then((module) => ({
    default: module.ProductTypeListPage,
  })),
);
export const ProductTypeCreatePage = lazy(() =>
  import("../../features/taxonomy/pages/ProductTypeCreatePage").then((module) => ({
    default: module.ProductTypeCreatePage,
  })),
);
export const ProductTypeDetailPage = lazy(() =>
  import("../../features/taxonomy/pages/ProductTypeDetailPage").then((module) => ({
    default: module.ProductTypeDetailPage,
  })),
);
export const ProductTypeAssociatePage = lazy(() =>
  import("../../features/taxonomy/pages/ProductTypeAssociatePage").then((module) => ({
    default: module.ProductTypeAssociatePage,
  })),
);
export const BrandListPage = lazy(() =>
  import("../../features/taxonomy/pages/BrandListPage").then((module) => ({
    default: module.BrandListPage,
  })),
);
export const BrandFormPage = lazy(() =>
  import("../../features/taxonomy/pages/BrandFormPage").then((module) => ({
    default: module.BrandFormPage,
  })),
);
export const BrandDetailPage = lazy(() =>
  import("../../features/taxonomy/pages/BrandDetailPage").then((module) => ({
    default: module.BrandDetailPage,
  })),
);
export const SeoListPage = lazy(() =>
  import("../../features/taxonomy/pages/SeoListPage").then((module) => ({
    default: module.SeoListPage,
  })),
);
export const SeoConfigPage = lazy(() =>
  import("../../features/taxonomy/pages/SeoConfigPage").then((module) => ({
    default: module.SeoConfigPage,
  })),
);

export const BulkLayout = lazy(() =>
  import("../../features/bulk/pages/BulkLayout").then((module) => ({
    default: module.BulkLayout,
  })),
);
export const BulkUploadPage = lazy(() =>
  import("../../features/bulk/pages/BulkUploadPage").then((module) => ({
    default: module.BulkUploadPage,
  })),
);
export const BulkReviewPage = lazy(() =>
  import("../../features/bulk/pages/BulkReviewPage").then((module) => ({
    default: module.BulkReviewPage,
  })),
);
export const BulkProgressPage = lazy(() =>
  import("../../features/bulk/pages/BulkProgressPage").then((module) => ({
    default: module.BulkProgressPage,
  })),
);
export const BulkResultPage = lazy(() =>
  import("../../features/bulk/pages/BulkResultPage").then((module) => ({
    default: module.BulkResultPage,
  })),
);
export const BulkDownloadsPage = lazy(() =>
  import("../../features/bulk/pages/BulkDownloadsPage").then((module) => ({
    default: module.BulkDownloadsPage,
  })),
);

export const StockControlPage = lazy(() =>
  import("../../features/inventory/pages/StockControlPage").then((module) => ({
    default: module.StockControlPage,
  })),
);
export const ThresholdsPage = lazy(() =>
  import("../../features/inventory/pages/ThresholdsPage").then((module) => ({
    default: module.ThresholdsPage,
  })),
);
export const TransfersPage = lazy(() =>
  import("../../features/inventory/pages/TransfersPage").then((module) => ({
    default: module.TransfersPage,
  })),
);
export const InventoryDashboardPage = lazy(() =>
  import("../../features/inventory/pages/InventoryDashboardPage").then(
    (module) => ({
      default: module.InventoryDashboardPage,
    }),
  ),
);

export const ComboListPage = lazy(() =>
  import("../../features/combos/pages/ComboListPage").then((module) => ({ default: module.ComboListPage })),
);
export const ComboCreatePage = lazy(() =>
  import("../../features/combos/pages/ComboCreatePage").then((module) => ({ default: module.ComboCreatePage })),
);
export const ComboEditPage = lazy(() =>
  import("../../features/combos/pages/ComboEditPage").then((module) => ({ default: module.ComboEditPage })),
);
export const ComboDetailPage = lazy(() =>
  import("../../features/combos/pages/ComboDetailPage").then((module) => ({ default: module.ComboDetailPage })),
);
