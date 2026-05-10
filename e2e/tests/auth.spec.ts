import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test("login renders app tabs", async ({ page }) => {
  await login(page);
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByText(/spending this month|gastos este mes/i).first()).toBeVisible();
});
