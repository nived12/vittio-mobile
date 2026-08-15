import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers/auth";

// Reviewing transfer candidates is the only way a mobile user can act on pairs the
// reconciler refused to link on its own, and both outcomes are destructive in their own
// direction: linking erases a real expense and a real income from every total, dismissing
// is permanent because the reconciler never re-offers a rejected pair.
//
// These drive the ✕ / ✓ buttons rather than the swipe. Reanimated gestures do not survive
// the Expo web build, and the buttons are the accessible path that must work anyway — so
// this covers the decision logic, the auto-submit, and the payload, while the gesture
// itself is verified by hand on a simulator.
test.beforeEach(async ({ page }) => {
  await login(page);
});

const dismissButton = (page: Page) => page.getByRole("button", { name: /descartar|dismiss/i });
const linkButton = (page: Page) => page.getByRole("button", { name: /vincular|link/i });

test("the transactions header chip shows the pending count", async ({ page }) => {
  await page.goto("/transactions");

  // Icon + count only: a second labelled chip overflows the header and gets cropped.
  await expect(page.getByRole("button", { name: /posibles transferencias|possible transfers/i }))
    .toBeVisible();
});

test("the deck opens on the first candidate with both sides and the date gap", async ({ page }) => {
  await page.goto("/transactions/candidates");

  await expect(page.getByText(/posibles transferencias|possible transfers/i).first()).toBeVisible();
  await expect(page.getByText("$5,555.00")).toBeVisible();
  await expect(page.getByText("Banorte TDD • 5678").first()).toBeVisible();
  await expect(page.getByText("Santander TDD • 9012").first()).toBeVisible();

  // days_apart comes from the API and is pluralised client-side. The web modal once
  // hardcoded "1 day apart", which read as a bug when the window widened to ±3.
  await expect(page.getByText(/2 días de diferencia|2 days apart/i)).toBeVisible();
  await expect(page.getByText(/1 de 2|1 of 2/i)).toBeVisible();
});

test("deciding advances the deck and offers undo, writing nothing yet", async ({ page }) => {
  let resolveCalls = 0;
  await page.route("**/transfer_candidates/resolve", async (route) => {
    resolveCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { linked_count: 1, rejected_count: 0 } })
    });
  });

  await page.goto("/transactions/candidates");
  await expect(page.getByText("$5,555.00")).toBeVisible();

  await linkButton(page).click();

  // Second card, and the last one — so the commit hint appears alongside undo.
  await expect(page.getByText("$7,777.00")).toBeVisible();
  await expect(page.getByText(/2 de 2|2 of 2/i)).toBeVisible();
  await expect(page.getByText(/se guardan tus decisiones|saves your decisions/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /deshacer|undo/i })).toBeVisible();

  // Nothing is written until the deck runs out.
  expect(resolveCalls).toBe(0);
});

test("undo returns the previous card to the top of the deck", async ({ page }) => {
  await page.goto("/transactions/candidates");
  await expect(page.getByText("$5,555.00")).toBeVisible();

  await linkButton(page).click();
  await expect(page.getByText("$7,777.00")).toBeVisible();

  await page.getByRole("button", { name: /deshacer|undo/i }).click();

  await expect(page.getByText("$5,555.00")).toBeVisible();
  await expect(page.getByText(/1 de 2|1 of 2/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /deshacer|undo/i })).toHaveCount(0);
});

test("the last decision submits the whole batch with the right ids", async ({ page }) => {
  let payload: { accepted_ids?: number[]; rejected_ids?: number[] } | null = null;

  await page.route("**/transfer_candidates/resolve", async (route) => {
    payload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { linked_count: 1, rejected_count: 1 } })
    });
  });

  await page.goto("/transactions/candidates");
  await expect(page.getByText("$5,555.00")).toBeVisible();

  await linkButton(page).click();
  await expect(page.getByText("$7,777.00")).toBeVisible();
  await dismissButton(page).click();

  await expect.poll(() => payload).not.toBeNull();
  expect(payload!.accepted_ids).toEqual([501]);
  expect(payload!.rejected_ids).toEqual([502]);
});

test("an empty queue shows the empty state rather than an empty deck", async ({ page }) => {
  await page.route("**/transfer_candidates", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { candidates: [] }, meta: { total: 0 } })
    });
  });

  await page.goto("/transactions/candidates");

  await expect(page.getByText(/nada por revisar|nothing to review/i)).toBeVisible();
});
