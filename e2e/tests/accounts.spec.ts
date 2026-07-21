import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/accounts");
});

test("accounts tab renders list", async ({ page }) => {
  // .first() — the tab-bar "Cuentas" label also matches as a heading on web.
  await expect(page.getByRole("heading", { name: /accounts|cuentas/i }).first()).toBeVisible();
  await expect(page.getByText(/total balance|saldo total/i).first()).toBeVisible();
  await expect(page.getByText("BBVA TDD").first()).toBeVisible();
});
