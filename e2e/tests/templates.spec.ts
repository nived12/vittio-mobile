import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

// Mocked /savings and /debts both return an empty list (see api-mocks.ts),
// so the empty state's "Start from a template" secondary CTA is exercised.

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/finances");
});

test("savings empty state offers a template; picking one opens a pre-filled add form", async ({ page }) => {
  await expect(page.getByText(/No savings yet|Sin ahorros aún/i)).toBeVisible();

  await page.getByText(/Start from a template|Comienza con una plantilla/i).click();

  const emergencyFundOption = page.getByRole("button", { name: /^Emergency Fund/i });
  await expect(emergencyFundOption).toBeVisible();
  await expect(page.getByRole("button", { name: /^Vacation Fund/i })).toBeVisible();

  await emergencyFundOption.click();

  await expect(page.getByText(/New Saving|Nuevo Ahorro/i)).toBeVisible();
  await expect(page.locator('input[value="Emergency Fund"]')).toBeVisible();
  await expect(page.locator('input[value="10000"]')).toBeVisible();

  // Advanced settings carry the template's category + calculation settings.
  await page.getByText(/Advanced Settings|Configuración Avanzada/i).click();
  await expect(page.getByText(/Calculation Settings|Configuración de Cálculo/i)).toBeVisible();
  // The template's category ("Fondo de Emergencia") is pre-selected.
  await expect(page.getByText(/1 selected|1 seleccionada/i)).toBeVisible();
});

test("debts empty state offers a template; picking one opens a pre-filled add form", async ({ page }) => {
  await page.getByText(/^Debts$|^Deudas$/i).first().click();
  await expect(page.getByText(/No debts tracked|Sin deudas registradas/i)).toBeVisible();

  await page.getByText(/Start from a template|Comienza con una plantilla/i).click();

  const creditCardOption = page.getByRole("button", { name: /^Credit Card/i });
  await expect(creditCardOption).toBeVisible();
  await creditCardOption.click();

  await expect(page.getByText(/New Debt|Nueva Deuda/i)).toBeVisible();
  await expect(page.locator('input[value="Credit Card"]')).toBeVisible();
  await expect(page.locator('input[value="18.5"]')).toBeVisible();
});
