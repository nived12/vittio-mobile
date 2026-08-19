import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/statement-files");
});

test("lists statements with a status per row", async ({ page }) => {
  await expect(page.getByText("Santander").first()).toBeVisible();
  await expect(page.getByText("BBVA").first()).toBeVisible();
  await expect(page.getByText("Banorte").first()).toBeVisible();

  // The pill is the only thing telling a user why a row isn't tappable yet.
  await expect(page.getByText(/^(Listo|Done)$/).first()).toBeVisible();
  await expect(page.getByText(/^(Procesando|Processing)$/).first()).toBeVisible();
  await expect(page.getByText(/^(Error|Failed)$/).first()).toBeVisible();
});

test("a row opens the statement's own detail, not the transaction list", async ({ page }) => {
  await page.getByText("Santander").first().click();

  // The row identifies the file, so it must land on the file.
  await page.waitForURL(/statement-files\/101/, { timeout: 10_000 });
  await expect(
    page.getByText(/transacciones importadas|transactions imported/i)
  ).toBeVisible();

  // Transactions stay reachable, but as a deliberate action.
  await page
    .getByRole("button", { name: /ver \d+ transacci|view \d+ transaction/i })
    .first()
    .click();
  await page.waitForURL(/statement_file_id=101/, { timeout: 10_000 });
});

test("the header button opens the upload modal", async ({ page }) => {
  await page
    .getByRole("button", { name: /subir estado de cuenta|upload statement/i })
    .first()
    .click();
  await expect(
    page.getByText(/seleccionar archivo pdf|select pdf file/i)
  ).toBeVisible();
});

test("empty state offers the upload as its primary action", async ({ page }) => {
  await page.route("**/api/v1/statement_files*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        data: { statement_files: [] },
        meta: {
          pagination: {
            current_page: 1, total_pages: 1, total_items: 0,
            page_size: 20, next_page: null, prev_page: null
          }
        }
      })
    })
  );
  await page.reload();

  await expect(
    page.getByText(/aún no has subido estados de cuenta|haven't uploaded any statements/i)
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /subir estado de cuenta|upload statement/i }).first()
  ).toBeVisible();
});
