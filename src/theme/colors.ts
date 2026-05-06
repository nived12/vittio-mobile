// Flat theme tokens — every component accesses theme via these keys.
// Both light and dark palettes must satisfy this interface so TypeScript
// can type the context without union-collapse casts.
export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceOverlay: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  borderFocused: string;
  primary: string;
  primaryLight: string;
  positive: string;
  negative: string;
  warning: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  skeletonBase: string;
  skeletonHighlight: string;
  balanceGradientStart: string;
  balanceGradientEnd: string;
  fabGradientStart: string;
  fabGradientEnd: string;
  income: string;
  expense: string;
  transfer: string;
}

export const colors = {

  // ── Flat theme tokens (light) ──────────────────────────────────────────
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  surfaceOverlay: 'rgba(15, 23, 42, 0.4)',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textDisabled: '#94a3b8',
  border: '#e2e8f0',
  borderFocused: '#c7d2fe',
  primary: '#4f46e5',
  primaryLight: '#e0e7ff',
  positive: '#059669',
  negative: '#e11d48',
  warning: '#d97706',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  tabBarActive: '#4f46e5',
  tabBarInactive: '#94a3b8',
  skeletonBase: '#e2e8f0',
  skeletonHighlight: '#f1f5f9',
  balanceGradientStart: '#3b82f6',
  balanceGradientEnd: '#4f46e5',
  fabGradientStart: '#4f46e5',
  fabGradientEnd: '#4f46e5',
  income: '#059669',
  expense: '#e11d48',
  transfer: '#7c3aed',

  // ── Nested convenience accessors (kept for existing internal usage) ───
  brand: {
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryLight: '#e0e7ff',
    primaryMid: '#6366f1',
    primaryDark: '#3730a3',
  },
  success: {
    bg: '#d1fae5',
    text: '#065f46',
    icon: '#059669',
  },
  error: {
    bg: '#fee2e2',
    text: '#991b1b',
    icon: '#ef4444',
    border: '#fca5a5',
  },
  warningStatus: {
    bg: '#fef3c7',
    text: '#92400e',
    icon: '#d97706',
    border: '#fde68a',
  },
  info: {
    bg: '#dbeafe',
    text: '#1e40af',
    icon: '#3b82f6',
  },
  account: {
    debit: {
      bg: '#dbeafe',
      text: '#1e40af',
      icon: '#0ea5e9',
    },
    credit: {
      bg: '#ede9fe',
      text: '#5b21b6',
      icon: '#8b5cf6',
    },
    cash: {
      bg: '#d1fae5',
      text: '#065f46',
      icon: '#10b981',
    },
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  bg: {
    screen: '#f8fafc',
    card: '#ffffff',
    surface2: '#f1f5f9',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
    link: '#4f46e5',
    income: '#059669',
    expense: '#e11d48',
    transfer: '#7c3aed',
  },
  borderNested: {
    default: '#e2e8f0',
    subtle: '#f1f5f9',
    focus: '#c7d2fe',
    focusDark: '#6366f1',
    error: '#fca5a5',
  },
  gradient: {
    balanceHero: ['#3b82f6', '#4f46e5'] as const,
    accountIcon: ['#38bdf8', '#4f46e5'] as const,
  },
  tabBar: {
    background: '#ffffff',
    borderTop: '#e2e8f0',
    active: '#4f46e5',
    inactive: '#94a3b8',
  },
  fab: {
    background: '#4f46e5',
    icon: '#ffffff',
    shadow: '#4f46e5',
  },

} as const;

// ─────────────────────────────────────────
// Dark Mode Semantic Tokens
// ─────────────────────────────────────────
export const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#334155',
  surfaceOverlay: 'rgba(255,255,255,0.06)',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textDisabled: '#475569',
  border: 'rgba(255,255,255,0.1)',
  borderFocused: '#6366f1',
  primary: '#6366f1',
  primaryLight: 'rgba(99,102,241,0.15)',
  positive: '#10b981',
  negative: '#e11d48',
  warning: '#fbbf24',
  tabBarBg: '#1e293b',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  tabBarActive: '#6366f1',
  tabBarInactive: '#64748b',
  skeletonBase: '#334155',
  skeletonHighlight: '#475569',
  balanceGradientStart: '#1e3a5f',
  balanceGradientEnd: '#1e293b',
  fabGradientStart: '#6366f1',
  fabGradientEnd: '#4f46e5',
  income: '#10b981',
  expense: '#e11d48',
  transfer: '#7c3aed',
} as const satisfies ThemeTokens;
