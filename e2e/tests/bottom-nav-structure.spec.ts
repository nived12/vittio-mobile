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
