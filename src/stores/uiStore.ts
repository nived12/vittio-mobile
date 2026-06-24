import { create } from 'zustand';
import i18n from '../i18n';
import { tokenStorage } from '../utils/tokenStorage';
import { fetchNotificationPrefs, updateNotificationPref } from '../api/settings';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface UIState {
  // Color scheme preference
  colorScheme: 'system' | 'light' | 'dark';
  setColorScheme: (scheme: 'system' | 'light' | 'dark') => void;
  hydrateColorScheme: () => Promise<void>;

  // Confetti guards
  celebratedGoals: string[];
  celebratedDebts: string[];
  hasSeenFirstImportCelebration: boolean;
  addCelebratedGoal: (id: string) => void;
  addCelebratedDebt: (id: string) => void;
  markFirstImportCelebrated: () => void;
  hydrateCelebrationState: () => Promise<void>;

  // Locale
  locale: 'en' | 'es';
  setLocale: (locale: 'en' | 'es') => void;
  hydrateLocale: () => Promise<void>;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant, action?: Toast['action']) => void;
  dismissToast: (id: string) => void;

  // Email confirmation banner (per-session dismiss)
  hideConfirmationBanner: boolean;
  setHideConfirmationBanner: (hide: boolean) => void;

  // Pending deep link after login
  pendingDeepLink: string | null;
  setPendingDeepLink: (route: string) => void;
  clearPendingDeepLink: () => void;

  // Selected month for dashboard (persists across tab switches)
  selectedMonth: string | undefined;
  setSelectedMonth: (month: string | undefined) => void;

  // Statement upload modal trigger (opened from profile or account detail)
  showStatementUpload: boolean;
  openStatementUpload: () => void;
  closeStatementUpload: () => void;

  // Biometric lock setting
  biometricLock: boolean;
  setBiometricLock: (enabled: boolean) => Promise<void>;
  hydrateBiometricLock: () => Promise<void>;

  // Notification preferences (synced to server)
  notificationPrefs: {
    statementImports: boolean;
    goalMilestones: boolean;
    debtReminders: boolean;
  };
  setNotificationPref: (key: 'statementImports' | 'goalMilestones' | 'debtReminders', value: boolean) => void;
  hydrateNotificationPrefs: () => Promise<void>;

  /** Resets account-specific UI state on logout. Device prefs (colorScheme,
   *  locale, biometricLock) are intentionally preserved. */
  resetForLogout: () => Promise<void>;
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  // ── Color scheme ────────────────────────────────────────────────────────────
  colorScheme: 'system',
  setColorScheme: (scheme) => {
    set({ colorScheme: scheme });
    void tokenStorage.saveColorScheme(scheme);
  },
  hydrateColorScheme: async () => {
    try {
      const stored = await tokenStorage.getColorScheme();
      set({ colorScheme: stored });
    } catch {
      set({ colorScheme: 'system' });
    }
  },

  // ── Confetti guards ─────────────────────────────────────────────────────────
  celebratedGoals: [],
  celebratedDebts: [],
  hasSeenFirstImportCelebration: false,
  addCelebratedGoal: (id) => {
    const next = [...get().celebratedGoals, id];
    set({ celebratedGoals: next });
    void tokenStorage.saveCelebratedGoals(next);
  },
  addCelebratedDebt: (id) => {
    const next = [...get().celebratedDebts, id];
    set({ celebratedDebts: next });
    void tokenStorage.saveCelebratedDebts(next);
  },
  markFirstImportCelebrated: () => {
    set({ hasSeenFirstImportCelebration: true });
    void tokenStorage.saveFirstImportCelebrated(true);
  },
  hydrateCelebrationState: async () => {
    try {
      const [goals, debts, firstImport] = await Promise.all([
        tokenStorage.getCelebratedGoals(),
        tokenStorage.getCelebratedDebts(),
        tokenStorage.getFirstImportCelebrated(),
      ]);
      set({ celebratedGoals: goals, celebratedDebts: debts, hasSeenFirstImportCelebration: firstImport });
    } catch {
      // keep defaults
    }
  },

  // ── Locale ─────────────────────────────────────────────────────────────────
  locale: 'es',
  setLocale: (locale) => {
    set({ locale });
    void tokenStorage.saveLocale(locale);
    void i18n.changeLanguage(locale);
  },
  hydrateLocale: async () => {
    try {
      const stored = await tokenStorage.getLocale();
      const locale = stored ?? 'es';
      set({ locale });
      await i18n.changeLanguage(locale);
    } catch {
      set({ locale: 'es' });
      void i18n.changeLanguage('es');
    }
  },

  // ── Toasts ─────────────────────────────────────────────────────────────────
  toasts: [],

  showToast: (message, variant = 'info', action) => {
    const id = String(++toastIdCounter);
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant, action }],
    }));
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // ── Confirmation banner ────────────────────────────────────────────────────
  hideConfirmationBanner: false,
  setHideConfirmationBanner: (hide) => set({ hideConfirmationBanner: hide }),

  // ── Pending deep link ──────────────────────────────────────────────────────
  pendingDeepLink: null,
  setPendingDeepLink: (route) => set({ pendingDeepLink: route }),
  clearPendingDeepLink: () => set({ pendingDeepLink: null }),

  // ── Selected month ─────────────────────────────────────────────────────────
  selectedMonth: undefined,
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  // ── Statement upload modal ─────────────────────────────────────────────────
  showStatementUpload: false,
  openStatementUpload: () => set({ showStatementUpload: true }),
  closeStatementUpload: () => set({ showStatementUpload: false }),

  // ── Notification preferences ────────────────────────────────────────────────
  notificationPrefs: {
    statementImports: true,
    goalMilestones: true,
    debtReminders: true,
  },
  setNotificationPref: (key, value) => {
    set((state) => ({
      notificationPrefs: { ...state.notificationPrefs, [key]: value },
    }));
    const serverKey = {
      statementImports: 'notify_statement_imports',
      goalMilestones: 'notify_goal_milestones',
      debtReminders: 'notify_debt_reminders',
    }[key] as 'notify_statement_imports' | 'notify_goal_milestones' | 'notify_debt_reminders';
    void updateNotificationPref(serverKey, value).catch(() => {});
  },
  hydrateNotificationPrefs: async () => {
    try {
      const prefs = await fetchNotificationPrefs();
      set({
        notificationPrefs: {
          statementImports: prefs.notify_statement_imports,
          goalMilestones: prefs.notify_goal_milestones,
          debtReminders: prefs.notify_debt_reminders,
        },
      });
    } catch {
      // offline or unauthenticated — keep defaults
    }
  },

  // ── Reset on logout ──────────────────────────────────────────────────────
  resetForLogout: async () => {
    set({
      celebratedGoals: [],
      celebratedDebts: [],
      hasSeenFirstImportCelebration: false,
      toasts: [],
      hideConfirmationBanner: false,
      pendingDeepLink: null,
      selectedMonth: undefined,
      showStatementUpload: false,
      notificationPrefs: {
        statementImports: true,
        goalMilestones: true,
        debtReminders: true,
      },
    });
    await tokenStorage.clearAccountPreferences();
  },

  // ── Biometric lock ─────────────────────────────────────────────────────────
  biometricLock: false,
  setBiometricLock: async (enabled) => {
    set({ biometricLock: enabled });
    await tokenStorage.saveBiometricLock(enabled);
  },
  hydrateBiometricLock: async () => {
    try {
      const stored = await tokenStorage.getBiometricLock();
      set({ biometricLock: stored });
    } catch {
      set({ biometricLock: false });
    }
  },
}));
