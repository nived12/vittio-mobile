import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * Paywall states that Expo web can render truthfully.
 *
 * Deliberately NOT covered: the iOS App Store purchase flow. Playwright runs the
 * web export, where Platform.OS === 'web', so the `isIOS` branch in premium.tsx —
 * StoreKit packages, purchase, Restore Purchases — is unreachable here and cannot
 * be faked without testing a mock instead of the app. That path is verified by
 * hand against a Sandbox tester before every submission that touches it.
 */

test("trialing user is offered both Stripe plans", async ({ page }) => {
  await login(page);
  await page.goto("/premium");

  await expect(page.getByText(/monthly|mensual/i).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/annual|anual/i).first()).toBeVisible();
  // IVA-inclusive pricing is a legal requirement in Mexico, not decoration.
  await expect(page.getByText(/vat included|iva incluido/i)).toBeVisible();
});

test("Apple-billed user is sent to Apple, never to the Stripe portal", async ({ page }) => {
  await login(page, {
    subscription_status: "active",
    billing_source: "apple",
    subscription_interval: "month"
  });
  await page.goto("/premium");

  await expect(page.getByText(/billed by apple|se cobra a través de apple/i)).toBeVisible({
    timeout: 20_000
  });
  await expect(page.getByText(/manage in apple|gestionar en ajustes de apple/i)).toBeVisible();

  // The server refuses a Stripe portal session for these users, and there is no way
  // to cancel an App Store plan on their behalf — so the button must not be offered.
  await expect(page.getByText(/^manage subscription$|^gestionar suscripción$/i)).toHaveCount(0);
});

test("Stripe-billed user keeps the billing portal", async ({ page }) => {
  await login(page, {
    subscription_status: "active",
    billing_source: "stripe",
    subscription_interval: "year"
  });
  await page.goto("/premium");

  await expect(page.getByText(/manage subscription|gestionar suscripción/i)).toBeVisible({
    timeout: 20_000
  });
  await expect(page.getByText(/billed by apple|se cobra a través de apple/i)).toHaveCount(0);
});
