export const colors = {

  // ─────────────────────────────────────────
  // Brand — Indigo (True primary for Vittio)
  // ─────────────────────────────────────────
  brand: {
    primary:      '#4f46e5', // indigo-600 — CTAs, FAB, active tab, hero card bg
    primaryHover: '#4338ca', // indigo-700 — pressed state on buttons
    primaryLight: '#e0e7ff', // indigo-100 — subtle backgrounds behind primary elements
    primaryMid:   '#6366f1', // indigo-500 — lighter accents, focus rings on dark bg
    primaryDark:  '#3730a3', // indigo-800 — deep press / high-contrast contexts
  },

  // ─────────────────────────────────────────
  // Semantic — Financial amounts
  // ─────────────────────────────────────────
  income:   '#059669', // emerald-600 — income amounts, positive values, success states
  expense:  '#e11d48', // rose-600    — expense amounts, negative values, error states
  transfer: '#7c3aed', // violet-600  — transfer transactions
  warning:  '#d97706', // amber-600   — warnings, trial notices, pending states

  // ─────────────────────────────────────────
  // Semantic — Status / Feedback
  // ─────────────────────────────────────────
  success: {
    bg:   '#d1fae5', // emerald-100
    text: '#065f46', // emerald-900 — high contrast on success bg
    icon: '#059669', // emerald-600
  },
  error: {
    bg:     '#fee2e2', // red-100
    text:   '#991b1b', // red-800
    icon:   '#ef4444', // red-500
    border: '#fca5a5', // red-300
  },
  warningStatus: {
    bg:     '#fef3c7', // amber-100
    text:   '#92400e', // amber-800
    icon:   '#d97706', // amber-600
    border: '#fde68a', // amber-200
  },
  info: {
    bg:   '#dbeafe', // blue-100
    text: '#1e40af', // blue-800
    icon: '#3b82f6', // blue-500
  },

  // ─────────────────────────────────────────
  // Account Type Colors
  // ─────────────────────────────────────────
  account: {
    debit: {
      bg:   '#dbeafe', // blue-100
      text: '#1e40af', // blue-800
      icon: '#0ea5e9', // sky-500 — account avatar icon color
    },
    credit: {
      bg:   '#ede9fe', // violet-100
      text: '#5b21b6', // violet-800
      icon: '#8b5cf6', // violet-500
    },
    cash: {
      bg:   '#d1fae5', // emerald-100
      text: '#065f46', // emerald-900
      icon: '#10b981', // emerald-500
    },
  },

  // ─────────────────────────────────────────
  // Neutral — Slate family (standardized)
  // ─────────────────────────────────────────
  neutral: {
    50:  '#f8fafc', // slate-50  — screen backgrounds
    100: '#f1f5f9', // slate-100 — input resting bg, secondary surface
    200: '#e2e8f0', // slate-200 — borders, dividers, disabled button bg
    300: '#cbd5e1', // slate-300 — subtle dividers, skeleton shimmer
    400: '#94a3b8', // slate-400 — placeholder text, inactive icons/tabs
    500: '#64748b', // slate-500 — secondary text (lighter)
    600: '#475569', // slate-600 — secondary text, labels
    700: '#334155', // slate-700 — subheadings
    800: '#1e293b', // slate-800 — dark surface (dark mode surface)
    900: '#0f172a', // slate-900 — primary text, headings
  },

  // ─────────────────────────────────────────
  // Backgrounds
  // ─────────────────────────────────────────
  bg: {
    screen:   '#f8fafc', // slate-50 — all screen backgrounds
    card:     '#ffffff', // white    — cards, sheets, modals
    surface2: '#f1f5f9', // slate-100 — input resting, secondary surfaces
    overlay:  'rgba(15, 23, 42, 0.4)', // modal backdrop
  },

  // ─────────────────────────────────────────
  // Text
  // ─────────────────────────────────────────
  text: {
    primary:   '#0f172a', // slate-900 — headings, main body text
    secondary: '#475569', // slate-600 — labels, captions, descriptions
    muted:     '#94a3b8', // slate-400 — placeholders, disabled, timestamps
    inverse:   '#ffffff', // white     — text on dark/colored backgrounds
    link:      '#4f46e5', // indigo-600 — links, interactive text
    income:    '#059669', // emerald-600 — income amounts
    expense:   '#e11d48', // rose-600    — expense amounts
    transfer:  '#7c3aed', // violet-600  — transfer amounts
  },

  // ─────────────────────────────────────────
  // Borders
  // ─────────────────────────────────────────
  border: {
    default:   '#e2e8f0', // slate-200 — card borders, dividers (resting)
    subtle:    '#f1f5f9', // slate-100 — very light dividers
    focus:     '#c7d2fe', // indigo-200 — focused input borders
    focusDark: '#6366f1', // indigo-500 — focus ring on dark backgrounds
    error:     '#fca5a5', // red-300    — error state borders
  },

  // ─────────────────────────────────────────
  // Hero / Gradients
  // ─────────────────────────────────────────
  gradient: {
    balanceHero: ['#3b82f6', '#4f46e5'] as const, // blue-500 → indigo-600 (balance card)
    accountIcon: ['#38bdf8', '#4f46e5'] as const, // sky-400 → indigo-600 (account avatars)
  },

  // ─────────────────────────────────────────
  // Specific Component Colors
  // ─────────────────────────────────────────
  tabBar: {
    background: '#ffffff',
    borderTop:  '#e2e8f0',
    active:     '#4f46e5', // indigo-600
    inactive:   '#94a3b8', // slate-400
  },
  fab: {
    background: '#4f46e5', // indigo-600
    icon:       '#ffffff',
    shadow:     '#4f46e5', // colored shadow for depth
  },

} as const;
