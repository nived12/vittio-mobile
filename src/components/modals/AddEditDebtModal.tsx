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
import { useUIStore } from '../../stores/uiStore';
import type { Debt } from '../../api/debts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  debt?: Debt;
}

export function AddEditDebtModal({ visible, onClose, debt }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const isEdit = Boolean(debt);

  const [name, setName]                       = useState('');
  const [originalAmount, setOriginalAmount]   = useState('');
  const [currentBalance, setCurrentBalance]   = useState('');
  const [interestRate, setInterestRate]       = useState('');
  const [minimumPayment, setMinimumPayment]   = useState('');
  const [dueDay, setDueDay]                   = useState('');
  const [color, setColor]                     = useState(COLORS[3]);
  const [status, setStatus]                   = useState<'active' | 'paused'>('active');
  const [notes, setNotes]                     = useState('');
  const [targetPayoffDate, setTargetPayoffDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]               = useState(false);

  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt(debt?.id ?? 0);

  useEffect(() => {
    if (visible) {
      if (debt) {
        setName(debt.name);
        setOriginalAmount(String(debt.original_amount));
        setCurrentBalance(String(debt.current_balance));
        setInterestRate(debt.interest_rate != null ? String(debt.interest_rate) : '');
        setMinimumPayment(debt.minimum_payment != null ? String(debt.minimum_payment) : '');
        setDueDay(debt.due_day_of_month != null ? String(debt.due_day_of_month) : '');
        setColor(debt.color ?? COLORS[3]);
        setStatus(debt.status === 'paused' ? 'paused' : 'active');
        setNotes(debt.notes ?? '');
        setTargetPayoffDate(debt.target_payoff_date ? new Date(debt.target_payoff_date) : null);
      } else {
        setName(''); setOriginalAmount(''); setCurrentBalance('');
        setInterestRate(''); setMinimumPayment(''); setDueDay('');
        setColor(COLORS[3]); setStatus('active'); setNotes(''); setTargetPayoffDate(null);
      }
      setErrors({});
    }
  }, [visible, debt]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('debts.addModal.errors.nameRequired');
    const oa = parseFloat(originalAmount.replace(',', '.'));
    if (!originalAmount || isNaN(oa) || oa <= 0) errs.originalAmount = t('debts.addModal.errors.originalAmountPositive');
    const cb = parseFloat((currentBalance || '0').replace(',', '.'));
    if (isNaN(cb)) errs.currentBalance = t('debts.addModal.errors.currentBalanceRequired');
    if (!isNaN(oa) && !isNaN(cb) && cb > oa) errs.currentBalance = t('debts.addModal.errors.currentBalanceExceedsOriginal');
    const dd = parseInt(dueDay, 10);
    if (dueDay && (isNaN(dd) || dd < 1 || dd > 31)) errs.dueDay = t('debts.addModal.errors.dueDayRange');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const body = {
      name: name.trim(),
      original_amount: parseFloat(originalAmount.replace(',', '.')),
      current_balance: parseFloat((currentBalance || '0').replace(',', '.')),
      interest_rate: interestRate ? parseFloat(interestRate.replace(',', '.')) : null,
      minimum_payment: minimumPayment ? parseFloat(minimumPayment.replace(',', '.')) : null,
      due_day_of_month: dueDay ? parseInt(dueDay, 10) : null,
      color,
      status,
      notes: notes.trim() || null,
      target_payoff_date: targetPayoffDate ? toISODate(targetPayoffDate) : null,
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
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>
            {isEdit ? t('debts.addModal.titleEdit') : t('debts.addModal.titleAdd')}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.nameLabel')}</Text>
            <TextInput style={[s.input, errors.name && s.inputError]} value={name} onChangeText={setName}
              placeholder={t('debts.addModal.namePlaceholder')} placeholderTextColor="#94a3b8" maxLength={100} />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.originalAmountLabel')}</Text>
            <TextInput style={[s.input, errors.originalAmount && s.inputError]} value={originalAmount}
              onChangeText={setOriginalAmount} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            {errors.originalAmount && <Text style={s.errorText}>{errors.originalAmount}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.currentBalanceLabel')}</Text>
            <TextInput style={[s.input, errors.currentBalance && s.inputError]} value={currentBalance}
              onChangeText={setCurrentBalance} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            {errors.currentBalance && <Text style={s.errorText}>{errors.currentBalance}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.interestRateLabel')}</Text>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput style={{ flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#0f172a' }}
                value={interestRate} onChangeText={setInterestRate} placeholder="0.00"
                placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#94a3b8' }}>% annual</Text>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.minimumPaymentLabel')}</Text>
            <TextInput style={s.input} value={minimumPayment} onChangeText={setMinimumPayment}
              placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.dueDayLabel')}</Text>
            <TextInput style={[s.input, errors.dueDay && s.inputError]} value={dueDay} onChangeText={setDueDay}
              placeholder={t('debts.addModal.dueDayPlaceholder')} placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={2} />
            {errors.dueDay && <Text style={s.errorText}>{errors.dueDay}</Text>}
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.targetDateLabel')}</Text>
            <TouchableOpacity style={[s.input, s.dateRow]} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={targetPayoffDate ? s.inputText : s.placeholder}>
                {targetPayoffDate ? formatDisplayDate(targetPayoffDate, displayLocale) : t('debts.addModal.targetDatePlaceholder')}
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
            <Text style={s.label}>{t('debts.addModal.colorLabel')}</Text>
            <View style={s.swatches}>
              {COLORS.map((c) => (
                <TouchableOpacity key={c} style={[s.swatch, { backgroundColor: c }, color === c && s.swatchSelected]}
                  onPress={() => { Haptics.selectionAsync(); setColor(c); }} />
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.statusLabel')}</Text>
            <View style={s.segRow}>
              {(['active', 'paused'] as const).map((st) => (
                <TouchableOpacity key={st} style={[s.segPill, status === st && s.segPillActive]}
                  onPress={() => { Haptics.selectionAsync(); setStatus(st); }}>
                  <Text style={[s.segText, status === st && s.segTextActive]}>
                    {st === 'active' ? t('debts.addModal.statusActive') : t('debts.addModal.statusPaused')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('debts.addModal.notesLabel')}</Text>
            <TextInput style={[s.input, s.multiline]} value={notes} onChangeText={setNotes}
              placeholder={t('debts.addModal.notesPlaceholder')} placeholderTextColor="#94a3b8" multiline numberOfLines={3} />
          </View>
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
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#0f172a' },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  field: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#64748b', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#0f172a', backgroundColor: '#fafafa' },
  inputError: { borderColor: '#e11d48' },
  inputText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#0f172a' },
  placeholder: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#94a3b8' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#e11d48', marginTop: 4 },
  swatches: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchSelected: { borderWidth: 3, borderColor: '#0f172a' },
  segRow: { flexDirection: 'row', gap: 8 },
  segPill: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  segPillActive: { backgroundColor: '#4f46e5' },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#64748b' },
  segTextActive: { color: '#fff' },
  saveBtn: { marginHorizontal: 16, marginTop: 16, height: 52, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
