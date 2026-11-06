import type {
  AdministrationRecord,
  AdministrationRepository,
} from "./administration";
export type CampaignMode = "automatic" | "coupon";
export interface CampaignDraft {
  name: string;
  mode: CampaignMode | "";
  status: "active" | "inactive" | "";
  discountType: "percentage" | "amount" | "";
  benefit: string;
  priority: string;
  validFrom: string;
  validUntil: string;
  channels: string[];
  productIds: string[];
  skus: string[];
  combination: { pricing: boolean; automatic: boolean; coupon: boolean };
}
export interface CampaignView extends AdministrationRecord {
  configuration: CampaignDraft;
  canChangeMode: boolean | undefined;
}
export type CampaignRepository = AdministrationRepository<
  CampaignView,
  CampaignDraft
>;
export const emptyCampaign: CampaignDraft = {
  name: "",
  mode: "",
  status: "",
  discountType: "",
  benefit: "",
  priority: "",
  validFrom: "",
  validUntil: "",
  channels: [],
  productIds: [],
  skus: [],
  combination: { pricing: false, automatic: false, coupon: false },
};
export const channelChoices = [
  { value: "marketplace", label: "Marketplace" },
  { value: "chatbot", label: "Chatbot" },
  { value: "retail", label: "Retail" },
  { value: "sales", label: "Ventas" },
];
