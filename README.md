# Vittio Mobile — React Native + Expo SDK 52

A personal finance mobile app built with React Native and Expo. Part of the larger Vittio ecosystem (Rails 8 API + web app).

## Quick Start

### Prerequisites
- **Node**: >=22 (`nvm use 22`)
- **Expo CLI**: Latest
- **iOS Simulator** or **Android Emulator** (or physical device)

### Installation & Run

```bash
cd vittio-mobile
npm install
npx expo start --clear
```

Press `i` for iOS Simulator or `a` for Android Emulator.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native + Expo | SDK 52 |
| Router | Expo Router | v4 (file-based) |
| State Management | Zustand | v5 |
| HTTP Client | Axios + React Query | v5 |
| Auth Storage | expo-secure-store | (Keychain/Keystore) |
| Internationalization | i18next | + react-i18next |
| UI Icons | Ionicons (tabs), Lucide React Native (elsewhere) | — |
| TypeScript | Strict mode | — |

## Project Structure

```
app/                              ← Expo Router file-based routing
  _layout.tsx                     ← Root layout (auth guard, splash, fonts)
  (auth)/                         ← Login, Signup, ForgotPassword, ConfirmEmail
  (app)/                          ← Authenticated tab navigator
    _layout.tsx                   ← Tab bar (5 tabs + FAB)
    index.tsx                     ← Dashboard
    transactions/
      _layout.tsx                 ← Stack navigator
      index.tsx                   ← Transaction list
      [id].tsx                    ← Transaction detail
    accounts/
      _layout.tsx                 ← Stack navigator
      index.tsx                   ← Account list
      [id].tsx                    ← Account detail
    profile.tsx                   ← More/Profile screen

src/
  api/
    client.ts                     ← Axios instance + refresh token interceptor
  stores/
    authStore.ts                  ← Auth state (tokens, user, hydrate)
  theme/
    colors.ts                     ← Color palette
    spacing.ts                    ← Spacing scale
    typography.ts                ← Font sizes, weights, families
  i18n/
    en.json                       ← English translations
    es.json                       ← Spanish (es-MX) translations
  utils/
    formatCurrency.ts            ← MXN currency formatter
    ...                          ← Other helpers

app.json                          ← Expo configuration
package.json                      ← Dependencies
tsconfig.json                     ← TypeScript config (strict mode)
```

## Design System

### Colors
| Role | Hex | Tailwind |
|------|-----|----------|
| Primary | `#4f46e5` | indigo-600 |
| Income/Positive | `#10b981` | emerald-500 |
| Expense/Negative | `#e11d48` | rose-600 |
| Background | `#f8fafc` | slate-50 |
| Card Background | `#ffffff` | white |
| Text Primary | Auto | Based on light/dark |

### Typography
- **Font Family**: Inter (300–700 weights)
- **Sizes**: Defined in `src/theme/typography.ts`
- **Line Heights**: Consistent across screens

### Icons
- **Tab bar**: Ionicons
- **Everywhere else**: Lucide React Native

## Authentication & API Integration

### Auth Flow
1. User logs in via `/api/v1/auth/login` (username/password)
2. Server returns access token (15 min) + refresh token (7 days)
3. Tokens stored securely in `expo-secure-store` (iOS Keychain / Android Keystore)
4. Axios interceptor auto-refreshes access token before expiry
5. JTI revocation on logout

### API Client
```typescript
// src/api/client.ts
import axios from 'axios';
const client = axios.create({
  baseURL: 'https://api.vittio.dev/api/v1', // or localhost in dev
});
// Interceptor handles token refresh automatically
```

### Using the API
```typescript
import { useAuthStore } from '@/stores/authStore';
import client from '@/api/client';

const { accessToken } = useAuthStore();
const response = await client.get('/transactions', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

**Note**: The Axios interceptor should handle token injection — no need to manually add headers in most cases.

## Localization

The app supports **Spanish (es-MX)** and **English (en)**.

### Translation Files
- `src/i18n/en.json` — English
- `src/i18n/es.json` — Spanish

### Usage
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  return <Text>{t('common.welcome')}</Text>;
}
```

