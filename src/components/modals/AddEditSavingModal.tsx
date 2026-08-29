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
import { useCreateSaving, useUpdateSaving } from '../../hooks/useSavings';
import { useCategories } from '../../hooks/useCategories';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';
import { MoneyInput } from '../../components/ui/MoneyInput';
import type { Saving } from '../../api/savings';
import type { SavingTemplate } from '../../api/templates';
import type { CalculationSettings } from '../../api/financeShared';
import { calcToBody, findCategoryIdByName, mergeCalc } from '../../api/financeShared';
import { AdvancedFinanceSettings } from './AdvancedFinanceSettings';
import { formatDisplayDate, isAfterToday, parseISODate, toISODate } from '../../utils/format';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface Props {
  visible: boolean;
  onClose: () => void;
  saving?: Saving;
  /** When adding, pre-fill the form from a starter template. */
  template?: SavingTemplate;
}

export function AddEditSavingModal({ visible, onClose, saving, template }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const isEdit = Boolean(saving);
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? theme.surface         : '#ffffff';
  const inputBg       = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary   = isDark ? theme.textPrimary     : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary   : '#64748b';
  const borderCol     = isDark ? theme.border          : '#e2e8f0';
  const dividerCol    = isDark ? 'rgba(255,255,255,0.06)'       : '#f1f5f9';

  const [name, setName]                   = useState('');
  const [targetAmount, setTargetAmount]   = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<Date>(new Date());
  const [color, setColor]                 = useState(COLORS[0]);
  const [status, setStatus]               = useState<'active' | 'paused'>('active');
  const [notes, setNotes]                 = useState('');
  const [targetDate, setTargetDate]       = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showOpeningBalanceDatePicker, setShowOpeningBalanceDatePicker] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]           = useState(false);

  // Advanced settings
  const [categoryIds, setCategoryIds]       = useState<number[]>([]);
  const [bankAccountIds, setBankAccountIds] = useState<number[]>([]);
  const [autoSync, setAutoSync]             = useState(false);
  const [calc, setCalc]                     = useState<CalculationSettings>(mergeCalc('saving'));

  const { data: categories = [] } = useCategories();
  const { data: bankAccounts = [] } = useBankAccounts();

  const createMutation = useCreateSaving();
  const updateMutation = useUpdateSaving(saving?.id ?? 0);

  useEffect(() => {
    if (visible) {
      if (saving) {
        setName(saving.name);
        setTargetAmount(String(saving.target_amount));
        setOpeningBalance(String(saving.opening_balance));
        setOpeningBalanceDate(parseISODate(saving.opening_balance_date));
        setColor(saving.color ?? COLORS[0]);
        setStatus(saving.status === 'paused' ? 'paused' : 'active');
        setNotes(saving.notes ?? '');
        setTargetDate(saving.target_date ? parseISODate(saving.target_date) : null);
        setCategoryIds(saving.categories?.map((c) => c.id) ?? []);
        setBankAccountIds(saving.bank_accounts?.map((a) => a.id) ?? []);
        setAutoSync(Boolean(saving.auto_sync_transactions));
        setCalc(mergeCalc('saving', saving.calculation_settings));
      } else {
        setName(template?.name ?? '');
        setTargetAmount(template?.suggested_target_amount ? String(template.suggested_target_amount) : '');
        setOpeningBalance('0');
        setOpeningBalanceDate(new Date());
        setColor(template?.color ?? COLORS[0]);
        setStatus('active'); setNotes(''); setTargetDate(null);
        setCategoryIds([]); setBankAccountIds([]); setAutoSync(false);
        setCalc(mergeCalc('saving', template?.calculation_settings));
      }
      setErrors({});
    }
  }, [visible, saving, template]);

  // Resolve the template's suggested category to the user's own once categories load.
  useEffect(() => {
    if (!visible || isEdit || !template?.category_name || categories.length === 0) return;
    const id = findCategoryIdByName(categories, template.category_name);
    if (id) setCategoryIds((prev) => (prev.length === 0 ? [id] : prev));
  }, [visible, isEdit, template, categories]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('savings.addModal.errors.nameRequired');
    const ta = parseFloat(targetAmount.replace(/,/g, ''));
    if (!targetAmount || isNaN(ta) || ta <= 0) errs.targetAmount = t('savings.addModal.errors.targetAmountPositive');
    // The API rejects a future anchor; don't rely on the native picker's maximumDate,
    // which is not enforced consistently across platforms.
    if (isAfterToday(openingBalanceDate)) errs.openingBalanceDate = t('savings.addModal.errors.openingBalanceDateFuture');
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
      target_amount: parseFloat(targetAmount.replace(/,/g, '')),
      opening_balance: parseFloat((openingBalance || '0').replace(/,/g, '')),
      opening_balance_date: toISODate(openingBalanceDate),
      color,
      status,
      notes: notes.trim() || null,
      target_date: targetDate ? toISODate(targetDate) : null,
      category_ids: categoryIds,
      bank_account_ids: bankAccountIds,
      auto_sync_transactions: autoSync,
      ...calcToBody(calc),
    };
    try {
      if (isEdit && saving) {
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
        {/* Handle + header */}
        <View style={[s.handle, { backgroundColor: borderCol }]} />
        <View style={[s.header, { borderBottomColor: dividerCol }]}>
          <Text style={[s.title, { color: textPrimary }]}>
            {isEdit ? t('savings.addModal.titleEdit') : t('savings.addModal.titleAdd')}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          {/* Name */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.nameLabel')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.name && s.inputError]}
              value={name}
              onChangeText={setName}
              placeholder={t('savings.addModal.namePlaceholder')}
              placeholderTextColor="#94a3b8"
              maxLength={100}
              returnKeyType="next"
            />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          {/* Target amount */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.targetAmountLabel')}</Text>
            <MoneyInput value={targetAmount} onChangeText={setTargetAmount} hasError={Boolean(errors.targetAmount)} />
            {errors.targetAmount && <Text style={s.errorText}>{errors.targetAmount}</Text>}
          </View>

          {/* Current amount */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.currentAmountLabel')}</Text>
            <MoneyInput value={openingBalance} onChangeText={setOpeningBalance} />
          </View>

          {/* Opening balance date */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.openingBalanceDateLabel')}</Text>
            <TouchableOpacity
              style={[s.input, s.dateRow, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => setShowOpeningBalanceDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[s.inputText, { color: textPrimary }]}>
                {formatDisplayDate(openingBalanceDate, locale)}
              </Text>
              <Calendar size={16} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={[s.helpText, { color: textSecondary }]}>{t('savings.addModal.openingBalanceDateHint')}</Text>
            {errors.openingBalanceDate && <Text style={s.errorText}>{errors.openingBalanceDate}</Text>}
            {showOpeningBalanceDatePicker && (
              <DateTimePicker
                value={openingBalanceDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, d) => {
                  setShowOpeningBalanceDatePicker(Platform.OS === 'ios');
                  if (d) setOpeningBalanceDate(d);
                }}
              />
            )}
          </View>

          {/* Target date */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.targetDateLabel')}</Text>
            <TouchableOpacity
              style={[s.input, s.dateRow, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={targetDate ? [s.inputText, { color: textPrimary }] : s.placeholder}>
                {targetDate ? formatDisplayDate(targetDate, locale) : t('savings.addModal.targetDatePlaceholder')}
              </Text>
              {targetDate ? (
                <TouchableOpacity onPress={() => setTargetDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <Calendar size={16} color="#94a3b8" />
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={targetDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_e, d) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (d) setTargetDate(d);
                }}
              />
            )}
          </View>

          {/* Color */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.colorLabel')}</Text>
            <View style={s.swatches}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.swatch, { backgroundColor: c }, color === c && [s.swatchSelected, { borderColor: textPrimary }]]}
                  onPress={() => { Haptics.selectionAsync(); setColor(c); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: color === c }}
                />
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.statusLabel')}</Text>
            <View style={s.segRow}>
              {(['active', 'paused'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.segPill, { backgroundColor: inputBg }, status === st && s.segPillActive]}
                  onPress={() => { Haptics.selectionAsync(); setStatus(st); }}
                >
                  <Text style={[s.segText, { color: textSecondary }, status === st && s.segTextActive]}>
                    {st === 'active' ? t('savings.addModal.statusActive') : t('savings.addModal.statusPaused')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('savings.addModal.notesLabel')}</Text>
            <TextInput
              style={[s.input, s.multiline, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('savings.addModal.notesPlaceholder')}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          <AdvancedFinanceSettings
            variant="saving"
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

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={s.saveBtnText}>
            {isEdit ? t('savings.addModal.saveChangesButton') : t('savings.addModal.saveButton')}
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
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  field: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter_400Regular', fontSize: 15,
  },
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
  segPill: {
    flex: 1, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  segPillActive: { backgroundColor: '#4f46e5' },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  segTextActive: { color: '#fff' },
  saveBtn: {
    marginHorizontal: 16, marginTop: 16, height: 52,
    backgroundColor: '#4f46e5', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
