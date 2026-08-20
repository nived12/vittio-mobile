# Vittio Mobile

React Native + Expo app for Vittio, a personal finance app for Mexico. Talks to the Rails API
in [`bank_statements_app`](../bank_statements_app), a sibling repo — see that repo for the API
itself.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 (React Native 0.81) |
| Router | Expo Router v6 (file-based) |
| State | Zustand v5 |
| HTTP | Axios + React Query v5 |
| Auth storage | expo-secure-store (Keychain / Keystore) |
| i18n | i18next + react-i18next — `es` (primary) and `en` |
| TypeScript | Strict mode |

## Setup

Requires Node >=22.

```bash
nvm use 22
npm install
cp .env.local.example .env.local   # point EXPO_PUBLIC_API_URL at your API
npx expo start --clear
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with Expo Go.

**`.env.local`** — `EXPO_PUBLIC_API_URL` per target:
- iOS Simulator → `http://localhost:3000/api/v1`
- Android Emulator → `http://10.0.2.2:3000/api/v1`
- Physical device → your Mac's LAN IP, same Wi-Fi as the phone
- Production → `https://app.vitt.io/api/v1`

## Project structure

```
app/                    ← Expo Router file-based routing
  (auth)/                 Login, signup, password reset
  (app)/                   Authenticated tabs: dashboard, transactions, accounts, finances, ...
src/
  api/                   Axios client + one module per resource
  stores/                Zustand stores (auth, ui)
  theme/                  Design tokens — colors, spacing, typography
  i18n/                  en.json / es.json — keep both in sync
  components/
  hooks/
```

## Scripts

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run e2e:build       # Expo web export for Playwright (see below)
npm run e2e             # Playwright against that build
```

### E2E

The suite runs against a static Expo-web export, not the dev server, and mocks `/api/v1/**`.

```bash
EXPO_PUBLIC_E2E=1 npx expo export --platform web --clear   # must set the flag AND --clear
npm run e2e
```

Skipping `--clear` can serve a stale Metro-cached bundle that silently fails every spec at login.

## Conventions

- `@/*` path alias → `src/*`
- Theme tokens from `src/theme` — never hardcode colors or spacing
- All money via `formatCurrency()` in `src/utils/format.ts` (MXN, `Intl.NumberFormat('es-MX', ...)`)
- Positive amounts emerald, negative rose — always
- Every list screen needs a loading skeleton, empty state, error+retry, and populated state
- Minimum tap target 44×44pt

## Shipping a JS/copy fix

Most fixes ship as an EAS Update — no build, no store review:

```bash
node scripts/publish-update.mjs production --message "what changed"
```

New native modules, permissions, or an SDK bump need a real `eas build` instead. See the script's
own header comment for the env-drift guard it runs before publishing.