**Always keep both en.json and es.json in sync.**

## Currency Formatting

All monetary values must use `formatCurrency()` utility:

```typescript
import { formatCurrency } from '@/utils/formatCurrency';

const amount = formatCurrency(1500); // "MXN 1,500.00"
```

- **Currency**: MXN (Mexican Peso)
- **Locale**: es-MX by default, falls back to en
- **Never hardcode** currency symbols or number formats

## Development Guidelines

### TypeScript
- Strict mode is enabled (`tsconfig.json`)
- Run `tsc --noEmit` to type-check the entire project
- CI/CD will fail on type errors

### Code Style
- **Quotes**: Double quotes
- **Path alias**: `@/*` maps to `src/*`
- **Naming**: camelCase for functions/variables, PascalCase for components

### UI Components & Lists
Every list screen must include:
- ✅ Loading skeleton while data fetches
- ✅ Empty state (no data message)
- ✅ Error state + retry button
- ✅ Populated state (normal list)

### Minimum Tap Target
- All touchable elements: **44pt x 44pt** (Apple/Android standard)

### Theme Tokens
- **Never hardcode** colors, spacing, or font sizes
- Always import from `src/theme/*`
- Use Tailwind reference values when possible

## Scripts

```bash
# Development
npx expo start --clear        # Start dev server

# Type checking
tsc --noEmit                  # Verify no type errors

# iOS-specific
npx expo prebuild --platform ios  # Generate iOS native code

# Android-specific
npx expo prebuild --platform android  # Generate Android native code

# Build for production
eas build --platform ios      # Requires EAS account
eas build --platform android  # Requires EAS account
```

## Current Status

**Phases Completed**: 0–6 (Auth, Dashboard, Transactions, Accounts, Write Flows, Logos)

**Next Phase**: Phase 7 (Savings, Debts, Goals)

See `docs/status/PHASE_STATUS.md` in the root Vittio project for current task checklist and known bugs.

## Metrics

- **TypeScript**: Clean (`tsc --noEmit` = 0 errors)
- **Bundle Size**: 7.29 MB (iOS HBC)
- **Test Coverage**: See `docs/decisions/TEST_PLAN.md`

## Connecting to the API

### Development
For local API development, set the API base in `src/api/client.ts`:
```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
```

**Expo environment variables** go in `.env.local` (not committed):
```
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000/api/v1
```

### Production
The API endpoint is configured via Expo secrets or EAS environment variables.

## Troubleshooting

### Simulator not starting?
```bash
npx expo start --clear        # Clear cache and restart
```

### Type errors after npm install?
```bash
tsc --noEmit                  # See full list of errors
npm run type-check            # If this script exists
```

### Auth token issues?
- Verify `expo-secure-store` is installed
- Check that the Axios interceptor in `src/api/client.ts` is working
- See `src/stores/authStore.ts` for hydration logic

### Build errors?
Clear Expo cache:
```bash
npx expo start --clear
rm -rf .expo
```

## Resources

- **Expo Docs**: https://docs.expo.dev
- **Expo Router**: https://expo.github.io/router/
- **React Native Docs**: https://reactnative.dev
- **Zustand**: https://github.com/pmndrs/zustand
- **React Query**: https://tanstack.com/query/latest
- **i18next**: https://www.i18next.com

## Communication & Contributing

All decisions, questions, and bugs are logged in:
- `docs/decisions/DECISIONS_LOG.md` — Agent decisions and blockers
- `docs/status/PHASE_STATUS.md` — Current phase checklist and open issues

See the root CLAUDE.md for the full agent team structure.

---

**Built with ❤️ as part of Vittio.**
