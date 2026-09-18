import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * Walks the whole new-transaction flow rather than asserting one fix at a time.
 *
 * Both regressions from #35 were invisible to per-fix specs: picking a category
 * used to push into the Activity tab's stack and take the form off screen, and
 * the form came back holding the last entry. A spec that walks the flow sees
 * both; a spec that checks one screen does not.
 */

const openForm = async (page: import("@playwright/test").Page) => {
  await page.getByLabel(/agregar transacci[oó]n|add transaction/i).first().click();
  await page.getByLabel(/^(Nueva transacci[oó]n|New transaction)$/i).first().click();
  await page.waitForURL(/new-transaction/, { timeout: 10_000 });
};

const descriptionField = (page: import("@playwright/test").Page) =>
  page.getByPlaceholder(/Starbucks, Oxxo, Netflix/i).first();

/**
 * Filters before clicking: the category name also appears on the screens behind
 * the sheet, and those copies sit under its backdrop, so a bare text match picks
 * an element that cannot be clicked. Searching first leaves one row, and it
 * exercises the sheet's search on the way through.
 */
const pickCategory = async (page: import("@playwright/test").Page, name: string) => {
  await page.getByText(/^(Sin categor[ií]a|Uncategorized)$/i).first().click();
  await page.getByPlaceholder(/Buscar categor[ií]as|Search categories/i).fill(name);
  await page.getByRole("button", { name, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/");
});

test("picking a category keeps you on the form with what you typed", async ({ page }) => {
  await openForm(page);
  await descriptionField(page).fill("CAFE DE PRUEBA");

  await pickCategory(page, "Comida");

  // The whole bug: this used to navigate into the Activity tab, so the form
  // disappeared rather than the category being set.
  await expect(page).toHaveURL(/new-transaction/);
  await expect(descriptionField(page)).toHaveValue("CAFE DE PRUEBA");
  await expect(page.getByText("Comida", { exact: true }).first()).toBeVisible();
});

test("the form is empty again the next time it is opened", async ({ page }) => {
  await openForm(page);
  await descriptionField(page).fill("CAFE DE PRUEBA");
  await pickCategory(page, "Comida");

  await page.getByText("Inicio", { exact: true }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("new-transaction"), { timeout: 10_000 });

  await openForm(page);
  await expect(descriptionField(page)).toHaveValue("");
  await expect(page.getByText(/^(Sin categor[ií]a|Uncategorized)$/i).first()).toBeVisible();
});
