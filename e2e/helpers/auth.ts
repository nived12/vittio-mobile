import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { setupApiMocks } from "../mocks/api-mocks";

/**
 * @param userOverrides merged into the logged-in user. The app keeps this object in
 *   the auth store and reads it directly, so overriding the login response — not
 *   GET /user — is what changes what a screen renders.
 */
export async function login(
  page: Page,
  userOverrides?: Record<string, unknown>
): Promise<void> {
  await setupApiMocks(page);

  // Registered after setupApiMocks on purpose: Playwright matches the most recently
  // added route first, so this wins over the catch-all.
  if (userOverrides) {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, "..", "mocks", "responses", "auth-login.json"), "utf-8")
    );
    fixture.data.user = { ...fixture.data.user, ...userOverrides };

    await page.route("**/*", async (route) => {
      const method = route.request().method();
      const { pathname } = new URL(route.request().url());
      // Match on the exact API paths, not "**/login" — that would also catch the
      // navigation to the /login page itself.
      const isLogin = method === "POST" && pathname.endsWith("/api/v1/login");
      // The app refetches /user right after signing in and writes it back to the
      // store, so overriding only the login response gets silently reverted.
      const isMe = method === "GET" && pathname.endsWith("/api/v1/user");
      if (!isLogin && !isMe) return route.fallback();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(isLogin ? fixture : { data: fixture.data.user })
      });
    });
  }

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /welcome back|bienvenido de vuelta/i })
  ).toBeVisible({ timeout: 20_000 });
  await page
    .getByPlaceholder(/email@example\.com|correo@ejemplo\.com/i)
    .fill("nivedvengilat@example.com");
  await page.locator("input[type='password']").fill("test123");
  await page.getByRole("button", { name: /sign in|iniciar sesi[oó]n/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 20_000
  });
}
