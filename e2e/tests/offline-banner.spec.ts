import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

// Offline banner (mobile web) — verifies the read-only offline indicator.
// The banner is driven by @react-native-community/netinfo, which on web reads
// navigator.onLine. Playwright's context.setOffline() flips that, so we can
// exercise the exact appear/disappear behavior users see on a device.
//
// Scope note: the on-disk cache persistence + logout purge run through the
// native AsyncStorage path on device and are verified manually on the iOS
// Simulator, not here — this spec covers only the user-visible banner.

test.describe("Offline banner (mobile web)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Land on the dashboard so the banner overlays a real, populated screen.
    await expect(
      page.getByText(/spending this month|gastos este mes/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("shows when offline and hides when back online", async ({ page, context }) => {
    const banner = page.getByText(
      /offline — showing saved data|sin conexión — mostrando datos guardados/i
    );

    // Online: no banner.
    await expect(banner).toHaveCount(0);

    // Go offline. context.setOffline() drops the network but does NOT dispatch
    // the DOM offline event / flip navigator.onLine, which is the signal the
    // banner (and the whole web platform) listens to — so we emit it explicitly.
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(banner.first()).toBeVisible();

    // Back online → banner disappears.
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(banner).toHaveCount(0);
  });
});
