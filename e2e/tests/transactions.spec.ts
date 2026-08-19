import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/transactions");
});

test("transactions tab renders and supports search", async ({ page }) => {
  await expect(
    page.getByRole("search", { name: /search transactions|buscar transacciones/i })
  ).toBeVisible();
  await expect(page.getByText("Nomina").first()).toBeVisible();
});

test("empty transactions list offers a statement upload", async ({ page }) => {
  await page.route("**/api/v1/transactions*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        data: { transactions: [] },
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
    page.getByRole("button", { name: /subir estado de cuenta|upload statement/i }).first()
  ).toBeVisible();
});
