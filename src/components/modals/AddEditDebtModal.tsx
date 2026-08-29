import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCreateDebt, useUpdateDebt } from '../../hooks/useDebts';
import { useCategories } from '../../hooks/useCategories';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';
import type { Debt } from '../../api/debts';
import type { DebtTemplate } from '../../api/templates';
import type { CalculationSettings } from '../../api/financeShared';
import { calcToBody, findCategoryIdByName, mergeCalc } from '../../api/financeShared';
import { AdvancedFinanceSettings } from './AdvancedFinanceSettings';
import { formatDisplayDate, isAfterToday, parseISODate, toISODate } from '../../utils/format';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface Props {
  visible: boolean;
  onClose: () => void;
  debt?: Debt;
  /** When adding, pre-fill the form from a starter template. */
  template?: DebtTemplate;
}

export function AddEditDebtModal({ visible, onClose, debt, template }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const isEdit = Boolean(debt);
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? theme.surface         : '#ffffff';
  const inputBg       = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary   = isDark ? theme.textPrimary     : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary   : '#64748b';
  const borderCol     = isDark ? theme.border          : '#e2e8f0';
  const dividerCol    = isDark ? 'rgba(255,255,255,0.06)'       : '#f1f5f9';

  const [name, setName]                       = useState('');
  const [originalAmount, setOriginalAmount]   = useState('');
  const [openingBalance, setOpeningBalance]   = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<Date>(new Date());
  const [interestRate, setInterestRate]       = useState('');
  const [minimumPayment, setMinimumPayment]   = useState('');
  const [dueDay, setDueDay]                   = useState('');
  const [color, setColor]                     = useState(COLORS[3]);
  const [status, setStatus]                   = useState<'active' | 'paused'>('active');
  const [notes, setNotes]                     = useState('');
  const [targetPayoffDate, setTargetPayoffDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showOpeningBalanceDatePicker, setShowOpeningBalanceDatePicker] = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]               = useState(false);

  // Advanced settings
  const [categoryIds, setCategoryIds]         = useState<number[]>([]);
  const [bankAccountIds, setBankAccountIds]   = useState<number[]>([]);
  const [autoSync, setAutoSync]               = useState(false);
  const [calc, setCalc]                       = useState<CalculationSettings>(mergeCalc('debt'));

  const { data: categories = [] } = useCategories();
  const { data: bankAccounts = [] } = useBankAccounts();

  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt(debt?.id ?? 0);

  useEffect(() => {
    if (visible) {
      if (debt) {
        setName(debt.name);
        setOriginalAmount(String(debt.original_amount));
        setOpeningBalance(String(debt.opening_balance));
        setOpeningBalanceDate(parseISODate(debt.opening_balance_date));
        setInterestRate(debt.interest_rate != null ? String(debt.interest_rate) : '');
        setMinimumPayment(debt.minimum_payment != null ? String(debt.minimum_payment) : '');
        setDueDay(debt.due_day_of_month != null ? String(debt.due_day_of_month) : '');
        setColor(debt.color ?? COLORS[3]);
        setStatus(debt.status === 'paused' ? 'paused' : 'active');
        setNotes(debt.notes ?? '');
        setTargetPayoffDate(debt.target_payoff_date ? parseISODate(debt.target_payoff_date) : null);
        setCategoryIds(debt.categories?.map((c) => c.id) ?? []);
        setBankAccountIds(debt.bank_accounts?.map((a) => a.id) ?? []);
        setAutoSync(Boolean(debt.auto_sync_transactions));
        setCalc(mergeCalc('debt', debt.calculation_settings));
      } else {
        setName(template?.name ?? ''); setOriginalAmount(''); setOpeningBalance('');
        setOpeningBalanceDate(new Date());
        setInterestRate(template?.suggested_interest_rate != null ? String(template.suggested_interest_rate) : '');
        setMinimumPayment(''); setDueDay('');
        setColor(template?.color ?? COLORS[3]); setStatus('active'); setNotes(''); setTargetPayoffDate(null);
        setCategoryIds([]); setBankAccountIds([]); setAutoSync(false);
        setCalc(mergeCalc('debt', template?.calculation_settings));
      }
      setErrors({});
    }
  }, [visible, debt, template]);

  // Resolve the template's suggested category to the user's own once categories load.
  useEffect(() => {
    if (!visible || isEdit || !template?.category_name || categories.length === 0) return;
    const id = findCategoryIdByName(categories, template.category_name);
    if (id) setCategoryIds((prev) => (prev.length === 0 ? [id] : prev));
  }, [visible, isEdit, template, categories]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('debts.addModal.errors.nameRequired');
    const oa = parseFloat(originalAmount.replace(/,/g, ''));
    if (!originalAmount || isNaN(oa) || oa <= 0) errs.originalAmount = t('debts.addModal.errors.originalAmountPositive');
    const cb = parseFloat((openingBalance || '0').replace(/,/g, ''));
    if (isNaN(cb)) errs.openingBalance = t('debts.addModal.errors.openingBalanceRequired');
    if (!isNaN(oa) && !isNaN(cb) && cb > oa) errs.openingBalance = t('debts.addModal.errors.openingBalanceExceedsOriginal');
    // The API rejects a future anchor; don't rely on the native picker's maximumDate,
    // which is not enforced consistently across platforms.
    if (isAfterToday(openingBalanceDate)) errs.openingBalanceDate = t('debts.addModal.errors.openingBalanceDateFuture');
    const dd = parseInt(dueDay, 10);
    if (dueDay && (isNaN(dd) || dd < 1 || dd > 31)) errs.dueDay = t('debts.addModal.errors.dueDayRange');
    if (autoSync && categoryIds.length === 0) errs.autoSync = t('advancedSettings.errors.categoriesRequired');
    else if (autoSync && bankAccountIds.length === 0) errs.autoSync = t('advancedSettings.errors.bankAccountsRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const body = {
      name: name.trim(),
      original_amount: parseFloat(originalAmount.replace(/,/g, '')),
      opening_balance: parseFloat((openingBalance || '0').replace(/,/g, '')),
      opening_balance_date: toISODate(openingBalanceDate),
      interest_rate: interestRate ? parseFloat(interestRate.replace(/,/g, '')) : null,
      minimum_payment: minimumPayment ? parseFloat(minimumPayment.replace(/,/g, '')) : null,
      due_day_of_month: dueDay ? parseInt(dueDay, 10) : null,
      color,
      status,
      notes: notes.trim() || null,
      target_payoff_date: targetPayoffDate ? toISODate(targetPayoffDate) : null,
      category_ids: categoryIds,
      bank_account_ids: bankAccountIds,
      auto_sync_transactions: autoSync,
      ...calcToBody(calc),
    };
    try {
      if (isEdit && debt) {
        await updateMutation.mutateAsync(body);
      } else {
        await createMutation.mutateAsync(body);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: sheetBg }]}>
        <View style={[s.handle, { backgroundColor: borderCol }]} />
        <View style={[s.header, { borderBottomColor: dividerCol }]}>
          <Text style={[s.title, { color: textPrimary }]}>
            {isEdit ? t('debts.addModal.titleEdit') : t('debts.addModal.titleAdd')}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.nameLabel')}</Text>
            <TextInput style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.name && s.inputError]} value={name} onChangeText={setName}
              placeholder={t('debts.addModal.namePlaceholder')} placeholderTextColor="#94a3b8" maxLength={100} />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.originalAmountLabel')}</Text>
            <TextInput style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.originalAmount && s.inputError]} value={originalAmount}
              onChangeText={setOriginalAmount} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            {errors.originalAmount && <Text style={s.errorText}>{errors.originalAmount}</Text>}
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.currentBalanceLabel')}</Text>
            <TextInput style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.openingBalance && s.inputError]} value={openingBalance}
              onChangeText={setOpeningBalance} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            {errors.openingBalance && <Text style={s.errorText}>{errors.openingBalance}</Text>}
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.openingBalanceDateLabel')}</Text>
            <TouchableOpacity style={[s.input, s.dateRow, { backgroundColor: inputBg, borderColor: borderCol }]} onPress={() => setShowOpeningBalanceDatePicker(true)} activeOpacity={0.7}>
              <Text style={[s.inputText, { color: textPrimary }]}>
                {formatDisplayDate(openingBalanceDate, locale)}
              </Text>
              <Calendar size={16} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={[s.helpText, { color: textSecondary }]}>{t('debts.addModal.openingBalanceDateHint')}</Text>
            {errors.openingBalanceDate && <Text style={s.errorText}>{errors.openingBalanceDate}</Text>}
            {showOpeningBalanceDatePicker && (
              <DateTimePicker value={openingBalanceDate} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, d) => { setShowOpeningBalanceDatePicker(Platform.OS === 'ios'); if (d) setOpeningBalanceDate(d); }} />
            )}
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.interestRateLabel')}</Text>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderColor: borderCol }]}>
              <TextInput style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: textPrimary }}
                value={interestRate} onChangeText={setInterestRate} placeholder="0.00"
                placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94a3b8' }}>% annual</Text>
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.minimumPaymentLabel')}</Text>
            <TextInput style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]} value={minimumPayment} onChangeText={setMinimumPayment}
              placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.dueDayLabel')}</Text>
            <TextInput style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.dueDay && s.inputError]} value={dueDay} onChangeText={setDueDay}
              placeholder={t('debts.addModal.dueDayPlaceholder')} placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={2} />
            {errors.dueDay && <Text style={s.errorText}>{errors.dueDay}</Text>}
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.targetDateLabel')}</Text>
            <TouchableOpacity style={[s.input, s.dateRow, { backgroundColor: inputBg, borderColor: borderCol }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={targetPayoffDate ? [s.inputText, { color: textPrimary }] : s.placeholder}>
                {targetPayoffDate ? formatDisplayDate(targetPayoffDate, locale) : t('debts.addModal.targetDatePlaceholder')}
              </Text>
              {targetPayoffDate ? (
                <TouchableOpacity onPress={() => setTargetPayoffDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <Calendar size={16} color="#94a3b8" />
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={targetPayoffDate ?? new Date()} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_e, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setTargetPayoffDate(d); }} />
            )}
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.colorLabel')}</Text>
            <View style={s.swatches}>
              {COLORS.map((c) => (
                <TouchableOpacity key={c} style={[s.swatch, { backgroundColor: c }, color === c && [s.swatchSelected, { borderColor: textPrimary }]]}
                  onPress={() => { Haptics.selectionAsync(); setColor(c); }} />
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.statusLabel')}</Text>
            <View style={s.segRow}>
              {(['active', 'paused'] as const).map((st) => (
                <TouchableOpacity key={st} style={[s.segPill, { backgroundColor: inputBg }, status === st && s.segPillActive]}
                  onPress={() => { Haptics.selectionAsync(); setStatus(st); }}>
                  <Text style={[s.segText, { color: textSecondary }, status === st && s.segTextActive]}>
                    {st === 'active' ? t('debts.addModal.statusActive') : t('debts.addModal.statusPaused')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('debts.addModal.notesLabel')}</Text>
            <TextInput style={[s.input, s.multiline, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]} value={notes} onChangeText={setNotes}
              placeholder={t('debts.addModal.notesPlaceholder')} placeholderTextColor="#94a3b8" multiline numberOfLines={3} />
          </View>

          <AdvancedFinanceSettings
            variant="debt"
            categories={categories}
            selectedCategoryIds={categoryIds}
            onChangeCategoryIds={setCategoryIds}
            bankAccounts={bankAccounts}
            selectedBankAccountIds={bankAccountIds}
            onChangeBankAccountIds={setBankAccountIds}
            autoSync={autoSync}
            onChangeAutoSync={setAutoSync}
            calc={calc}
            onChangeCalc={setCalc}
            autoSyncError={errors.autoSync}
          />
        </ScrollView>

        <TouchableOpacity style={[s.saveBtn, isSaving && s.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
          <Text style={s.saveBtnText}>
            {isEdit ? t('debts.addModal.saveChangesButton') : t('debts.addModal.saveButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  field: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  inputError: { borderColor: '#e11d48' },
  inputText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  placeholder: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#94a3b8' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#e11d48', marginTop: 4 },
  helpText: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  swatches: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchSelected: { borderWidth: 3 },
  segRow: { flexDirection: 'row', gap: 8 },
  segPill: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segPillActive: { backgroundColor: '#4f46e5' },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  segTextActive: { color: '#fff' },
  saveBtn: { marginHorizontal: 16, marginTop: 16, height: 52, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
