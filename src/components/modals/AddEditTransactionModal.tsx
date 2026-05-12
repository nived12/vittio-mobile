import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Springs } from '../../theme/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
// @react-native-voice/voice requires a native module not included in Expo Go.
// The JS module loads fine in Expo Go (require doesn't throw), but NativeModules.Voice
// is undefined, meaning every method call would fail. Check the native backing first.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Voice: any = null;
type SpeechResultsEvent = { value?: string[] };
type SpeechErrorEvent = { error?: { message?: string } };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NativeModules } = require('react-native');
  if (NativeModules.Voice || NativeModules.RNVoice) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Voice = require('@react-native-voice/voice').default;
  }
} catch {
  Voice = null;
}
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import {
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { resolveBankAccountName } from '../../utils/displayNames';
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/useTransactions';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useMerchantRule, useCreateMerchantRule } from '../../hooks/useMerchantRules';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';
import { parseVoice, parseImage } from '../../api/transactions';
import type { Transaction, TransactionType, CreateTransactionBody, AiParseResult } from '../../api/transactions';
import type { BankAccount } from '../../api/bankAccounts';
import type { Category } from '../../api/categories';

// ── Types ──────────────────────────────────────────────────────────────────

type TopLevelType = 'income' | 'expense' | 'transfer';
type SubType = TransactionType;

interface PrefillData {
  amount?: number;
  description?: string;
  merchant?: string;
  transaction_type?: TransactionType;
  category_id?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** If provided, modal opens in Edit mode pre-filled with this transaction */
  transaction?: Transaction;
  /** Pre-fill fields from AI suggestion (add mode only) */
  prefill?: PrefillData;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toTopLevel(type: TransactionType): TopLevelType {
  if (type === 'income') return 'income';
  if (type === 'transfer_in' || type === 'transfer_out') return 'transfer';
  return 'expense';
}

function defaultSubType(top: TopLevelType): SubType {
  if (top === 'income') return 'income';
  if (top === 'transfer') return 'transfer_out';
  return 'variable_expense';
}

function amountToApi(amount: number, subType: SubType): number {
  // Income and transfer_in are positive; expenses and transfer_out are negative
  const positive: SubType[] = ['income', 'transfer_in'];
  return positive.includes(subType) ? Math.abs(amount) : -Math.abs(amount);
}

// ── Account Picker Sheet ───────────────────────────────────────────────────

interface AccountPickerProps {
  visible: boolean;
  accounts: BankAccount[];
  selectedId: number | null;
  locale: string;
  title?: string;
  onSelect: (account: BankAccount) => void;
  onClose: () => void;
}

function AccountPickerSheet({ visible, accounts, selectedId, locale, title, onSelect, onClose }: AccountPickerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const typeLabel = (type: BankAccount['account_type']) => {
    if (type === 'debit') return t('accounts.types.debit');
    if (type === 'credit') return t('accounts.types.credit');
    return t('accounts.types.cash');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, styles.accountSheet, { paddingBottom: insets.bottom + 16, backgroundColor: surface }]}>
          <View style={[styles.handle, { backgroundColor: borderCol }]} />
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>{title ?? t('transactions.select_account_title')}</Text>

          <FlatList
            data={accounts}
            keyExtractor={(a) => String(a.id)}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              const fmtBal = new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
                style: 'currency', currency: item.currency,
              }).format(item.balance);

              return (
                <TouchableOpacity
                  style={[styles.accountPickerRow, { borderBottomColor: dividerCol }, selected && styles.accountPickerRowSelected, selected && { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : '#f5f3ff' }]}
                  onPress={() => { onSelect(item); onClose(); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.radioCircle, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }, selected && styles.radioCircleSelected]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountPickerName, { color: textPrimary }, selected && { color: '#4f46e5' }]}>
                      {resolveBankAccountName(item, t)}
                    </Text>
                    <Text style={[styles.accountPickerMeta, { color: textSecondary }]}>{typeLabel(item.account_type)} · {fmtBal}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t('transactions.no_account_warning')}</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Category Picker Sheet ─────────────────────────────────────────────────

interface CategoryPickerProps {
  visible: boolean;
  categories: Category[];
  selectedId: number | null;
  onSelect: (cat: Category | null) => void;
  onClose: () => void;
}

