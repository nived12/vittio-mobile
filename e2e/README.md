# Mobile Playwright E2E

This folder contains regression tests for `vittio-mobile` on Expo web.

## How It Works

- Tests run against a static web build in `dist/`.
- API calls are intercepted in `e2e/mocks/api-mocks.ts`.
- Mock fixture JSON files live in `e2e/mocks/responses/`.

## Prerequisites

- Install dependencies: `npm ci`
- Install Playwright browser once: `npx playwright install chromium`

## Local Run

1. Build Expo web output:
   - `EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1 npm run e2e:build`
2. Run tests:
   - `npm run e2e`
3. Open report:
   - `npm run e2e:report`

`playwright.config.ts` starts `serve dist -p 8081` automatically.

## Test Pattern

- `login(page)` is one line in each spec via `e2e/helpers/auth.ts`.
- `login(page)` calls `setupApiMocks(page)` before navigating.
- Prefer role/text/placeholder selectors (no RN web class selectors).

## Add a New Mock

Edit only `e2e/mocks/api-mocks.ts`.

Example:

```ts
await page.route("**/api/v1/goals**", (route) =>
  fulfillJson(route, { data: { goals: [] } })
);
```

## Add a New Test

Create a file under `e2e/tests/`:

```ts
import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.getByRole("tab", { name: "Finances" }).click();
});

test("finances tab renders", async ({ page }) => {
  await expect(page.getByText("Savings")).toBeVisible();
});
```
