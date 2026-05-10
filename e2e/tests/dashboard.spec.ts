import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("dashboard shows key sections", async ({ page }) => {
  await expect(page.getByText(/spending this month|gastos este mes/i).first()).toBeVisible();
  await expect(page.getByText(/recent transactions|transacciones recientes/i).first()).toBeVisible();
  await expect(page.getByText(/see all|ver todo/i).first()).toBeVisible();
});
