# Mobile Playwright E2E

Regression tests for Expo **web** export (`dist/`). API traffic is mocked in Playwright — you do **not** need a running backend for the current suite.

## How it works

- `npm run e2e:build` runs `expo export --platform web` into `dist/`.
- That script sets `EXPO_PUBLIC_E2E=1` so token storage behaves like development on web (static export uses `localStorage`; see `src/utils/tokenStorage.ts`).
- Routes under `**/api/v1/**` are fulfilled from `e2e/mocks/api-mocks.ts` and JSON in `e2e/mocks/responses/`.

`EXPO_PUBLIC_API_URL` is still compiled into the bundle at build time; use any consistent base URL. Playwright mocks override real HTTP for the API paths tests hit.

## Prerequisites

- Node **22+** (`nvm use 22`)
- Dependencies: `npm ci`
- Browsers once: `npx playwright install chromium`

## Local run

1. Build web output (set API base if you rely on non-mocked calls; mocks cover the default flows):

   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1 npm run e2e:build
   ```

2. Run tests:

   ```bash
   npm run e2e
   ```

3. Open HTML report:

   ```bash
   npm run e2e:report
   ```

`e2e/playwright.config.ts` starts `npx serve dist -p 8081 --no-clipboard` with `cwd` at the app root (parent of `e2e/`) and waits up to 90s for `http://127.0.0.1:8081`.

## On-demand CI

- Post a PR comment containing **`run-e2e`** to run `.github/workflows/e2e.yml`.
- Comment-triggered runs resolve the workflow from the repo **default branch** until that YAML is merged there.

Artifacts and reports:

- Reports: `e2e/playwright-report/` (ZIP + optional GitHub Pages path from the workflow)
- Traces / screenshots / video: `e2e/test-results/`

## Test pattern

- `login(page)` in `e2e/helpers/auth.ts` runs `setupApiMocks(page)` then signs in via UI.
- Prefer role / text / placeholder locators (i18n-friendly regex when needed).

### New mock route

Extend `e2e/mocks/api-mocks.ts` (and add fixtures under `e2e/mocks/responses/` if needed):

```ts
await page.route("**/api/v1/goals**", (route) =>
  fulfillJson(route, { data: { goals: [] } })
);
```

### New test

```ts
import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("dashboard shows key sections", async ({ page }) => {
  await expect(page.getByText(/spending this month|gastos este mes/i).first()).toBeVisible();
});
```
