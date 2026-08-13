import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, Route } from "@playwright/test";
const fixturesDir = join(__dirname, "responses");

function readFixture<T>(name: string): T {
  const filePath = join(fixturesDir, name);
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, Accept, X-Requested-With"
};

function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: corsHeaders,
    body: JSON.stringify(body)
  });
}

export async function setupApiMocks(page: Page): Promise<void> {
  const authLogin = readFixture<{ data: { user: unknown } }>("auth-login.json");
  const dashboard = readFixture<unknown>("dashboard.json");
  const bankAccounts = readFixture<unknown>("bank-accounts.json");
  const transactions = readFixture<{
    list: { data: { transactions: Array<Record<string, unknown>> } };
    summary: unknown;
  }>("transactions.json");
  const importedTransaction = transactions.list.data.transactions.find(
    (tx) => tx.source === "statement_file"
  );

  const assistantUsage = readFixture<unknown>("assistant-usage.json");
  const assistantConversationsEmpty = readFixture<unknown>("assistant-conversations-empty.json");
  const assistantChatLargestExpenses = readFixture<unknown>("assistant-chat-largest-expenses.json");
  const assistantChatCustom = readFixture<unknown>("assistant-chat-custom.json");
  const assistantConversationDetail = readFixture<unknown>("assistant-conversation-detail.json");
  const templates = readFixture<unknown>("templates.json");

  await page.route("**/*", (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname.toLowerCase();
    const resourceType = route.request().resourceType();
    if (process.env.DEBUG_E2E_MOCKS === "1") {
      console.log(`[e2e-mock] ${method} ${pathname}`);
    }

    if (resourceType === "document") {
      return route.continue();
    }

    const isApiRequest =
      pathname.endsWith("/login") ||
      pathname.endsWith("/user") ||
      pathname.includes("/dashboard") ||
      pathname.endsWith("/bank_accounts") ||
      pathname.includes("/transactions/summary") ||
      pathname.includes("/recurring") ||
      pathname.endsWith("/transactions") ||
      /\/transactions\/\d+$/.test(pathname) ||
      pathname.endsWith("/categories") ||
      pathname.endsWith("/user_settings") ||
      pathname.includes("/subscription") ||
      pathname.includes("/assistant/") ||
      pathname.endsWith("/savings") ||
      pathname.endsWith("/debts") ||
      pathname.endsWith("/templates");

    if (!isApiRequest) {
      return route.continue();
    }

    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    if (pathname.endsWith("/login")) {
      return fulfillJson(route, authLogin);
    }
    if (pathname.endsWith("/user")) {
      return fulfillJson(route, { data: authLogin.data.user });
    }
    if (pathname.includes("/dashboard")) {
      return fulfillJson(route, dashboard);
    }
    // Default trial state. Specs that need another billing state register their own
    // route after setupApiMocks — Playwright matches most-recently-added first.
    if (pathname.includes("/subscription")) {
      return fulfillJson(route, {
        data: {
          plan: null,
          status: "trialing",
          billing_interval: null,
          billing_source: null,
          trial_ends_at: null,
          current_period_end: null,
          cancel_at_period_end: false,
          ai_calls_used: 3,
          ai_calls_limit: 15,
          statement_files_used: 1,
          statement_files_limit: 12
        }
      });
    }
    if (pathname.endsWith("/bank_accounts")) {
      if (method === "GET") return fulfillJson(route, bankAccounts);
      return fulfillJson(route, { data: {} }, 201);
    }
    if (pathname.endsWith("/user") && method === "DELETE") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    if (pathname.includes("/transactions/summary")) {
      return fulfillJson(route, transactions.summary);
    }
    // Single transaction detail / update / delete (e.g. /transactions/9002)
    if (/\/transactions\/\d+$/.test(pathname)) {
      if (method === "DELETE") {
        return fulfillJson(route, { data: { message: "Transaction deleted successfully" } });
      }
      if (method === "PATCH") {
        const body = route.request().postDataJSON?.() ?? {};
        const patch =
          body && typeof body === "object" && body.transaction ? body.transaction : {};
        return fulfillJson(route, { data: { ...importedTransaction, ...patch } });
      }
      return fulfillJson(route, { data: importedTransaction });
    }
    if (pathname.includes("/recurring/scan")) {
      return fulfillJson(route, { data: { detected: [] } });
    }
    if (pathname.endsWith("/recurring") || pathname.match(/\/recurring\/\d+$/)) {
      if (method === "GET" && pathname.endsWith("/recurring")) {
        return fulfillJson(route, {
          data: {
            series: [
              {
                id: 1,
                name: "Netflix",
                description_signature: "netflix",
                merchant_hint: "Netflix",
                expected_amount: 219.0,
                amount_variance_pct: 0,
                frequency: "monthly",
                custom_interval_days: null,
                interval_days: 30,
                next_due_date: "2026-06-05",
                last_charged_at: "2026-05-05",
                last_notified_on: null,
                category_id: null,
                transaction_type: "fixed_expense",
                status: "active",
                source: "manual",
                confidence_score: null,
                occurrences_count: 5,
                notes: null,
                monthly_estimate: 219.0,
                annual_estimate: 2664.0,
                detected_at: null,
                confirmed_at: null,
                cancelled_at: null,
                created_at: "2026-05-01T00:00:00Z",
                updated_at: "2026-05-05T00:00:00Z"
              }
            ],
            summary: {
              monthly_total: 219.0,
              annual_total: 2664.0,
              active_count: 1,
              detected_count: 0,
              upcoming: []
            }
          }
        });
      }
      if (method === "GET") {
        return fulfillJson(route, { data: { id: 1, name: "Netflix", expected_amount: 219.0, frequency: "monthly", monthly_estimate: 219.0, annual_estimate: 2664.0, next_due_date: "2026-06-05", status: "active", interval_days: 30, transaction_type: "fixed_expense", source: "manual", description_signature: "netflix", amount_variance_pct: 0, custom_interval_days: null, last_charged_at: null, last_notified_on: null, category_id: null, confidence_score: null, occurrences_count: 0, notes: null, merchant_hint: null, detected_at: null, confirmed_at: null, cancelled_at: null, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" } });
      }
      if (method === "POST") return fulfillJson(route, { data: { id: 2 } }, 201);
      if (method === "PATCH") return fulfillJson(route, { data: { id: 1 } });
      if (method === "DELETE") return route.fulfill({ status: 204, headers: corsHeaders });
    }
    if (pathname.endsWith("/transactions")) {
      if (method === "GET") return fulfillJson(route, transactions.list);
      return fulfillJson(route, { data: {} }, 201);
    }
    if (pathname.endsWith("/categories")) {
      return fulfillJson(route, {
        data: {
          categories: [
            { id: 1, name: "Ingresos", icon: "wallet", parent_id: null, children: [] },
            { id: 5, name: "Comida", icon: "utensils", parent_id: null, children: [] },
            {
              id: 30, name: "Ahorros e Inversiones", icon: "piggy-bank", parent_id: null,
              children: [{ id: 31, name: "Fondo de Emergencia", icon: "shield", parent_id: 30, children: [] }]
            },
            {
              id: 40, name: "Deudas y Préstamos", icon: "credit-card", parent_id: null,
              children: [{ id: 41, name: "Tarjetas de Crédito", icon: "credit-card", parent_id: 40, children: [] }]
            }
          ]
        }
      });
    }
    if (pathname.endsWith("/user_settings")) {
      return fulfillJson(route, {
        data: {
          notify_statement_imports: true,
          notify_goal_milestones: true,
          notify_debt_reminders: true,
          // Without this the privacy notice renders in every logged-in spec as a
          // bottom sheet, covering the composer and tab bar. Specs that want it
          // should override this route.
          analytics_notice_seen_at: "2026-01-01T00:00:00Z"
        }
      });
    }

    // ── Assistant (Vittbot) ──────────────────────────────────────────────
    if (pathname.endsWith("/assistant/usage")) {
      return fulfillJson(route, assistantUsage);
    }
    if (pathname.endsWith("/assistant/conversations")) {
      if (method === "GET") return fulfillJson(route, assistantConversationsEmpty);
      return fulfillJson(route, { data: {} }, 201);
    }
    if (/\/assistant\/conversations\/[^/]+$/.test(pathname)) {
      if (method === "DELETE") return fulfillJson(route, {}, 204);
      return fulfillJson(route, assistantConversationDetail);
    }
    if (pathname.endsWith("/assistant/chat")) {
      const body = route.request().postDataJSON?.() ?? null;
      const suggestionKey = body && typeof body === "object" ? body.suggestion_key : null;
      if (suggestionKey === "largest_expenses") {
        return fulfillJson(route, assistantChatLargestExpenses);
      }
      return fulfillJson(route, assistantChatCustom);
    }

    // ── Starter templates / savings / debts ───────────────────────────────
    if (pathname.endsWith("/templates")) {
      return fulfillJson(route, templates);
    }
    if (pathname.endsWith("/savings")) {
      if (method === "GET") return fulfillJson(route, { data: { savings: [] } });
      return fulfillJson(route, { data: {} }, 201);
    }
    if (pathname.endsWith("/debts")) {
      if (method === "GET") return fulfillJson(route, { data: { debts: [] } });
      return fulfillJson(route, { data: {} }, 201);
    }

    return fulfillJson(route, { data: {} });
  });
}
