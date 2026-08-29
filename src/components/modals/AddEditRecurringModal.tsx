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
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';
import { useCreateRecurring, useUpdateRecurring } from '../../hooks/useRecurring';
import type { RecurringFrequency, RecurringSeries, RecurringTxType } from '../../api/recurring';
import { formatDisplayDate, parseISODate, toISODate } from '../../utils/format';

const FREQUENCIES: RecurringFrequency[] = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'];
const TX_TYPES: RecurringTxType[] = ['fixed_expense', 'variable_expense', 'income'];

interface Props {
  visible: boolean;
  onClose: () => void;
  series?: RecurringSeries;
}

export function AddEditRecurringModal({ visible, onClose, series }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const isEdit = Boolean(series);
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? theme.surface         : '#ffffff';
  const inputBg       = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary   = isDark ? theme.textPrimary     : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary   : '#64748b';
  const borderCol     = isDark ? theme.border          : '#e2e8f0';
  const dividerCol    = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 7);

  const [name, setName]                       = useState('');
  const [amount, setAmount]                   = useState('');
  const [frequency, setFrequency]             = useState<RecurringFrequency>('monthly');
  const [txType, setTxType]                   = useState<RecurringTxType>('fixed_expense');
  const [nextDue, setNextDue]                 = useState<Date>(defaultDue);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]               = useState(false);

  const createMutation = useCreateRecurring();
  const updateMutation = useUpdateRecurring(series?.id ?? 0);

  useEffect(() => {
    if (visible) {
      if (series) {
        setName(series.name);
        setAmount(String(series.expected_amount));
        const freq: RecurringFrequency = series.frequency === 'custom' ? 'monthly' : series.frequency;
        setFrequency(freq);
        setTxType(series.transaction_type);
        setNextDue(parseISODate(series.next_due_date));
      } else {
        const fresh = new Date();
        fresh.setDate(fresh.getDate() + 7);
        setName('');
        setAmount('');
        setFrequency('monthly');
        setTxType('fixed_expense');
        setNextDue(fresh);
      }
      setErrors({});
    }
  }, [visible, series]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('recurring.errors.nameRequired');
    const numAmount = parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) errs.amount = t('recurring.errors.amountRequired');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const body = {
      name: name.trim(),
      expected_amount: parseFloat(amount),
      frequency,
      next_due_date: toISODate(nextDue),
      transaction_type: txType,
    };
    try {
      if (isEdit && series) {
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
            {isEdit ? t('recurring.addModal.titleEdit') : t('recurring.addModal.titleAdd')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={s.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
          >
            <X size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          {/* Name */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('recurring.fields.name')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.name && s.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Netflix"
              placeholderTextColor="#94a3b8"
              maxLength={100}
            />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          {/* Amount */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('recurring.fields.amount')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }, errors.amount && s.inputError]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="219.00"
              placeholderTextColor="#94a3b8"
            />
            {errors.amount && <Text style={s.errorText}>{errors.amount}</Text>}
          </View>

          {/* Frequency */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('recurring.fields.frequency')}</Text>
            <View style={s.segRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.segPill, { backgroundColor: inputBg }, frequency === f && s.segPillActive]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setFrequency(f); }}
                >
                  <Text style={[s.segText, { color: textSecondary }, frequency === f && s.segTextActive]}>
                    {t(`recurring.frequencies.${f}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Type */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('recurring.fields.type')}</Text>
            <View style={s.segRow}>
              {TX_TYPES.map((tt) => (
                <TouchableOpacity
                  key={tt}
                  style={[s.segPill, { backgroundColor: inputBg }, txType === tt && s.segPillActive]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setTxType(tt); }}
                >
                  <Text style={[s.segText, { color: textSecondary }, txType === tt && s.segTextActive]}>
                    {t(`recurring.types.${tt}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Next due date */}
          <View style={s.field}>
            <Text style={[s.label, { color: textSecondary }]}>{t('recurring.fields.next_due_date')}</Text>
            <TouchableOpacity
              style={[s.input, s.dateRow, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('recurring.fields.next_due_date')}
            >
              <Text style={[s.inputText, { color: textPrimary }]}>{formatDisplayDate(nextDue, locale)}</Text>
              <Calendar size={16} color="#94a3b8" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={nextDue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={isEdit ? undefined : new Date()}
                onChange={(_e, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setNextDue(d); }}
              />
            )}
          </View>
        </ScrollView>

        <TouchableOpacity style={[s.saveBtn, isSaving && s.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
          <Text style={s.saveBtnText}>
            {isEdit ? t('recurring.addModal.saveChangesButton') : t('recurring.addModal.saveButton')}
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
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#e11d48', marginTop: 4 },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segPill: { flexGrow: 1, flexBasis: 0, minWidth: 80, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segPillActive: { backgroundColor: '#4f46e5' },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  segTextActive: { color: '#fff' },
  saveBtn: { marginHorizontal: 16, marginTop: 16, height: 52, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
