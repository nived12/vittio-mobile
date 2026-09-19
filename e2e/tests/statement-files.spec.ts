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

  // The financial summary web shows is mirrored here.
  await expect(page.getByText(/resumen financiero|financial summary/i)).toBeVisible();
  await expect(page.getByText(/l[ií]mite de cr[eé]dito|credit limit/i)).toBeVisible();

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

test("shows how many of the allowed statements are used", async ({ page }) => {
  // The cap is a server-side env variable; the screen must render what the API
  // reports rather than a number compiled into the app.
  await expect(page.getByText(/3 (de|of) 12/)).toBeVisible();
});

test("hitting the cap explains itself instead of bouncing to the paywall", async ({ page }) => {
  await page.route("**/api/v1/statement_files", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: {
          code: "SUBSCRIPTION_REQUIRED",
          reason: "upload_limit_reached",
          message: "Ya usaste los 12 estados de cuenta de tu prueba gratis.",
          details: [],
        },
      }),
    });
  });

  await page
    .getByRole("button", { name: /subir estado de cuenta|upload statement/i })
    .first()
    .click();

  // expo-document-picker on web is an <input type="file"> it creates and clicks.
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByText(/seleccionar archivo pdf|select pdf file/i)
    .first()
    .click();
  await (await chooser).setFiles({
    name: "estado.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test"),
  });

  // Upload stays a no-op until an account is chosen.
  await page.getByText(/Santander TDC/).click();
  await page.getByText(/^(Subir estado de cuenta|Upload statement)$/).last().click();

  // The old behaviour closed the modal and pushed /premium with no explanation.
  await expect(
    page.getByText(/llegaste al l[ií]mite de estados|statement limit reached/i)
  ).toBeVisible({ timeout: 15_000 });
  // The app's own copy, not the server's: the API answers in Spanish regardless of
  // Accept-Language, so rendering its message would leak Spanish to EN users.
  await expect(
    page.getByText(/ya usaste todos los estados de cuenta|used every statement file/i)
  ).toBeVisible();
  await expect(page.getByText(/^(Ver Premium|See Premium)$/)).toBeVisible();
  await expect(page).not.toHaveURL(/premium/);
});
