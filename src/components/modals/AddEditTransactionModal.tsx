import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
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
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/useTransactions';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useUIStore } from '../../stores/uiStore';
import type { Transaction, TransactionType, CreateTransactionBody } from '../../api/transactions';
import type { BankAccount } from '../../api/bankAccounts';
import type { Category } from '../../api/categories';

// ── Types ──────────────────────────────────────────────────────────────────

type TopLevelType = 'income' | 'expense' | 'transfer';
type SubType = TransactionType;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** If provided, modal opens in Edit mode pre-filled with this transaction */
  transaction?: Transaction;
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
  onSelect: (account: BankAccount) => void;
  onClose: () => void;
}

function AccountPickerSheet({ visible, accounts, selectedId, locale, onSelect, onClose }: AccountPickerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const typeLabel = (type: BankAccount['account_type']) => {
    if (type === 'debit') return t('accounts.types.debit');
    if (type === 'credit') return t('accounts.types.credit');
    return t('accounts.types.cash');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, styles.accountSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>{t('transactions.select_account_title')}</Text>

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
                style={[styles.accountPickerRow, selected && styles.accountPickerRowSelected]}
                onPress={() => { onSelect(item); onClose(); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <View style={[styles.radioCircle, selected && styles.radioCircleSelected]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountPickerName, selected && { color: '#4f46e5' }]}>
                    {item.custom_name ?? item.name}
                  </Text>
                  <Text style={styles.accountPickerMeta}>{typeLabel(item.account_type)} · {fmtBal}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('transactions.no_account_warning')}</Text>
          }
        />
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
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, styles.categorySheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>{t('transactions.category_label')}</Text>

        <TouchableOpacity
          style={styles.categoryRow}
          onPress={() => { onSelect(null); onClose(); }}
        >
          <Text style={styles.categoryRowText}>{t('transactionDetail.fields.uncategorized')}</Text>
          {selectedId === null && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <FlatList
          data={flat}
          keyExtractor={(item) => String(item.cat.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryRow, { paddingLeft: 16 + item.depth * 20 }]}
              onPress={() => { onSelect(item.cat); onClose(); }}
            >
              <Text style={styles.categoryRowText}>{item.cat.name}</Text>
              {selectedId === item.cat.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function AddEditTransactionModal({ visible, onClose, transaction }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { locale, showToast } = useUIStore();
  const isEditMode = Boolean(transaction);

  // ── Queries ──
  const { data: accounts = [] } = useBankAccounts();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

  // ── Mutations ──
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transaction?.id ?? 0);

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
    } else {
      // Reset for add mode
      setAmountStr('');
      setTopType('expense');
      setSubType('variable_expense');
      setDescription('');
      setDate(new Date());
      setSelectedAccount(accounts[0] ?? null);
      setSelectedCategory(null);
      setConcept('');
      setMerchant('');
      setReference('');
    }
  }, [visible, transaction]);

  // Pre-select first account when accounts load (add mode)
  useEffect(() => {
    if (!isEditMode && accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts]);

  // ── Type switching ──
  const handleTopTypeChange = (t: TopLevelType) => {
    Haptics.selectionAsync();
    setTopType(t);
    setSubType(defaultSubType(t));
  };

  // ── Amount color ──
  const amountColor = topType === 'income' ? '#10b981' : topType === 'expense' ? '#e11d48' : '#8b5cf6';

  // ── Validation ──
  const amountNum = parseFloat(amountStr) || 0;
  const canSave = amountNum > 0 && description.trim().length > 0 && selectedAccount !== null;

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
      animationType="slide"
      onRequestClose={isSaving ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={isSaving ? undefined : onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} disabled={isSaving} hitSlop={12}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isEditMode ? t('transactions.edit_title') : t('transactions.add_title')}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Amount */}
              <View style={styles.amountRow}>
                <Text style={styles.currencyPrefix}>MX$</Text>
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
                      style={[styles.typeBtn, active && { backgroundColor: color, borderColor: color }]}
                      onPress={() => handleTopTypeChange(key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Icon size={14} color={active ? '#fff' : '#64748b'} />
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
              <Text style={styles.sectionLabel}>DETALLES</Text>

              {/* Description */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('transactions.description_label')} *</Text>
                <TextInput
                  style={styles.fieldInput}
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
                <Text style={styles.fieldLabel}>{t('transactions.date_label')} *</Text>
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => setShowDatePicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('transactions.date_label')}: ${dateDisplay}`}
                >
                  <Text style={styles.fieldRowText}>{dateDisplay}</Text>
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
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selected) setDate(selected);
                  }}
                />
              )}

              {/* Account */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('transactions.account_label')} *</Text>
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => setShowAccountPicker(true)}
                  accessibilityRole="button"
                >
                  <Text style={selectedAccount ? styles.fieldRowText : styles.fieldRowPlaceholder}>
                    {selectedAccount ? (selectedAccount.custom_name ?? selectedAccount.name) : t('transactions.no_account_warning')}
                  </Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
                {!selectedAccount && (
                  <Text style={styles.fieldError}>{t('transactions.no_account_warning')}</Text>
                )}
              </View>

              {/* Category */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('transactions.category_label')}</Text>
                <TouchableOpacity
                  style={styles.fieldRow}
                  onPress={() => setShowCategoryPicker(true)}
                  accessibilityRole="button"
                >
                  <Text style={styles.fieldRowText}>{categoryDisplay}</Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Optional fields */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('transactions.concept_label')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={concept}
                  onChangeText={setConcept}
                  placeholder="Más detalles..."
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('transactions.merchant_label')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="Walmart, Cinépolis..."
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('transactions.reference_label')}</Text>
                <TextInput
                  style={styles.fieldInput}
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
          </View>
        </KeyboardAvoidingView>
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

      <CategoryPickerSheet
        visible={showCategoryPicker}
        categories={categories}
        selectedId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
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
  keyboardView: {
    justifyContent: 'flex-end',
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
    fontVariant: ['tabular-nums'] as any,
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
    borderRadius: 10,
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
});
