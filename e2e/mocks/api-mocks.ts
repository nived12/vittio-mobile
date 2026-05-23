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
  const transactions = readFixture<{ list: unknown; summary: unknown }>("transactions.json");

  const assistantUsage = readFixture<unknown>("assistant-usage.json");
  const assistantConversationsEmpty = readFixture<unknown>("assistant-conversations-empty.json");
  const assistantChatLargestExpenses = readFixture<unknown>("assistant-chat-largest-expenses.json");
  const assistantChatCustom = readFixture<unknown>("assistant-chat-custom.json");
  const assistantConversationDetail = readFixture<unknown>("assistant-conversation-detail.json");

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
      pathname.includes("/transactions/recurring_suggestions") ||
      pathname.endsWith("/transactions") ||
      pathname.endsWith("/categories") ||
      pathname.endsWith("/user_settings") ||
      pathname.includes("/assistant/");

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
    if (pathname.endsWith("/bank_accounts")) {
      if (method === "GET") return fulfillJson(route, bankAccounts);
      return fulfillJson(route, { data: {} }, 201);
    }
    if (pathname.includes("/transactions/summary")) {
      return fulfillJson(route, transactions.summary);
    }
    if (pathname.includes("/transactions/recurring_suggestions")) {
      return fulfillJson(route, { data: [] });
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
            { id: 5, name: "Comida", icon: "utensils", parent_id: null, children: [] }
          ]
        }
      });
    }
    if (pathname.endsWith("/user_settings")) {
      return fulfillJson(route, {
        data: {
          notify_statement_imports: true,
          notify_goal_milestones: true,
          notify_debt_reminders: true
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

    return fulfillJson(route, { data: {} });
  });
}
