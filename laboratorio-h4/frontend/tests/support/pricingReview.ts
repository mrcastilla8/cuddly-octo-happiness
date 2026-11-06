import type { Page } from "@playwright/test";

// Fault controls belong to a test harness, never to the commercial runtime.
export function gotoPricingReview(page: Page, path: string) {
  return page.goto(path.startsWith("/precios")
    ? `/tests/harness/pricing-review.html?${new URLSearchParams({ path })}`
    : path);
}
