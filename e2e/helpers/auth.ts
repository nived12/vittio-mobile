import { expect, type Page } from "@playwright/test";
import { setupApiMocks } from "../mocks/api-mocks";

export async function login(page: Page): Promise<void> {
  await setupApiMocks(page);
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
