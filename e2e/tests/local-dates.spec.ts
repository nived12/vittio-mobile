import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

// The API sends plain YYYY-MM-DD. `new Date("2026-09-28")` parses that as UTC
// midnight, which west of Greenwich is the previous day — the field showed 27/09
// and, because the modal writes what it shows back, walked the date one day
// earlier on every save. The timezone is pinned here on purpose: in UTC the bug
// is invisible and this spec would pass against the broken code.
test.use({ timezoneId: "America/Mexico_City", locale: "es-MX" });

const saving = {
  id: 1,
  name: "Fecha Limite Test",
  target_amount: 20000,
  current_amount: 0,
  opening_balance: 0,
  opening_balance_date: "2026-08-28",
  balance_as_of: "2026-08-28",
  target_date: "2026-09-28",
  status: "active",
  color: "#4f46e5",
  icon: null,
  notes: null,
  contribution_mode: null,
  contribution_frequency: "monthly",
  target_contribution_amount: null,
  auto_sync_transactions: false,
  calculation_settings: {},
  progress_percentage: 0,
  amount_remaining: 20000,
  goals: [],
  categories: [],
  bank_accounts: []
};

test("the deadline round-trips as the day the API sent, not the day before", async ({ page }) => {
  await login(page);
  await page.route("**/*", async (route) => {
    const method = route.request().method();
    const { pathname } = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body)
      });

    if (method === "GET" && pathname.endsWith("/api/v1/savings")) {
      return json({ data: { savings: [saving] } });
    }
    if (method === "GET" && pathname.endsWith("/api/v1/savings/1")) return json({ data: saving });
    return route.fallback();
  });

  await page.goto("/finances");
  await page.getByText("Fecha Limite Test").first().click();
  await page.getByText(/^(Edit|Editar)$/i).click();

  // 2026-09-28, not 27/09/2026.
  await expect(page.getByText("28/09/2026")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("27/09/2026")).toHaveCount(0);
});
