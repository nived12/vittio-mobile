import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers/auth";

// A saving/debt write can link or unlink transactions on its own, moving the balance
// for a reason the user did not directly ask for. The API reports what happened in
// backfill_summary and the app toasts it. On a device that toast auto-dismisses after
// 3s, which is too fast to screenshot reliably — asserting it here is what actually
// proves it renders.

interface BackfillSummary {
  linked: number;
  unlinked: number;
  skipped: boolean;
}

const savingFixture = {
  id: 1,
  name: "Emergency Fund",
  target_amount: 10000,
  current_amount: 500,
  opening_balance: 500,
  opening_balance_date: "2026-05-19",
  target_date: null,
  status: "active",
  color: "#4f46e5",
  icon: null,
  notes: null,
  contribution_mode: null,
  contribution_frequency: "monthly",
  target_contribution_amount: null,
  auto_sync_transactions: true,
  calculation_settings: {},
  progress_percentage: 5,
  amount_remaining: 9500,
  goals: [],
  categories: [],
  bank_accounts: []
};

const debtFixture = {
  ...savingFixture,
  name: "Credit Card",
  original_amount: 5000,
  current_balance: 4000,
  interest_rate: 18.5,
  minimum_payment: null,
  due_day_of_month: null,
  payment_mode: null,
  payment_frequency: "monthly",
  target_payment_amount: null,
  target_payoff_date: null,
  amount_paid: 1000
};

// Registered after login() on purpose: Playwright matches the most recently added
// route first, so this wins over the catch-all in api-mocks.
async function stubCreate(
  page: Page,
  resource: "savings" | "debts",
  summary: BackfillSummary
): Promise<void> {
  const body = resource === "savings" ? savingFixture : debtFixture;
  await page.route("**/*", async (route) => {
    const { pathname } = new URL(route.request().url());
    const isCreate =
      route.request().method() === "POST" && pathname.endsWith(`/api/v1/${resource}`);
    if (!isCreate) return route.fallback();

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ data: { ...body, backfill_summary: summary } })
    });
  });
}

/** Walks the empty state → template picker → pre-filled add form → save. */
async function createFromTemplate(page: Page, tab: "savings" | "debts"): Promise<void> {
  await page.goto("/finances");
  if (tab === "debts") {
    await page.getByText(/^Debts$|^Deudas$/i).first().click();
  }
  await page.getByText(/Start from a template|Comienza con una plantilla/i).click();
  const option =
    tab === "savings"
      ? page.getByRole("button", { name: /^Emergency Fund/i })
      : page.getByRole("button", { name: /^Credit Card/i });
  await option.click();
  // Debt templates deliberately never pre-fill balances (they are personal), so the
  // required original amount has to be typed or the form refuses to submit.
  if (tab === "debts") {
    await page.getByPlaceholder("0.00").first().fill("5000");
  }
  // The submit control is a Pressable with a Text child — it renders without a
  // button role, so match on its label rather than getByRole.
  await page
    .getByText(/^(Save Saving|Guardar Ahorro|Save Debt|Guardar Deuda)$/i)
    .click();
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("savings: reports how many transactions it linked", async ({ page }) => {
  await stubCreate(page, "savings", { linked: 2, unlinked: 0, skipped: false });

  await createFromTemplate(page, "savings");

  await expect(
    page.getByText(/We found 2 matching transactions|Encontramos 2 transacciones/i)
  ).toBeVisible();
});

test("savings: uses the singular wording for a single link", async ({ page }) => {
  await stubCreate(page, "savings", { linked: 1, unlinked: 0, skipped: false });

  await createFromTemplate(page, "savings");

  await expect(
    page.getByText(/We found 1 matching transaction already|Encontramos 1 transacci[oó]n/i)
  ).toBeVisible();
});

// The backfiller refuses sets above MAX_LINKS and reports skipped rather than a
// count. Before this, that came back as "0 linked" and the user was told nothing.
test("savings: says so when the match set was too large to link", async ({ page }) => {
  await stubCreate(page, "savings", { linked: 0, unlinked: 0, skipped: true });

  await createFromTemplate(page, "savings");

  await expect(
    page.getByText(/too many matching transactions|demasiadas transacciones/i)
  ).toBeVisible();
});

test("debts: reports links against the debt copy", async ({ page }) => {
  await stubCreate(page, "debts", { linked: 3, unlinked: 0, skipped: false });

  await createFromTemplate(page, "debts");

  await expect(
    page.getByText(/We found 3 matching transactions|Encontramos 3 transacciones/i)
  ).toBeVisible();
});

// Unlinking only ever happens on an update — re-anchoring forward releases the
// transactions the retyped figure now covers. It is the case where the balance moves
// DOWN without the user asking, so the wording is worth pinning.
test("savings: reports what re-anchoring unlinked", async ({ page }) => {
  const summary = { linked: 0, unlinked: 2, skipped: false };
  // auto-sync with no categories or accounts is an invalid combination the edit form
  // refuses to submit (AddEditSavingModal validates it), so the record under edit
  // has it off — what is being asserted here is the response, not the request.
  const editable = { ...savingFixture, auto_sync_transactions: false };
  await page.route("**/*", async (route) => {
    const method = route.request().method();
    const { pathname } = new URL(route.request().url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body)
      });

    if (method === "GET" && pathname.endsWith("/api/v1/savings")) {
      return json({ data: { savings: [editable] } });
    }
    if (method === "GET" && pathname.endsWith("/api/v1/savings/1")) {
      return json({ data: { ...editable, balance_as_of: "2026-05-19" } });
    }
    if (method === "PATCH" && pathname.endsWith("/api/v1/savings/1")) {
      return json({ data: { ...editable, backfill_summary: summary } });
    }
    return route.fallback();
  });

  await page.goto("/finances");
  await page.getByText("Emergency Fund").first().click();
  await page.getByText(/^(Edit|Editar)$/i).click();
  await page.getByText(/^(Save Changes|Guardar Cambios)$/i).click();

  await expect(
    page.getByText(/We unlinked 2 transactions|Desvinculamos 2 transacciones/i)
  ).toBeVisible();
});

test("no toast when the write linked nothing", async ({ page }) => {
  await stubCreate(page, "savings", { linked: 0, unlinked: 0, skipped: false });

  await createFromTemplate(page, "savings");

  await expect(
    page.getByText(/We found|Encontramos|too many|demasiadas/i)
  ).toHaveCount(0);
});
