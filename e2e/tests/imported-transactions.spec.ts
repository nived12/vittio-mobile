import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers/auth";

// Imported (statement-file) transactions are now editable/deletable on mobile,
// matching the web app. This suite verifies the user-visible UI changes:
//   1. the detail screen flags the statement origin and now exposes delete, and
//   2. the list flags statement-file rows.
// The PATCH/DELETE network round-trips for imported transactions are covered
// server-side by spec/requests/api/v1/transactions/{update,destroy}_spec.rb —
// driving them here would mean fighting RN-web's Alert/Modal, which don't
// render actionably in headless web.
//
// Imported fixture txn: id 9002 ("Supermercado", source "statement_file") —
// see e2e/mocks/responses/transactions.json. The static web export can't
// deep-link dynamic routes, so the detail screen is reached via the list row.
// All /api/v1/** calls are mocked in api-mocks.ts; the real LLM is never reached.

function failOnLlmRequests(page: Page): void {
  const blockedHosts = [
    "generativelanguage.googleapis.com",
    "api.openai.com",
    "api.anthropic.com"
  ];
  page.on("request", (req) => {
    const url = req.url();
    if (blockedHosts.some((host) => url.includes(host))) {
      throw new Error(`Unexpected LLM request: ${url}`);
    }
  });
}

test.describe("Imported (statement-file) transactions", () => {
  test.beforeEach(async ({ page }) => {
    failOnLlmRequests(page);
    await login(page);
    await page.goto("/transactions");
  });

  test("detail screen flags the statement origin and exposes delete", async ({ page }) => {
    // Open the imported transaction's detail via the list row.
    await page.getByText("Supermercado").first().click();

    // Origin badge (icon-only) — warns the user this txn came from a statement file.
    // The list screen stays mounted under the detail stack, so scope to the
    // visible (detail-screen) icon.
    await expect(
      page
        .getByLabel(/imported from bank statement|importado del estado de cuenta/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // Delete affordance is now present for imported txns (previously hidden).
    await expect(
      page.getByText(/delete transaction|eliminar transacci[oó]n/i).first()
    ).toBeVisible();
  });

  test("transaction list flags statement-file rows", async ({ page }) => {
    await expect(page.getByText("Supermercado").first()).toBeVisible({ timeout: 10_000 });

    // The imported row carries the statement-origin indicator icon.
    await expect(
      page.getByLabel(/imported from bank statement|importado del estado de cuenta/i).first()
    ).toBeVisible();
  });
});
