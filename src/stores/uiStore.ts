import { create } from 'zustand';

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
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  // ── Locale ─────────────────────────────────────────────────────────────────
  locale: 'en',
  setLocale: (locale) => set({ locale }),

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
}));
