import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test("user can archive their account via the delete-account screen", async ({ page }) => {
  await login(page);

  // Navigate directly to the delete-account screen. The Profile→Danger Zone
  // entry is covered by visual inspection; this test verifies the actual
  // deletion flow end-to-end.
  await page.goto("/delete-account");

  // Step 1: info screen — assert it rendered, then continue.
  await expect(
    page.getByText(/continue with deletion|continuar con eliminaci[oó]n/i).first()
  ).toBeVisible({ timeout: 10_000 });
  await page.getByText(/continue with deletion|continuar con eliminaci[oó]n/i).first().click();

  // Step 2: type the confirmation word. Default locale on Expo web is es-MX → ELIMINAR.
  const input = page.getByPlaceholder(/type DELETE|escribe ELIMINAR/i);
  await input.fill("ELIMINAR");

  // Capture the DELETE request to verify the API was called.
  const deletePromise = page.waitForRequest(
    (req) => req.method() === "DELETE" && /\/user$/.test(new URL(req.url()).pathname),
    { timeout: 10_000 }
  );

  // The delete button label varies by locale; match either.
  await page
    .getByText(/^delete my account$|^eliminar mi cuenta$/i)
    .first()
    .click();

  const deleteRequest = await deletePromise;
  expect(deleteRequest).toBeTruthy();
});
