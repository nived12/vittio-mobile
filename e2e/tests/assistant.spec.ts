import { expect, test, type Page } from "@playwright/test";
import { login } from "../helpers/auth";

// Vittbot mobile smoke tests — run against the Expo web build.
// All /api/v1/assistant/* requests are intercepted in api-mocks.ts.
// The real LLM is never reached.

function failOnLlmRequests(page: Page): void {
  const blockedHosts = [
    "generativelanguage.googleapis.com",
    "api.openai.com",
    "api.anthropic.com"
  ];
  page.on("request", (req) => {
    const url = req.url();
    if (blockedHosts.some((host) => url.includes(host))) {
      throw new Error(`Unexpected LLM request: ${url}`);
    }
  });
}

async function openAssistant(page: Page): Promise<void> {
  await page.goto("/assistant");
  await expect(page.getByText(/Vittbot/i).first()).toBeVisible({ timeout: 10_000 });
}

test.describe("Vittbot (mobile web)", () => {
  test.beforeEach(async ({ page }) => {
    failOnLlmRequests(page);
    await login(page);
  });

  test("empty state renders the 9 suggestion chips", async ({ page }) => {
    await openAssistant(page);

    // Each chip's label comes from i18n key assistant.suggestionChips.*
    const chipLabels = [
      /Cuánto gasté este mes/i,
      /patrimonio neto/i,
      /5 mayores gastos/i,
      /Cuánto debo en total/i,
      /estado de mis ahorros/i,
      /estado de mis metas/i,
      /gasto vs el mes pasado/i,
      /pagos recurrentes/i,
      /ingresos el mes pasado/i
    ];

    for (const label of chipLabels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("tapping the largest-expenses chip shows a reply with markdown rendered (no literal **)", async ({ page }) => {
    await openAssistant(page);

    await page.getByText(/5 mayores gastos/i).first().click();

    // Assistant message contains the bolded merchant — but NOT the literal "**"
    await expect(page.getByText(/Uber - Centro/i).first()).toBeVisible({ timeout: 10_000 });

    const allText = await page.locator("body").innerText();
    // The user's question can contain ** if the LLM mock echoed it, but our mock doesn't.
    // The assistant message body should not contain raw markdown asterisks pairs.
    const assistantBubble = page.locator("text=Tus 5 mayores gastos del mes:").first();
    await expect(assistantBubble).toBeVisible();
    const bubbleText = (await assistantBubble.evaluate((el) => el.parentElement?.parentElement?.innerText)) ?? allText;
    expect(bubbleText).not.toMatch(/\*\*\w/);
  });

  test("typing a custom message shows an assistant reply", async ({ page }) => {
    await openAssistant(page);

    const composer = page.getByPlaceholder(/Pregunta lo que quieras/i);
    await composer.fill("Hola Vittbot");

    await page.getByLabel(/Enviar/i).click();

    await expect(page.getByText(/Hola Vittbot/i).first()).toBeVisible();
    await expect(page.getByText(/asistente financiero/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("history modal lists conversations and loads one on tap", async ({ page }) => {
    // Override /assistant/conversations to return the populated list for this test.
    await page.route("**/api/v1/assistant/conversations*", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const body = {
        data: {
          conversations: [
            {
              id: "conv-1",
              title: "Mis mayores gastos",
              locale: "es",
              last_message_at: "2026-05-22T10:00:00Z",
              message_count: 2
            }
          ]
        },
        meta: { pagination: { page: 1, pages: 1, count: 1, page_size: 20 } }
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*"
        },
        body: JSON.stringify(body)
      });
    });

    await openAssistant(page);

    await page.getByLabel(/Historial/i).click();
    await expect(page.getByText(/Mis mayores gastos/i)).toBeVisible({ timeout: 5_000 });

    await page.getByText(/Mis mayores gastos/i).click();
    // Messages from the conversation detail fixture populate
    await expect(page.getByText(/Uber - Centro/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("new chat button clears the messages back to empty state", async ({ page }) => {
    await openAssistant(page);

    // Send a message to populate
    await page.getByText(/5 mayores gastos/i).first().click();
    await expect(page.getByText(/Uber - Centro/i).first()).toBeVisible({ timeout: 10_000 });

    // Tap new chat (+)
    await page.getByLabel(/Nueva conversación/i).click();

    // Back to empty state — suggestion chips visible again
    await expect(page.getByText(/Cuánto gasté este mes/i).first()).toBeVisible();
  });
});
