import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * A user with no bank account used to hit a dead end: the statement upload showed
 * an empty picker and a permanently greyed button, and the transaction form said
 * "add an account first" without offering any way to. Every surface that needs an
 * account must now be able to create one inline.
 */

// Passed to login() so it is registered after setupApiMocks but before the app's
// first fetch. Playwright matches the most recently added route first, so this
// wins over the catch-all in api-mocks.
async function stubNoAccounts(page: Page): Promise<void> {
  await page.route("**/*", async (route) => {
    const { pathname } = new URL(route.request().url());
    const isAccounts =
      route.request().method() === "GET" && pathname.endsWith("/api/v1/bank_accounts");
    if (!isAccounts) return route.fallback();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ data: [] })
    });
  });
}

test.beforeEach(async ({ page }) => {
  // Stub before the first fetch: React Query persists its cache, so stubbing
  // after login and reloading still renders the seeded accounts.
  await login(page, undefined, stubNoAccounts);
});

test("the dashboard explains an account is needed and its CTA opens the form", async ({ page }) => {
  await expect(
    page
      .getByText(
        /Agrega una cuenta para registrar transacciones|Add an account to record transactions/i
      )
      .first()
  ).toBeVisible();

  await page.getByText(/^(Agregar cuenta|Add account)$/i).first().click();

  // The create form itself, not a navigation to the Accounts tab.
  await expect(
    page.getByText(/Agregar cuenta bancaria|Add bank account|Selecciona tu banco|Select your bank/i).first()
  ).toBeVisible();
});

test("the statement upload offers account creation instead of an empty picker", async ({ page }) => {
  await page.getByLabel(/agregar transacci[oó]n|add transaction/i).first().click();
  await page.getByLabel(/^(Subir estado de cuenta|Upload statement)$/i).first().click();

  await expect(
    page
      .getByText(
        /Necesitas una cuenta bancaria para poder subir|You need a bank account before you can upload/i
      )
      .first()
  ).toBeVisible();

  await expect(page.getByText(/^(Agregar cuenta|Add account)$/i).first()).toBeVisible();
});

test("the transaction form offers account creation instead of a dead end", async ({ page }) => {
  await page.getByLabel(/agregar transacci[oó]n|add transaction/i).first().click();
  await page.getByLabel(/^(Nueva transacci[oó]n|New transaction)$/i).first().click();
  await page.waitForURL(/new-transaction/, { timeout: 10_000 });

  await expect(
    page
      .getByText(
        /Necesitas una cuenta bancaria antes de registrar|You need a bank account before you can record/i
      )
      .first()
  ).toBeVisible();

  await expect(page.getByText(/^(Agregar cuenta|Add account)$/i).first()).toBeVisible();
});
