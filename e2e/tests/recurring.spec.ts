import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("recurring index renders hero totals and the seeded Netflix series", async ({ page }) => {
  await page.goto("/recurring");
  await expect(page.getByText(/Monthly total|Total mensual/i)).toBeVisible();
  await expect(page.getByText(/Annual total|Total anual/i)).toBeVisible();
  await expect(page.getByText("Netflix")).toBeVisible();
});

test("scan button is present and does not crash on no-detection result", async ({ page }) => {
  await page.goto("/recurring");
  const scanBtn = page.getByText(/Scan for recurring|Buscar recurrentes/i);
  await expect(scanBtn).toBeVisible();
  await scanBtn.click();
  // Still on the page after scan
  await expect(page.getByText(/Monthly total|Total mensual/i)).toBeVisible();
});

test("New recurring modal opens with form fields", async ({ page }) => {
  await page.goto("/recurring");
  await expect(page.getByText(/Monthly total|Total mensual/i)).toBeVisible();

  await page.getByRole("button", { name: /new recurring|nuevo recurrente/i }).click();

  await expect(page.getByText(/New recurring|Nuevo recurrente/i)).toBeVisible();
  await expect(page.getByText(/^Name$|^Nombre$/i)).toBeVisible();
  await expect(page.getByText(/^Amount$|^Monto$/i)).toBeVisible();
  await expect(page.getByText(/^Frequency$|^Frecuencia$/i)).toBeVisible();
});

test("Transactions header shows the 'Recurrentes' chip when active count > 0", async ({ page }) => {
  // The mock returns active_count: 1 (Netflix), so the chip should be visible.
  await page.goto("/transactions");
  await expect(page.getByText(/Recurrentes|Recurring/i).first()).toBeVisible();
});