function CategoryPickerSheet({ visible, categories, selectedId, onSelect, onClose }: CategoryPickerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  // Flatten tree: parents first, children indented
  const flat = useMemo(() => {
    const rows: Array<{ cat: Category; depth: number }> = [];
    for (const parent of categories) {
      rows.push({ cat: parent, depth: 0 });
      for (const child of parent.children ?? []) {
        rows.push({ cat: child, depth: 1 });
      }
    }
    return rows;
  }, [categories]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, styles.categorySheet, { paddingBottom: insets.bottom + 16, backgroundColor: surface }]}>
          <View style={[styles.handle, { backgroundColor: borderCol }]} />
          <Text style={[styles.sheetTitle, { color: textPrimary }]}>{t('transactions.category_label')}</Text>

          <TouchableOpacity
            style={[styles.categoryRow, { borderBottomColor: dividerCol }]}
            onPress={() => { onSelect(null); onClose(); }}
          >
            <Text style={[styles.categoryRowText, { color: textPrimary }]}>{t('transactionDetail.fields.uncategorized')}</Text>
            {selectedId === null && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <FlatList
            data={flat}
            keyExtractor={(item) => String(item.cat.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryRow, { paddingLeft: 16 + item.depth * 20, borderBottomColor: dividerCol }]}
                onPress={() => { onSelect(item.cat); onClose(); }}
              >
                <Text style={[styles.categoryRowText, { color: textPrimary }]}>{item.cat.name}</Text>
                {selectedId === item.cat.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function AddEditTransactionModal({ visible, onClose, transaction, prefill }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { locale, showToast } = useUIStore();
  const isEditMode = Boolean(transaction);

  // ── Dark mode ──
  const { theme, isDark } = useTheme();
  const sheetBg = isDark ? theme.surface : '#ffffff';
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  // ── Queries ──
  const { data: accounts = [] } = useBankAccounts();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

  // ── Mutations ──
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transaction?.id ?? 0);
  const createRuleMutation = useCreateMerchantRule();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Form state ──
  const [amountStr, setAmountStr] = useState('');
  const [topType, setTopType] = useState<TopLevelType>('expense');
  const [subType, setSubType] = useState<SubType>('variable_expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [concept, setConcept] = useState('');
  const [merchant, setMerchant] = useState('');
  const [reference, setReference] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [transferToAccount, setTransferToAccount] = useState<BankAccount | null>(null);
  const [showTransferToPicker, setShowTransferToPicker] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  // ── Spring animation (modal sheet entry/exit) ──
  const translateY = useSharedValue(80);
  const animOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, Springs.modal);
      animOpacity.value = withTiming(1, { duration: 150 });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    translateY.value = withSpring(80, Springs.modal, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    animOpacity.value = withTiming(0, { duration: 120 });
  }, [isSaving, onClose]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: animOpacity.value,
  }));

  // ── AI input state ──
  type AiState = 'idle' | 'recording' | 'processing' | 'prefilled';
  const [aiState, setAiState] = useState<AiState>('idle');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [receiptThumbnail, setReceiptThumbnail] = useState<string | null>(null);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const latestTranscriptRef = useRef('');
  const lastParsedTranscriptRef = useRef('');

  // ── Smart categorization — committed merchant name (set on blur) ──
  const [committedMerchant, setCommittedMerchant] = useState('');
  const [ruleApplied, setRuleApplied] = useState(false);

  // Look up merchant rule whenever committedMerchant changes
  const { data: merchantRule } = useMerchantRule(committedMerchant);

  // Auto-fill category from merchant rule (add mode only, and only once per modal open)
  useEffect(() => {
    if (
      !visible ||
      isEditMode ||
      ruleApplied ||
      !merchantRule ||
      selectedCategory !== null
    ) {
      return;
    }
    // Find the category in the loaded list
    const matchCat = categories.find(
      (c) =>
        c.id === merchantRule.category_id ||
        (c.children ?? []).some((ch) => ch.id === merchantRule.category_id),
    );
    if (matchCat) {
      const isChild = matchCat.id !== merchantRule.category_id;
      const cat = isChild
        ? (matchCat.children ?? []).find((ch) => ch.id === merchantRule.category_id) ?? matchCat
        : matchCat;
      setSelectedCategory(cat);
      setRuleApplied(true);
    }
  }, [merchantRule, visible, isEditMode, ruleApplied, selectedCategory, categories]);

  // ── Pre-fill for edit mode ──
  useEffect(() => {
    if (!visible) return;
    if (transaction) {
      const abs = Math.abs(transaction.amount);
      setAmountStr(abs.toFixed(2));
      const top = toTopLevel(transaction.transaction_type);
      setTopType(top);
      setSubType(transaction.transaction_type);
      setDescription(transaction.description);
      setDate(parseISO(transaction.date));
      const acct = accounts.find((a) => a.id === transaction.bank_account.id) ?? null;
      setSelectedAccount(acct);
      setSelectedCategory(transaction.category ? (categories.find(
        (c) => c.id === transaction.category!.id ||
          (c.children ?? []).some((ch) => ch.id === transaction.category!.id)
      ) ?? null) : null);
      setConcept(transaction.concept ?? '');
      setMerchant(transaction.merchant ?? '');
      setReference(transaction.reference ?? '');
      // Pre-fill destination account for transfer edits
      if (transaction.is_transfer && transaction.transfer_account?.id) {
        const destAcct = accounts.find((a) => a.id === transaction.transfer_account!.id) ?? null;
        setTransferToAccount(destAcct);
      } else {
        setTransferToAccount(null);
      }
    } else {
      // Reset for add mode
      setAmountStr(prefill?.amount != null ? Math.abs(prefill.amount).toFixed(2) : '');
      const initialType = prefill?.transaction_type
        ? toTopLevel(prefill.transaction_type)
        : 'expense';
      setTopType(initialType);
      setSubType(prefill?.transaction_type ?? 'variable_expense');
      setDescription(prefill?.description ?? '');
      setDate(new Date());
      setSelectedAccount(accounts[0] ?? null);
      setSelectedCategory(null);
      setConcept('');
      setMerchant(prefill?.merchant ?? '');
      setReference('');
      setTransferToAccount(null);
    }
    setHasAttemptedSave(false);
    setCommittedMerchant('');
    setRuleApplied(false);
    setAiState('idle');
    setMicPermissionDenied(false);
    setReceiptThumbnail(null);
    setShowReceiptReview(false);
  }, [visible, transaction]);

  // Pre-select first account when accounts load (add mode)
  useEffect(() => {
    if (!isEditMode && accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts]);

  // Apply prefill category once categories load
  useEffect(() => {
    if (!visible || isEditMode || !prefill?.category_id || categories.length === 0 || selectedCategory !== null) return;
    const match = categories.find(
      (c) =>
        c.id === prefill.category_id ||
        (c.children ?? []).some((ch) => ch.id === prefill.category_id),
    );
    if (match) {
      const child = (match.children ?? []).find((ch) => ch.id === prefill.category_id);
      setSelectedCategory(child ?? match);
    }
  }, [visible, isEditMode, prefill?.category_id, categories, selectedCategory]);

  // ── Type switching ──
  const handleTopTypeChange = (t: TopLevelType) => {
    Haptics.selectionAsync();
    setTopType(t);
    setSubType(defaultSubType(t));
    if (t !== 'transfer') setTransferToAccount(null);
  };

  // ── AI helpers ──
  const applyAiResult = useCallback((result: AiParseResult) => {
    setAmountStr(Math.abs(result.amount).toFixed(2));
    if (result.description) setDescription(result.description);
    if (result.transaction_type) {
      const tt = result.transaction_type as TransactionType;
      const top = toTopLevel(tt);
      setTopType(top);
      setSubType(tt);
    }
    if (result.date) {
      try { setDate(parseISO(result.date)); } catch { /* keep today */ }
    }
    if (result.category_suggestion) {
      const match = categories.find(
        (c) =>
          c.id === result.category_suggestion!.id ||
          (c.children ?? []).some((ch) => ch.id === result.category_suggestion!.id),
      );
      if (match) {
        const child = (match.children ?? []).find((ch) => ch.id === result.category_suggestion!.id);
        setSelectedCategory(child ?? match);
      }
    }
  }, [categories]);

  const parseVoiceTranscript = useCallback(async (transcript: string) => {
    const text = transcript.trim();
    if (!text) {
      setAiState('idle');
      return;
    }
    if (text === lastParsedTranscriptRef.current) {
      setAiState('idle');
      return;
    }

    try {
      const result = await parseVoice(text);
      applyAiResult(result);
      lastParsedTranscriptRef.current = text;
      setAiState('prefilled');
      setTimeout(() => setAiState('idle'), 2000);
    } catch (error: unknown) {
      const response = (error as { response?: { status?: number; data?: { error?: { retry_after?: number } } } }).response;
      if (response?.status === 429) {
        const retryAfter = response.data?.error?.retry_after;
        showToast(
          retryAfter
            ? `${t('aiInput.voice.rateLimited', { defaultValue: 'Demasiadas solicitudes. Intenta de nuevo pronto.' })} (${retryAfter}s)`
            : t('aiInput.voice.rateLimited', { defaultValue: 'Demasiadas solicitudes. Intenta de nuevo pronto.' }),
          'warning',
        );
      } else {
        showToast(t('aiInput.voice.error'), 'error');
      }
      setAiState('idle');
    }
  }, [applyAiResult, showToast, t]);

  // ── Voice handlers ──
  useEffect(() => {
    if (!Voice) return;
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      latestTranscriptRef.current = (e.value?.[0] ?? '').trim();
    };
    Voice.onSpeechEnd = () => {
      void parseVoiceTranscript(latestTranscriptRef.current);
    };
    Voice.onSpeechError = (_e: SpeechErrorEvent) => {
      showToast(t('aiInput.voice.error'), 'error');
      setAiState('idle');
    };
    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, [parseVoiceTranscript, showToast, t]);

  const handleMicPress = useCallback(async () => {
    if (!Voice) {
      showToast(t('aiInput.voice.requiresDevBuild'), 'warning');
      return;
    }
    if (aiState === 'recording') {
      try {
        await Voice.stop();
        setAiState('processing');
      } catch {
        showToast(t('aiInput.voice.error'), 'error');
        setAiState('idle');
      }
      return;
    }
    try {
      const available = await Voice.isAvailable();
      if (!available) {
        setMicPermissionDenied(true);
        return;
      }
      setMicPermissionDenied(false);
      latestTranscriptRef.current = '';
      lastParsedTranscriptRef.current = '';
      setAiState('recording');
      await Voice.start('es-MX');
    } catch {
      showToast(t('aiInput.voice.error'), 'error');
      setAiState('idle');
    }
  }, [aiState, showToast, t]);

  // ── Camera handler ──
  const handleCameraPress = useCallback(async () => {
    Alert.alert(
      t('aiInput.camera.tap'),
      undefined,
      [
        {
          text: t('aiInput.camera.takePhoto'),
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) { showToast(t('aiInput.camera.permissionDenied'), 'error'); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.9 });
            if (!result.canceled) processImage(result.assets[0].uri);
          },
        },
        {
          text: t('aiInput.camera.chooseFromLibrary'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
            if (!result.canceled) processImage(result.assets[0].uri);
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  }, [showToast, t]);

  const processImage = useCallback(async (uri: string) => {
    setAiState('processing');
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) throw new Error('No base64');
      const result = await parseImage(manipulated.base64, 'image/jpeg');
      applyAiResult(result);
      setReceiptThumbnail(uri);
      setShowReceiptReview(true);
      setAiState('prefilled');
      setTimeout(() => setAiState('idle'), 2000);
    } catch {
      showToast(t('aiInput.camera.error'), 'error');
      setAiState('idle');
    }
  }, [applyAiResult, showToast, t]);

  // ── Amount color ──
  const amountColor = topType === 'income' ? '#10b981' : topType === 'expense' ? '#e11d48' : '#8b5cf6';

  // ── Validation ──
  const amountNum = parseFloat(amountStr) || 0;
  const canSave =
    amountNum > 0 &&
    description.trim().length > 0 &&
    selectedAccount !== null &&
    (topType !== 'transfer' || transferToAccount !== null);

  // ── Date display ──
  const dateLocale = locale === 'es' ? es : enUS;
  const dateDisplay = format(date, "d 'de' MMMM 'de' yyyy", { locale: dateLocale });

  // ── Category display ──
  const categoryDisplay = useMemo(() => {
    if (!selectedCategory) return t('transactionDetail.fields.uncategorized');
    const parent = categories.find(
      (c) => c.id === selectedCategory.id || (c.children ?? []).some((ch) => ch.id === selectedCategory.id)
    );
    if (parent && parent.id !== selectedCategory.id) {
      return `${parent.name} > ${selectedCategory.name}`;
    }
    return selectedCategory.name;
  }, [selectedCategory, categories, t]);

  // ── Save ──
  const handleSave = async () => {
    setHasAttemptedSave(true);
    if (!canSave || !selectedAccount) return;
    Keyboard.dismiss();

    const body: CreateTransactionBody = {
      bank_account_id: selectedAccount.id,
      date: format(date, 'yyyy-MM-dd'),
      description: description.trim(),
      amount: amountToApi(amountNum, subType),
      transaction_type: subType,
      ...(concept.trim() ? { concept: concept.trim() } : {}),
      ...(merchant.trim() ? { merchant: merchant.trim() } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      ...(selectedCategory ? { category_id: selectedCategory.id } : {}),
      ...(topType === 'transfer' && transferToAccount ? { transfer_account_id: transferToAccount.id } : {}),
    };

    try {
      if (isEditMode && transaction) {
        await updateMutation.mutateAsync(body);
        showToast(t('transactions.updated_toast'), 'success');
      } else {
        await createMutation.mutateAsync(body);
        showToast(t('transactions.saved_toast'), 'success');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(t('errors.generic'), 'error');
    }
  };

  // ── Render ──
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isSaving ? undefined : handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={isSaving ? undefined : handleClose}
        />

        <Animated.View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16, backgroundColor: sheetBg }, animatedSheetStyle]}>
          <View style={[styles.handle, { backgroundColor: borderCol }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: dividerCol }]}>
            <TouchableOpacity onPress={handleClose} disabled={isSaving} hitSlop={12}>
              <X size={22} color={textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {isEditMode ? t('transactions.edit_title') : t('transactions.add_title')}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            automaticallyAdjustKeyboardInsets
          >
            {/* Amount */}
            <View style={styles.amountRow}>
              <TouchableOpacity
                onPress={handleMicPress}
                style={styles.aiButton}
                accessibilityLabel={t('aiInput.voice.tap')}
                hitSlop={8}
              >
                {aiState === 'processing' ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <Ionicons
                    name={aiState === 'recording' ? 'mic' : 'mic-outline'}
                    size={28}
                    color={aiState === 'recording' ? '#e11d48' : '#4f46e5'}
                  />
                )}
              </TouchableOpacity>

              <View style={styles.amountInputWrapper}>
                <Text style={[styles.currencyPrefix, { color: textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.amountInput, { color: amountColor }]}
                  value={amountStr}
                  onChangeText={(v) => {
                    const clean = v.replace(/[^0-9.]/g, '');
                    const parts = clean.split('.');
                    setAmountStr(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean);
                  }}
                  onBlur={() => {
                    const n = parseFloat(amountStr);
                    if (!isNaN(n) && n > 0) setAmountStr(n.toFixed(2));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#cbd5e1"
                  accessibilityLabel={t('transactions.amount_label')}
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                onPress={handleCameraPress}
                style={styles.aiButton}
                accessibilityLabel={t('aiInput.camera.tap')}
                hitSlop={8}
              >
                <Ionicons name="camera-outline" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* AI state labels */}
            {aiState === 'recording' && (
              <Text style={styles.aiLabel}>{t('aiInput.voice.recording')}</Text>
            )}
            {aiState === 'processing' && (
              <Text style={styles.aiLabel}>{t('aiInput.voice.processing')}</Text>
            )}
            {aiState === 'prefilled' && (
              <Text style={[styles.aiLabel, { color: '#10b981' }]}>{t('aiInput.voice.prefilled')}</Text>
            )}

            {/* Mic permission denied */}
            {micPermissionDenied && (
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                style={styles.permissionRow}
                accessibilityRole="button"
              >
                <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                <Text style={[styles.permissionText, { color: textSecondary }]}>
                  {t('aiInput.voice.permissionDenied')}
                  {' — '}
                  <Text style={styles.permissionLink}>{t('aiInput.voice.openSettings')}</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* Receipt review */}
            {showReceiptReview && receiptThumbnail && (
              <View style={styles.receiptReview}>
                <Text style={styles.receiptReviewLabel}>{t('aiInput.camera.reviewing')}</Text>
                <View style={styles.receiptReviewActions}>
                  <TouchableOpacity
                    style={styles.receiptConfirmBtn}
                    onPress={() => setShowReceiptReview(false)}
                  >
                    <Text style={styles.receiptConfirmText}>{t('aiInput.camera.confirmReview')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.receiptClearBtn}
                    onPress={() => {
                      setShowReceiptReview(false);
                      setReceiptThumbnail(null);
                      setAmountStr('');
                      setDescription('');
                      setSelectedCategory(null);
                    }}
                  >
                    <Text style={styles.receiptClearText}>{t('aiInput.camera.clearReview')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Type segmented control */}
            <View style={styles.typeControl}>
              {([
                { key: 'income' as TopLevelType, label: t('transactions.type_income'), Icon: TrendingUp, color: '#10b981' },
                { key: 'expense' as TopLevelType, label: t('transactions.type_expense'), Icon: TrendingDown, color: '#e11d48' },
                { key: 'transfer' as TopLevelType, label: t('transactions.type_transfer'), Icon: ArrowLeftRight, color: '#8b5cf6' },
              ] as const).map(({ key, label, Icon, color }) => {
                const active = topType === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeBtn, { backgroundColor: inputBg, borderColor: borderCol }, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => handleTopTypeChange(key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Icon size={14} color={active ? '#fff' : textSecondary} />
                    <Text style={[styles.typeBtnLabel, active && { color: '#fff' }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expense sub-type */}
            {topType === 'expense' && (
              <View style={styles.subTypeRow}>
                {([
                  { value: 'variable_expense' as SubType, label: t('transactions.type_variable_expense') },
                  { value: 'fixed_expense' as SubType, label: t('transactions.type_fixed_expense') },
                ] as const).map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.subTypeBtn, { backgroundColor: inputBg, borderColor: borderCol }, subType === value && styles.subTypeBtnActive, subType === value && { backgroundColor: isDark ? 'rgba(79,70,229,0.12)' : '#eef2ff' }]}
                    onPress={() => { Haptics.selectionAsync(); setSubType(value); }}
                  >
                    <Text style={[styles.subTypeBtnLabel, { color: textSecondary }, subType === value && { color: '#4f46e5' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Transfer sub-type */}
            {topType === 'transfer' && (
              <View style={styles.subTypeRow}>
                {([
                  { value: 'transfer_out' as SubType, label: t('transactions.type_transfer_out') },
                  { value: 'transfer_in' as SubType, label: t('transactions.type_transfer_in') },
                ] as const).map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.subTypeBtn, subType === value && styles.subTypeBtnActive]}
                    onPress={() => { Haptics.selectionAsync(); setSubType(value); }}
                  >
                    <Text style={[styles.subTypeBtnLabel, subType === value && { color: '#4f46e5' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Fields */}
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>DETALLES</Text>

            {/* Description */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.description_label')} *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('transactions.description_placeholder')}
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
                maxLength={255}
              />
            </View>

            {/* Date */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.date_label')} *</Text>
              <TouchableOpacity
                style={[styles.fieldRow, { backgroundColor: inputBg, borderColor: borderCol }]}
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`${t('transactions.date_label')}: ${dateDisplay}`}
              >
                <Text style={[styles.fieldRowText, { color: textPrimary }]}>{dateDisplay}</Text>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_event, selected) => {
                  if (selected) setDate(selected);
                }}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerDoneBtn}
                accessibilityRole="button"
              >
                <Text style={styles.datePickerDoneBtnText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}

            {/* Account */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.account_label')} *</Text>
              <TouchableOpacity
                style={[styles.fieldRow, { backgroundColor: inputBg, borderColor: borderCol }]}
                onPress={() => setShowAccountPicker(true)}
                accessibilityRole="button"
              >
                <Text style={selectedAccount ? [styles.fieldRowText, { color: textPrimary }] : styles.fieldRowPlaceholder}>
                  {selectedAccount ? resolveBankAccountName(selectedAccount, t) : t('transactions.no_account_warning')}
                </Text>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
              {hasAttemptedSave && !selectedAccount && (
                <Text style={styles.fieldError}>{t('transactions.no_account_warning')}</Text>
              )}
            </View>

            {/* Transfer destination account */}
            {topType === 'transfer' && (
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.transfer_to_label')} *</Text>
                <TouchableOpacity
                  style={[styles.fieldRow, { backgroundColor: inputBg, borderColor: borderCol }, hasAttemptedSave && !transferToAccount && styles.fieldRowError]}
                  onPress={() => setShowTransferToPicker(true)}
                  accessibilityRole="button"
                >
                  <Text style={transferToAccount ? [styles.fieldRowText, { color: textPrimary }] : styles.fieldRowPlaceholder}>
                    {transferToAccount
                      ? resolveBankAccountName(transferToAccount, t)
                      : t('transactions.select_transfer_account_title')}
                  </Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
                {hasAttemptedSave && !transferToAccount && (
                  <Text style={styles.fieldError}>{t('transactions.no_account_warning')}</Text>
                )}
              </View>
            )}

            {/* Category */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.category_label')}</Text>
              <TouchableOpacity
                style={[styles.fieldRow, { backgroundColor: inputBg, borderColor: borderCol }]}
                onPress={() => setShowCategoryPicker(true)}
                accessibilityRole="button"
              >
                <Text style={[styles.fieldRowText, { color: textPrimary }]}>{categoryDisplay}</Text>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Optional fields */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.concept_label')}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
                value={concept}
                onChangeText={setConcept}
                placeholder="Más detalles..."
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.merchant_label')}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
                value={merchant}
                onChangeText={setMerchant}
                onBlur={() => {
                  const trimmed = merchant.trim();
                  if (trimmed) setCommittedMerchant(trimmed);
                }}
                placeholder="Walmart, Cinépolis..."
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('transactions.reference_label')}</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
                value={reference}
                onChangeText={setReference}
                placeholder="Folio, número de orden..."
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || isSaving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave || isSaving}
              accessibilityState={{ disabled: !canSave || isSaving }}
            >
              <Text style={styles.saveBtnLabel}>
                {isSaving
                  ? '...'
                  : isEditMode
                    ? t('transactions.save_changes_button')
                    : t('transactions.save_button')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>

      {/* Sub-sheets */}
      <AccountPickerSheet
        visible={showAccountPicker}
        accounts={accounts}
        selectedId={selectedAccount?.id ?? null}
        locale={locale}
        onSelect={setSelectedAccount}
        onClose={() => setShowAccountPicker(false)}
      />

      <AccountPickerSheet
        visible={showTransferToPicker}
        accounts={accounts.filter((a) => a.id !== selectedAccount?.id)}
        selectedId={transferToAccount?.id ?? null}
        locale={locale}
        title={t('transactions.select_transfer_account_title')}
        onSelect={setTransferToAccount}
        onClose={() => setShowTransferToPicker(false)}
      />

      <CategoryPickerSheet
        visible={showCategoryPicker}
        categories={categories}
        selectedId={selectedCategory?.id ?? null}
        onSelect={(cat) => {
          setSelectedCategory(cat);
          // Save merchant rule whenever user picks a category and a merchant name is known
          const merchantName = merchant.trim() || committedMerchant;
          if (cat && merchantName) {
            createRuleMutation.mutate({
              merchant_name: merchantName,
              category_id: cat.id,
            });
          }
        }}
        onClose={() => setShowCategoryPicker(false)}
      />
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 0,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '500',
    color: '#475569',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
    fontVariant: ['tabular-nums' as const],
  },
  typeControl: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  typeBtnLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  subTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  subTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  subTypeBtnActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  subTypeBtnLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 12,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldRow: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldRowError: {
    borderWidth: 1,
    borderColor: '#e11d48',
  },
  fieldRowText: {
    fontSize: 15,
    color: '#0f172a',
    flex: 1,
  },
  fieldRowPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
    flex: 1,
  },
  fieldError: {
    fontSize: 12,
    color: '#e11d48',
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  saveBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Account picker sheet
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  accountSheet: {
    maxHeight: '55%',
  },
  categorySheet: {
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  accountPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountPickerRowSelected: {
    backgroundColor: '#f5f3ff',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  radioCircleSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  accountPickerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  accountPickerMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryRowText: {
    fontSize: 15,
    color: '#0f172a',
  },
  checkmark: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  // AI input
  aiButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabel: {
    fontSize: 12,
    color: '#4f46e5',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  permissionText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  permissionLink: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  receiptReview: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  receiptReviewLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#15803d',
    marginBottom: 8,
  },
  receiptReviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptConfirmBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  receiptConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  receiptClearBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  receiptClearText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  datePickerDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  datePickerDoneBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#4f46e5',
  },
});
