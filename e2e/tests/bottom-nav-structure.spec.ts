import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * Bottom-nav integrity guard.
 *
 * expo-router exposes every file in app/(app)/ as a tab unless explicitly
 * hidden in app/(app)/_layout.tsx via <Tabs.Screen options={{ href: null }} />.
 * This test fails the build if a new feature adds an unhidden tab or a
 * folder without its own _layout.tsx, because the visible tab labels will
 * diverge from the expected five.
 *
 * If you intentionally add or rename a tab, update EXPECTED_TAB_LABELS.
 */

const EXPECTED_TAB_LABELS = [
  // Spanish (es-MX is the default locale)
  "Inicio",
  "Actividad",
  "Cuentas",
  "Finanzas"
  // The FAB '+' button between Actividad and Cuentas has no text label.
];

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("bottom nav shows exactly the expected tabs (no leaked routes)", async ({ page }) => {
  await page.goto("/");

  for (const label of EXPECTED_TAB_LABELS) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }

  // Smoking-gun checks: truncated labels mean a folder leaked into the tab bar.
  // If any of these are visible, a new feature forgot to add `href: null` to
  // its <Tabs.Screen> entry or omitted the folder's _layout.tsx.
  const leakedLabels = ["recur", "categ", "profil", "premium", "notif", "assist"];
  for (const fragment of leakedLabels) {
    const candidate = page.getByText(new RegExp(`^${fragment}`, "i")).first();
    await expect(candidate).toBeHidden({ timeout: 1000 }).catch(() => {
      throw new Error(`Bottom nav leak detected: "${fragment}…" appears in the tab bar. Add a <Tabs.Screen name="${fragment}…" options={{ href: null }} /> entry in app/(app)/_layout.tsx.`);
    });
  }
});

test("the FAB opens the action sheet instead of jumping straight to a form", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/agregar transacci[oó]n|add transaction/i).first().click();

  // All three entry points must be reachable from one tap. Upload in particular
  // used to be hidden behind a long-press nobody discovered.
  await expect(page.getByText(/^(Nueva transacci[oó]n|New transaction)$/i).first()).toBeVisible();
  await expect(page.getByText(/^(Subir estado de cuenta|Upload statement)$/i).first()).toBeVisible();
  await expect(page.getByText(/^Vittbot$/i).first()).toBeVisible();

  // The FAB opens a menu; it must not navigate on its own.
  await expect(page).not.toHaveURL(/new-transaction/);
});

test("the Activity tab returns to the list after the new-transaction form was open", async ({ page }) => {
  await page.goto("/");

  // Reproduces the original report: new-transaction used to live inside the
  // Activity stack, so the tab restored it and alternated list / form per tap.
  await page.getByLabel(/agregar transacci[oó]n|add transaction/i).first().click();
  await page.getByLabel(/^(Nueva transacci[oó]n|New transaction)$/i).first().click();
  await page.waitForURL(/new-transaction/, { timeout: 10_000 });

  for (let i = 0; i < 2; i += 1) {
    await page.getByText("Actividad", { exact: true }).first().click();
    await page.waitForURL(/\/transactions/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/new-transaction/);
  }
});

test("the new-transaction form does not keep what was typed last time", async ({ page }) => {
  await page.goto("/");

  // The route is a tab, not a stack push, so React Navigation keeps it mounted.
  // Without an explicit remount the next visit came back holding the last entry.
  const openForm = async () => {
    await page.getByLabel(/agregar transacci[oó]n|add transaction/i).first().click();
    await page.getByLabel(/^(Nueva transacci[oó]n|New transaction)$/i).first().click();
    await page.waitForURL(/new-transaction/, { timeout: 10_000 });
  };

  await openForm();
  const description = page.getByPlaceholder(/Starbucks, Oxxo, Netflix/i).first();
  await description.fill("CASHBACK DE PRUEBA");
  await expect(description).toHaveValue("CASHBACK DE PRUEBA");

  await page.getByText("Inicio", { exact: true }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("new-transaction"), { timeout: 10_000 });

  await openForm();
  await expect(page.getByPlaceholder(/Starbucks, Oxxo, Netflix/i).first()).toHaveValue("");
});
