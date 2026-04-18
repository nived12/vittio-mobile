import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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
import * as Haptics from 'expo-haptics';
import { X, ChevronRight, Lock, Search, CreditCard, Banknote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useBanks } from '../../hooks/useBanks';
import { useCreateBankAccount, useUpdateBankAccount } from '../../hooks/useBankAccounts';
import { useUIStore } from '../../stores/uiStore';
import type { Bank } from '../../api/banks';
import type { BankAccount, CreateBankAccountBody, UpdateBankAccountBody } from '../../api/bankAccounts';

// ── Types ──────────────────────────────────────────────────────────────────

type AccountType = 'debit' | 'credit' | 'cash';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** If provided, opens in Edit mode */
  account?: BankAccount;
}

// ── Bank Picker Sheet ─────────────────────────────────────────────────────

interface BankPickerProps {
  visible: boolean;
  banks: Bank[];
  selectedId: number | null;
  onSelect: (bank: Bank | null) => void;
  onClose: () => void;
}

function BankPickerSheet({ visible, banks, selectedId, onSelect, onClose }: BankPickerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, query]);

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const INIT_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#e11d48'];
  const initColor = (name: string) => INIT_COLORS[name.charCodeAt(0) % INIT_COLORS.length];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '75%' }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>{t('bank_accounts.bank_picker_title')}</Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('bank_accounts.bank_search_placeholder')}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(b) => String(b.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.bankRow, item.id === selectedId && styles.bankRowSelected]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              {/* Logo or initials avatar */}
              <View style={[styles.bankAvatar, { backgroundColor: initColor(item.name) }]}>
                <Text style={styles.bankAvatarText}>{initials(item.name)}</Text>
              </View>
              <Text style={styles.bankName}>{item.name}</Text>
              {item.id === selectedId && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.bankRow, styles.cashRow]}
              onPress={() => { onSelect(null); onClose(); }}
            >
              <View style={[styles.bankAvatar, { backgroundColor: '#d1fae5' }]}>
                <Banknote size={18} color="#065f46" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankName}>{t('bank_accounts.cash_option_label')}</Text>
                <Text style={styles.bankSubtitle}>{t('bank_accounts.cash_option_subtitle')}</Text>
              </View>
              {selectedId === null && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          }
        />
      </View>
    </Modal>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function AddEditBankAccountModal({ visible, onClose, account }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showToast } = useUIStore();
  const isEditMode = Boolean(account);

  const { data: banks = [] } = useBanks();
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount(account?.id ?? 0);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Form state ──
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isCash, setIsCash] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('debit');
  const [customName, setCustomName] = useState('');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  // ── Pre-fill for edit mode ──
  useEffect(() => {
    if (!visible) return;
    if (account) {
      setAccountType(account.account_type);
      setCustomName(account.custom_name ?? '');
      setOpeningBalanceStr(account.opening_balance ?? '0.00');
      setIsCash(account.account_type === 'cash');
    } else {
      setSelectedBank(null);
      setIsCash(false);
      setAccountType('debit');
      setCustomName('');
      setOpeningBalanceStr('');
    }
  }, [visible, account]);

  // ── Bank selection side-effect ──
  const handleBankSelect = (bank: Bank | null) => {
    setSelectedBank(bank);
    if (bank === null) {
      // Cash selected
      setIsCash(true);
      setAccountType('cash');
    } else {
      setIsCash(false);
      // Snap account type to bank's supported_type
      if (bank.supported_type === 'debit') setAccountType('debit');
      else if (bank.supported_type === 'credit') setAccountType('credit');
      else setAccountType('debit'); // 'both' or null → default debit
    }
  };

  // ── Type buttons (only in add mode, non-cash) ──
  const typeButtons: { type: AccountType; label: string; Icon: typeof CreditCard }[] = [
    { type: 'debit', label: t('bank_accounts.type_debit'), Icon: CreditCard },
    { type: 'credit', label: t('bank_accounts.type_credit'), Icon: CreditCard },
    { type: 'cash', label: t('bank_accounts.type_cash'), Icon: Banknote },
  ];

  const availableTypes = useMemo((): AccountType[] => {
    if (isCash) return ['cash'];
    if (!selectedBank) return ['debit', 'credit'];
    if (selectedBank.supported_type === 'debit') return ['debit'];
    if (selectedBank.supported_type === 'credit') return ['credit'];
    return ['debit', 'credit'];
  }, [selectedBank, isCash]);

  // ── Opening balance ──
  const openingBalance = parseFloat(openingBalanceStr) || 0;
  const balanceColor = openingBalance < 0 ? '#e11d48' : openingBalance > 0 ? '#10b981' : '#0f172a';

  // ── Validation ──
  const canSave = isEditMode
    ? true
    : (selectedBank !== null || isCash);

  // ── Save ──
  const handleSave = async () => {
    if (!canSave || isSaving) return;

    try {
      if (isEditMode && account) {
        const body: UpdateBankAccountBody = {
          ...(customName.trim() ? { custom_name: customName.trim() } : { custom_name: '' }),
          opening_balance: openingBalance,
        };
        await updateMutation.mutateAsync(body);
        showToast(t('bank_accounts.updated_toast'), 'success');
      } else {
        const body: CreateBankAccountBody = {
          ...(selectedBank ? { bank_id: selectedBank.id } : {}),
          account_type: accountType,
          ...(customName.trim() ? { custom_name: customName.trim() } : {}),
          currency: 'MXN',
          opening_balance: openingBalance,
        };
        await createMutation.mutateAsync(body);
        showToast(t('bank_accounts.saved_toast'), 'success');
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
    <>
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
                  {isEditMode ? t('bank_accounts.edit_title') : t('bank_accounts.add_title')}
                </Text>
                <View style={{ width: 22 }} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {/* Bank picker (add mode only) */}
                {!isEditMode && (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.sectionLabel}>{t('bank_accounts.bank_label')}</Text>
                    <TouchableOpacity
                      style={[styles.fieldRow, !selectedBank && !isCash && styles.fieldRowRequired]}
                      onPress={() => setShowBankPicker(true)}
                      accessibilityRole="button"
                    >
                      <Text style={selectedBank || isCash ? styles.fieldRowText : styles.fieldRowPlaceholder}>
                        {isCash
                          ? t('bank_accounts.cash_option_label')
                          : selectedBank
                            ? selectedBank.name
                            : t('bank_accounts.bank_placeholder')}
                      </Text>
                      <ChevronRight size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Locked bank (edit mode) */}
                {isEditMode && (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.sectionLabel}>{t('bank_accounts.bank_label')}</Text>
                    <View style={[styles.fieldRow, styles.fieldRowLocked]}>
                      <Text style={styles.fieldRowLockedText}>{account?.bank_name ?? '—'}</Text>
                      <Lock size={14} color="#94a3b8" />
                    </View>
                  </View>
                )}

                {/* Account type (add mode, non-cash) */}
                {!isEditMode && !isCash && (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.sectionLabel}>{t('bank_accounts.type_label')}</Text>
                    <View style={styles.typeRow}>
                      {typeButtons
                        .filter((btn) => availableTypes.includes(btn.type))
                        .map(({ type, label, Icon }) => {
                          const active = accountType === type;
                          const btnColor =
                            type === 'debit' ? '#0ea5e9' : type === 'credit' ? '#8b5cf6' : '#10b981';
                          return (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.typeBtn,
                                active && { backgroundColor: btnColor, borderColor: btnColor },
                              ]}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setAccountType(type);
                              }}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: active }}
                            >
                              <Icon size={14} color={active ? '#fff' : '#64748b'} />
                              <Text style={[styles.typeBtnLabel, active && { color: '#fff' }]}>{label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}

                {/* Locked type (edit mode) */}
                {isEditMode && (
                  <View style={styles.fieldBlock}>
                    <Text style={styles.sectionLabel}>{t('bank_accounts.type_label')}</Text>
                    <View style={[styles.fieldRow, styles.fieldRowLocked]}>
                      <Text style={styles.fieldRowLockedText}>
                        {account?.account_type === 'debit'
                          ? t('bank_accounts.type_debit')
                          : account?.account_type === 'credit'
                            ? t('bank_accounts.type_credit')
                            : t('bank_accounts.type_cash')}
                      </Text>
                      <Lock size={14} color="#94a3b8" />
                    </View>
                  </View>
                )}

                {/* Custom name */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.sectionLabel}>{t('bank_accounts.name_label')}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder={t('bank_accounts.name_placeholder')}
                    placeholderTextColor="#94a3b8"
                    maxLength={100}
                    returnKeyType="next"
                  />
                  <Text style={styles.fieldHint}>{t('bank_accounts.name_hint')}</Text>
                </View>

                {/* Currency — locked MVP */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.sectionLabel}>{t('bank_accounts.currency_label')}</Text>
                  <View style={[styles.fieldRow, styles.fieldRowLocked]}>
                    <Text style={styles.fieldRowLockedText}>MXN — Peso mexicano</Text>
                    <Lock size={14} color="#94a3b8" />
                  </View>
                </View>

                {/* Opening balance */}
                <View style={styles.fieldBlock}>
                  <Text style={styles.sectionLabel}>{t('bank_accounts.opening_balance_label')}</Text>
                  <View style={styles.balanceRow}>
                    <Text style={styles.currencyPrefix}>MX$</Text>
                    <TextInput
                      style={[styles.balanceInput, { color: balanceColor }]}
                      value={openingBalanceStr}
                      onChangeText={(v) => {
                        const clean = v.replace(/[^0-9.\-]/g, '');
                        setOpeningBalanceStr(clean);
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                      returnKeyType="done"
                      onSubmitEditing={handleSave}
                    />
                  </View>
                  <Text style={styles.fieldHint}>{t('bank_accounts.opening_balance_hint')}</Text>
                </View>

                {/* Save button */}
                <TouchableOpacity
                  style={[styles.saveBtn, (!canSave || isSaving) && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!canSave || isSaving}
                >
                  <Text style={styles.saveBtnLabel}>
                    {isSaving
                      ? '...'
                      : isEditMode
                        ? t('bank_accounts.save_changes_button')
                        : t('bank_accounts.save_button')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bank picker sub-sheet */}
      <BankPickerSheet
        visible={showBankPicker}
        banks={banks}
        selectedId={selectedBank?.id ?? null}
        onSelect={handleBankSelect}
        onClose={() => setShowBankPicker(false)}
      />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  keyboardView: { justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0', alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  fieldBlock: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '500', color: '#94a3b8',
    letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase',
  },
  fieldRow: {
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fieldRowRequired: { borderWidth: 1, borderColor: '#e11d48' },
  fieldRowLocked: { backgroundColor: '#f8fafc' },
  fieldRowText: { fontSize: 15, color: '#0f172a', flex: 1 },
  fieldRowPlaceholder: { fontSize: 15, color: '#94a3b8', flex: 1 },
  fieldRowLockedText: { fontSize: 15, color: '#94a3b8', flex: 1 },
  fieldInput: {
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#0f172a',
  },
  fieldHint: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  typeBtnLabel: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  balanceRow: {
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  currencyPrefix: { fontSize: 16, fontWeight: '500', color: '#475569', marginRight: 8 },
  balanceInput: { flex: 1, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] as any },
  saveBtn: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: '#cbd5e1' },
  saveBtnLabel: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  // Bank picker sheet
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  bankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  bankRowSelected: { backgroundColor: '#f5f3ff' },
  cashRow: { marginTop: 4 },
  bankAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  bankAvatarText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  bankName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0f172a' },
  bankSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  checkmark: { fontSize: 16, color: '#4f46e5', fontWeight: '600' },
});
