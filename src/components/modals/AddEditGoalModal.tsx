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
import { useCreateGoal, useUpdateGoal } from '../../hooks/useGoals';
import { useUIStore } from '../../stores/uiStore';
import type { Goal } from '../../api/goals';

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
  goal?: Goal;
}

export function AddEditGoalModal({ visible, onClose, goal }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const isEdit = Boolean(goal);

  const [name, setName]                             = useState('');
  const [goalType, setGoalType]                     = useState<'savings_goal' | 'debt_payoff'>('savings_goal');
  const [startDate, setStartDate]                   = useState<Date>(new Date());
  const [deadline, setDeadline]                     = useState<Date | null>(null);
  const [debtStrategy, setDebtStrategy]             = useState<'snowball' | 'avalanche'>('snowball');
  const [color, setColor]                           = useState(COLORS[0]);
  const [notes, setNotes]                           = useState('');
  const [showStartPicker, setShowStartPicker]       = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [errors, setErrors]                         = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]                     = useState(false);

  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal(goal?.id ?? 0);

  useEffect(() => {
    if (visible) {
      if (goal) {
        setName(goal.name);
        setGoalType(goal.goal_type);
        setStartDate(new Date(goal.start_date));
        setDeadline(new Date(goal.deadline));
        setDebtStrategy(goal.debt_strategy ?? 'snowball');
        setColor(goal.color ?? COLORS[0]);
        setNotes(goal.notes ?? '');
      } else {
        setName(''); setGoalType('savings_goal'); setStartDate(new Date()); setDeadline(null);
        setDebtStrategy('snowball'); setColor(COLORS[0]); setNotes('');
      }
      setErrors({});
    }
  }, [visible, goal]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('goals.addModal.errors.nameRequired');
    if (!deadline) errs.deadline = t('goals.addModal.errors.deadlineRequired');
    if (deadline && deadline <= startDate) errs.deadline = t('goals.addModal.errors.deadlineBeforeStart');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const body = {
      name: name.trim(),
      goal_type: goalType,
      start_date: toISODate(startDate),
      deadline: toISODate(deadline!),
      debt_strategy: goalType === 'debt_payoff' ? debtStrategy : null,
      color,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit && goal) {
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
            {isEdit ? t('goals.addModal.titleEdit') : t('goals.addModal.titleAdd')}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          {/* Name */}
          <View style={s.field}>
            <Text style={s.label}>{t('goals.addModal.nameLabel')}</Text>
            <TextInput style={[s.input, errors.name && s.inputError]} value={name} onChangeText={setName}
              placeholder={t('goals.addModal.namePlaceholder')} placeholderTextColor="#94a3b8" maxLength={100} />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          {/* Goal type — locked in edit */}
          <View style={s.field}>
            <Text style={s.label}>{t('goals.addModal.goalTypeLabel')}</Text>
            <View style={s.segRow}>
              {(['savings_goal', 'debt_payoff'] as const).map((gt) => (
                <TouchableOpacity key={gt}
                  style={[s.segPill, goalType === gt && s.segPillActive, isEdit && s.segPillDisabled]}
                  onPress={() => { if (!isEdit) { Haptics.selectionAsync(); setGoalType(gt); } }}>
                  <Text style={[s.segText, goalType === gt && s.segTextActive]}>
                    {gt === 'savings_goal' ? t('goals.addModal.typeSavings') : t('goals.addModal.typeDebt')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Debt strategy (only for debt_payoff) */}
          {goalType === 'debt_payoff' && (
            <View style={s.field}>
              <Text style={s.label}>{t('goals.addModal.debtStrategyLabel')}</Text>
              <View style={s.segRow}>
                {(['snowball', 'avalanche'] as const).map((st) => (
                  <TouchableOpacity key={st} style={[s.segPill, debtStrategy === st && s.segPillActive]}
                    onPress={() => { Haptics.selectionAsync(); setDebtStrategy(st); }}>
                    <Text style={[s.segText, debtStrategy === st && s.segTextActive]}>
                      {st === 'snowball' ? t('goals.strategy.snowball') : t('goals.strategy.avalanche')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.strategyDesc}>
                {debtStrategy === 'snowball'
                  ? t('goals.strategy.snowballExplain')
                  : t('goals.strategy.avalancheExplain')}
              </Text>
            </View>
          )}

          {/* Start date */}
          <View style={s.field}>
            <Text style={s.label}>{t('goals.addModal.startDateLabel')}</Text>
            <TouchableOpacity style={[s.input, s.dateRow]} onPress={() => setShowStartPicker(true)} activeOpacity={0.7}>
              <Text style={s.inputText}>{formatDisplayDate(startDate, displayLocale)}</Text>
              <Calendar size={16} color="#94a3b8" />
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker value={startDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartDate(d); }} />
            )}
          </View>

          {/* Deadline */}
          <View style={s.field}>
            <Text style={s.label}>{t('goals.addModal.deadlineLabel')}</Text>
            <TouchableOpacity style={[s.input, s.dateRow, errors.deadline && s.inputError]}
              onPress={() => setShowDeadlinePicker(true)} activeOpacity={0.7}>
              <Text style={deadline ? s.inputText : s.placeholder}>
                {deadline ? formatDisplayDate(deadline, displayLocale) : t('goals.addModal.deadlinePlaceholder')}
              </Text>
              <Calendar size={16} color="#94a3b8" />
            </TouchableOpacity>
            {errors.deadline && <Text style={s.errorText}>{errors.deadline}</Text>}
            {showDeadlinePicker && (
              <DateTimePicker value={deadline ?? new Date()} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate}
                onChange={(_e, d) => { setShowDeadlinePicker(Platform.OS === 'ios'); if (d) setDeadline(d); }} />
            )}
          </View>

          {/* Color */}
          <View style={s.field}>
            <Text style={s.label}>{t('goals.addModal.colorLabel')}</Text>
            <View style={s.swatches}>
              {COLORS.map((c) => (
                <TouchableOpacity key={c} style={[s.swatch, { backgroundColor: c }, color === c && s.swatchSelected]}
                  onPress={() => { Haptics.selectionAsync(); setColor(c); }} />
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={s.field}>
            <Text style={s.label}>{t('goals.addModal.notesLabel')}</Text>
            <TextInput style={[s.input, s.multiline]} value={notes} onChangeText={setNotes}
              placeholder={t('goals.addModal.notesPlaceholder')} placeholderTextColor="#94a3b8" multiline numberOfLines={3} />
          </View>
        </ScrollView>

        <TouchableOpacity style={[s.saveBtn, isSaving && s.saveBtnDisabled]} onPress={handleSave} disabled={isSaving}>
          <Text style={s.saveBtnText}>
            {isEdit ? t('goals.addModal.saveChangesButton') : t('goals.addModal.saveButton')}
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
  segPillDisabled: { opacity: 0.5 },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#64748b' },
  segTextActive: { color: '#fff' },
  strategyDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 18 },
  saveBtn: { marginHorizontal: 16, marginTop: 16, height: 52, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
