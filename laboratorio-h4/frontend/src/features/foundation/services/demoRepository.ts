// Presentation models for the gallery only; not provider DTOs or business enums.
export interface DemoItem {
  id: string;
  name: string;
  reference: string;
  kind: string;
  status: "active" | "inactive";
}
export type DemoScenario = "default" | "loading" | "empty" | "error";
export interface DemoQuery {
  search: string;
  status: "all" | DemoItem["status"];
  page: number;
  pageSize: number;
}
export interface DemoResult {
  items: DemoItem[];
  total: number;
}
export interface DemoFormValues {
  name: string;
  description: string;
  kind: string;
  tags: string[];
  visible: boolean;
}
export interface DemoRepository {
  list(
    query: DemoQuery,
    scenario: DemoScenario,
    signal: AbortSignal,
  ): Promise<DemoResult>;
  confirmExample(values: DemoFormValues, simulateError: boolean): Promise<void>;
}
