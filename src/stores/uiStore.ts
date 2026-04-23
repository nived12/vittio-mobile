import { create } from 'zustand';
import i18n from '../i18n';
import { tokenStorage } from '../utils/tokenStorage';

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
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set) => ({
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
}));
