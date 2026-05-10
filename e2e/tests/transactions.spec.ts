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
