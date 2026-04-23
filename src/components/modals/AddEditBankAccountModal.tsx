import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, ChevronRight, Lock, Search, CreditCard, Banknote, ChevronLeft, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useBanks } from '../../hooks/useBanks';
import { useCreateBankAccount, useUpdateBankAccount } from '../../hooks/useBankAccounts';
import { useUIStore } from '../../stores/uiStore';
import { getBankLogoComponent } from '../../utils/bankLogos';
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

// ── Helpers ────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  // 'YYYY-MM-DD' in local time (avoid UTC offset shifting the date)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

// ── BankLogo ───────────────────────────────────────────────────────────────

const INIT_COLORS_LOCAL = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#64748b'];

function BankLogo({ bank, size = 40 }: { bank: Bank; size?: number }) {
  const Logo = getBankLogoComponent(bank.logo_url);
  if (Logo) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }]}>
        <Logo width={size * 0.7} height={size * 0.7} />
      </View>
    );
  }
  // Fallback: colored circle with initials
  const initials = bank.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const bgColor = INIT_COLORS_LOCAL[bank.name.charCodeAt(0) % INIT_COLORS_LOCAL.length];
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: size * 0.32, fontWeight: '700', color: '#ffffff' }}>{initials}</Text>
    </View>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function AddEditBankAccountModal({ visible, onClose, account }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showToast } = useUIStore();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const isEditMode = Boolean(account);

  const { data: banks = [], isLoading: banksLoading } = useBanks();
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount(account?.id ?? 0);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Form state ──
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isCash, setIsCash] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('debit');
  const [accountNumber, setAccountNumber] = useState('');
  const [customName, setCustomName] = useState('');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankQuery, setBankQuery] = useState('');

  // ── Reset on open/close ──
  useEffect(() => {
    if (!visible) return;
    if (account) {
      // Edit mode — pre-fill
      setAccountType(account.account_type);
      setCustomName(account.custom_name ?? '');
      const bal = parseFloat(account.opening_balance ?? '0') || 0;
      // Credit balances are stored negative — show the absolute value for display
      setOpeningBalanceStr(Math.abs(bal).toFixed(2));
      setIsCash(account.account_type === 'cash');
      setAccountNumber('');
      setOpeningBalanceDate(new Date());
    } else {
      // Add mode — blank slate
      setSelectedBank(null);
      setIsCash(false);
      setAccountType('debit');
      setAccountNumber('');
      setCustomName('');
      setOpeningBalanceStr('');
      setOpeningBalanceDate(new Date());
    }
    setShowBankPicker(false);
    setShowDatePicker(false);
    setBankQuery('');
  }, [visible, account]);

  // ── Bank picker filter ──
  const filteredBanks = useMemo(() => {
    const q = bankQuery.toLowerCase().trim();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, bankQuery]);

  // ── Bank selection ──
  const handleBankSelect = (bank: Bank | null) => {
    setSelectedBank(bank);
    if (bank === null) {
      setIsCash(true);
      setAccountType('cash');
    } else {
      setIsCash(false);
      if (bank.supported_type === 'debit') setAccountType('debit');
      else if (bank.supported_type === 'credit') setAccountType('credit');
      else setAccountType('debit');
    }
    setShowBankPicker(false);
    setBankQuery('');
  };

  // ── Type buttons ──
  const typeButtons: { type: AccountType; label: string; Icon: typeof CreditCard }[] = [
    { type: 'debit',  label: t('bank_accounts.type_debit'),  Icon: CreditCard },
    { type: 'credit', label: t('bank_accounts.type_credit'), Icon: CreditCard },
    { type: 'cash',   label: t('bank_accounts.type_cash'),   Icon: Banknote },
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

  // FIX 3: Credit card positive balance = liability (red). Debit/cash positive = green.
  const balanceColor = (() => {
    if (accountType === 'credit') {
      // Credit: owes money (positive) = red; overpayment (negative) = green; zero = red (still a card)
      return openingBalance <= 0 ? (openingBalance < 0 ? '#10b981' : '#e11d48') : '#e11d48';
    }
    return openingBalance < 0 ? '#e11d48' : openingBalance > 0 ? '#10b981' : '#0f172a';
  })();


  // ── Validation ──
  const canSave = isEditMode
    ? true
    : (selectedBank !== null || isCash) &&
      (isCash || accountNumber.trim().length > 0); // account_number required for non-cash

  // ── Date picker handler ──
  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setOpeningBalanceDate(date);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!canSave || isSaving) return;
    try {
      if (isEditMode && account) {
        const body: UpdateBankAccountBody = {
          ...(customName.trim() ? { custom_name: customName.trim() } : { custom_name: '' }),
          opening_balance: account.account_type === 'credit' ? -Math.abs(openingBalance) : openingBalance,
        };
        await updateMutation.mutateAsync(body);
        showToast(t('bank_accounts.updated_toast'), 'success');
      } else {
        const body: CreateBankAccountBody = {
          ...(selectedBank ? { bank_id: selectedBank.id } : {}),
          account_type: accountType,
          ...(!isCash ? { account_number: accountNumber.trim() } : {}),
          ...(customName.trim() ? { custom_name: customName.trim() } : {}),
          currency: 'MXN',
          // Credit balances are liabilities — store as negative to match web convention
          opening_balance: accountType === 'credit' ? -Math.abs(openingBalance) : openingBalance,
          opening_balance_date: toISODate(openingBalanceDate),
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
          onPress={isSaving || showBankPicker ? undefined : onClose}
        />
        <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            {showBankPicker ? (
              // ── Inline Bank Picker (no nested Modal) ──────────────────────
              <>
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={() => { setShowBankPicker(false); setBankQuery(''); }}
                    hitSlop={12}
                  >
                    <ChevronLeft size={22} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>{t('bank_accounts.bank_picker_title')}</Text>
                  <View style={{ width: 22 }} />
                </View>

                <View style={styles.searchBar}>
                  <Search size={16} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    value={bankQuery}
                    onChangeText={setBankQuery}
                    placeholder={t('bank_accounts.bank_search_placeholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    returnKeyType="search"
                    autoFocus
                  />
                  {bankQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBankQuery('')}>
                      <X size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {banksLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>{'Cargando...'}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredBanks}
                    keyExtractor={(b) => String(b.id)}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.bankRow,
                          item.id === selectedBank?.id && styles.bankRowSelected,
                        ]}
                        onPress={() => handleBankSelect(item)}
                      >
                        <BankLogo bank={item} size={40} />
                        <Text style={styles.bankName}>{item.name}</Text>
                        {item.id === selectedBank?.id && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    )}
                    ListFooterComponent={
                      <TouchableOpacity
                        style={[styles.bankRow, styles.cashRow]}
                        onPress={() => handleBankSelect(null)}
                      >
                        <View style={[styles.bankAvatar, { backgroundColor: '#d1fae5' }]}>
                          <Banknote size={18} color="#065f46" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bankName}>{t('bank_accounts.cash_option_label')}</Text>
                          <Text style={styles.bankSubtitle}>{t('bank_accounts.cash_option_subtitle')}</Text>
                        </View>
                        {isCash && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    }
                  />
                )}
              </>
            ) : (
              // ── Main Form ─────────────────────────────────────────────────
              <>
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
                  automaticallyAdjustKeyboardInsets
                >
                  {/* ── Bank picker trigger (add mode only) ── */}
                  {!isEditMode && (
                    <View style={styles.fieldBlock}>
                      <Text style={styles.sectionLabel}>{t('bank_accounts.bank_label')}</Text>
                      <TouchableOpacity
                        style={[
                          styles.fieldRow,
                          !selectedBank && !isCash && styles.fieldRowRequired,
                        ]}
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

                  {/* ── Locked bank (edit mode) ── */}
                  {isEditMode && (
                    <View style={styles.fieldBlock}>
                      <Text style={styles.sectionLabel}>{t('bank_accounts.bank_label')}</Text>
                      <View style={[styles.fieldRow, styles.fieldRowLocked]}>
                        <Text style={styles.fieldRowLockedText}>{account?.bank_name ?? '—'}</Text>
                        <Lock size={14} color="#94a3b8" />
                      </View>
                    </View>
                  )}

                  {/* ── Account number (add mode, non-cash only) ── */}
                  {!isEditMode && !isCash && (
                    <View style={styles.fieldBlock}>
                      <Text style={styles.sectionLabel}>{t('bank_accounts.account_number_label')}</Text>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          accountNumber.trim().length === 0 && styles.fieldInputRequired,
                        ]}
                        value={accountNumber}
                        onChangeText={(v) => setAccountNumber(v.replace(/[^0-9]/g, ''))}
                        placeholder={t('bank_accounts.account_number_placeholder')}
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={50}
                        returnKeyType="next"
                      />
                    </View>
                  )}

                  {/* ── Account type (add mode, non-cash) ── */}
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
                                <Text style={[styles.typeBtnLabel, active && { color: '#fff' }]}>
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                      </View>
                    </View>
                  )}

                  {/* ── Locked type (edit mode) ── */}
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

                  {/* ── Custom name ── */}
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

                  {/* ── Currency — locked MVP ── */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.sectionLabel}>{t('bank_accounts.currency_label')}</Text>
                    <View style={[styles.fieldRow, styles.fieldRowLocked]}>
                      <Text style={styles.fieldRowLockedText}>MXN — Peso mexicano</Text>
                      <Lock size={14} color="#94a3b8" />
                    </View>
                  </View>

                  {/* ── Opening balance ── */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.sectionLabel}>
                      {t('bank_accounts.opening_balance_label')}
                    </Text>
                    <View style={styles.balanceRow}>
                      {/* Credit accounts: tap − to flip sign */}
                      {accountType === 'credit' && (
                        <TouchableOpacity
                          onPress={() => {
                            const n = parseFloat(openingBalanceStr) || 0;
                            setOpeningBalanceStr((n * -1).toFixed(2));
                          }}
                          accessibilityLabel="Toggle sign"
                          hitSlop={12}
                          style={styles.signToggle}
                        >
                          <Text style={styles.signToggleText}>−</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.currencyPrefix}>MX$</Text>
                      <TextInput
                        style={[styles.balanceInput, { color: balanceColor }]}
                        value={openingBalanceStr}
                        onChangeText={(v) => {
                          const withSign = v.startsWith('-') ? '-' : '';
                          const digits = v.replace(/[^0-9.]/g, '');
                          const parts = digits.split('.');
                          let clean = parts[0];
                          if (parts.length > 1) {
                            clean += '.' + parts[1].slice(0, 2);
                          }
                          setOpeningBalanceStr(withSign + clean);
                        }}
                        onBlur={() => {
                          const n = parseFloat(openingBalanceStr);
                          setOpeningBalanceStr(isNaN(n) ? '0.00' : n.toFixed(2));
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                        selectTextOnFocus
                        returnKeyType="done"
                      />
                    </View>
                    <Text style={styles.fieldHint}>{t('bank_accounts.opening_balance_hint')}</Text>
                  </View>

                  {/* ── Opening balance date (add mode only) ── */}
                  {!isEditMode && (
                    <View style={styles.fieldBlock}>
                      <Text style={styles.sectionLabel}>
                        {t('bank_accounts.opening_balance_date_label')}
                      </Text>
                      <TouchableOpacity
                        style={styles.fieldRow}
                        onPress={() => setShowDatePicker(true)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.fieldRowText}>
                          {formatDisplayDate(openingBalanceDate, displayLocale)}
                        </Text>
                        <Calendar size={16} color="#94a3b8" />
                      </TouchableOpacity>
                      <Text style={styles.fieldHint}>
                        {t('bank_accounts.opening_balance_date_hint')}
                      </Text>

                      {showDatePicker && (
                        <>
                          <DateTimePicker
                            value={openingBalanceDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            maximumDate={new Date()}
                            onChange={handleDateChange}
                            locale={displayLocale}
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.dateConfirmBtn}
                              onPress={() => setShowDatePicker(false)}
                            >
                              <Text style={styles.dateConfirmLabel}>{t('common.done')}</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  )}

                  {/* ── Save button ── */}
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      (!canSave || isSaving) && styles.saveBtnDisabled,
                    ]}
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
              </>
            )}
          </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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
  fieldInputRequired: {
    borderWidth: 1, borderColor: '#fca5a5',
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
    borderWidth: 1.5, borderColor: 'transparent',
  },
  signToggle: {
    marginRight: 4,
    paddingHorizontal: 2,
  },
  signToggleText: {
    fontSize: 20, fontWeight: '700', color: '#e11d48', lineHeight: 24,
  },
  currencyPrefix: { fontSize: 16, fontWeight: '500', color: '#475569', marginRight: 8 },
  balanceInput: { flex: 1, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] as any },
  dateConfirmBtn: {
    marginTop: 8, alignSelf: 'flex-end',
    backgroundColor: '#4f46e5', borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  dateConfirmLabel: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  saveBtn: {
    backgroundColor: '#4f46e5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: '#cbd5e1' },
  saveBtnLabel: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  // Bank picker (inline)
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
  bankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
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
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40,
  },
  loadingText: { fontSize: 15, color: '#94a3b8' },
});
