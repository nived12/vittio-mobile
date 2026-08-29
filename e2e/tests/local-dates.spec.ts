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

const debt = {
  id: 1,
  name: "Fecha Pago Test",
  original_amount: 300000,
  current_balance: 86020.97,
  opening_balance: 100000,
  opening_balance_date: "2026-05-19",
  balance_as_of: "2026-07-18",
  target_payoff_date: "2028-08-15",
  interest_rate: 11.99,
  minimum_payment: null,
  due_day_of_month: null,
  payment_mode: null,
  payment_frequency: "monthly",
  target_payment_amount: null,
  status: "active",
  color: "#ef4444",
  icon: null,
  notes: null,
  auto_sync_transactions: false,
  calculation_settings: {},
  progress_percentage: 71,
  amount_remaining: 86020.97,
  amount_paid: 213979.03,
  goals: [],
  categories: [],
  bank_accounts: []
};

test("the debt payoff date round-trips as the day the API sent", async ({ page }) => {
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

    if (method === "GET" && pathname.endsWith("/api/v1/debts")) {
      return json({ data: { debts: [debt] } });
    }
    if (method === "GET" && pathname.endsWith("/api/v1/debts/1")) return json({ data: debt });
    return route.fallback();
  });

  await page.goto("/finances");
  await page.getByText(/^Debts$|^Deudas$/i).first().click();
  await page.getByText("Fecha Pago Test").first().click();
  await page.getByText(/^(Edit|Editar)$/i).click();

  // 2028-08-15, not 14/08/2028.
  await expect(page.getByText("15/08/2028")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("14/08/2028")).toHaveCount(0);
});

const goal = {
  id: 1,
  name: "Meta Fechas Test",
  goal_type: "savings_goal",
  status: "active",
  color: "#4f46e5",
  icon: null,
  start_date: "2026-06-23",
  deadline: "2027-04-07",
  debt_strategy: null,
  notes: null,
  progress_percentage: 0,
  amount_remaining: 10000,
  days_remaining: 222,
  monthly_contribution_needed: 1000,
  on_track: true,
  savings: [],
  debts: []
};

test("the goal deadline round-trips as the day the API sent", async ({ page }) => {
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

    if (method === "GET" && pathname.endsWith("/api/v1/goals")) {
      return json({ data: { goals: [goal] } });
    }
    if (method === "GET" && pathname.endsWith("/api/v1/goals/1")) return json({ data: goal });
    return route.fallback();
  });

  await page.goto("/finances");
  await page.getByText(/^Goals$|^Metas$/i).first().click();
  await page.getByText("Meta Fechas Test").first().click();

  // toLocaleDateString("es-MX") renders 2027-04-07 as 7/4/2027 — the 6th means the
  // deadline was parsed as UTC midnight again.
  await expect(page.getByText("7/4/2027")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("6/4/2027")).toHaveCount(0);
});
