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
import { useUIStore } from '../../stores/uiStore';
import type { Saving } from '../../api/savings';

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
  saving?: Saving;
}

export function AddEditSavingModal({ visible, onClose, saving }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const isEdit = Boolean(saving);

  const [name, setName]                   = useState('');
  const [targetAmount, setTargetAmount]   = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [color, setColor]                 = useState(COLORS[0]);
  const [status, setStatus]               = useState<'active' | 'paused'>('active');
  const [notes, setNotes]                 = useState('');
  const [targetDate, setTargetDate]       = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [isSaving, setIsSaving]           = useState(false);

  const createMutation = useCreateSaving();
  const updateMutation = useUpdateSaving(saving?.id ?? 0);

  useEffect(() => {
    if (visible) {
      if (saving) {
        setName(saving.name);
        setTargetAmount(String(saving.target_amount));
        setCurrentAmount(String(saving.current_amount));
        setColor(saving.color ?? COLORS[0]);
        setStatus(saving.status === 'paused' ? 'paused' : 'active');
        setNotes(saving.notes ?? '');
        setTargetDate(saving.target_date ? new Date(saving.target_date) : null);
      } else {
        setName(''); setTargetAmount(''); setCurrentAmount('0');
        setColor(COLORS[0]); setStatus('active'); setNotes(''); setTargetDate(null);
      }
      setErrors({});
    }
  }, [visible, saving]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('savings.addModal.errors.nameRequired');
    const ta = parseFloat(targetAmount.replace(',', '.'));
    if (!targetAmount || isNaN(ta) || ta <= 0) errs.targetAmount = t('savings.addModal.errors.targetAmountPositive');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const body = {
      name: name.trim(),
      target_amount: parseFloat(targetAmount.replace(',', '.')),
      current_amount: parseFloat((currentAmount || '0').replace(',', '.')),
      color,
      status,
      notes: notes.trim() || null,
      target_date: targetDate ? toISODate(targetDate) : null,
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
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle + header */}
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>
            {isEdit ? t('savings.addModal.titleEdit') : t('savings.addModal.titleAdd')}
          </Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          {/* Name */}
          <View style={s.field}>
            <Text style={s.label}>{t('savings.addModal.nameLabel')}</Text>
            <TextInput
              style={[s.input, errors.name && s.inputError]}
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
            <Text style={s.label}>{t('savings.addModal.targetAmountLabel')}</Text>
            <TextInput
              style={[s.input, errors.targetAmount && s.inputError]}
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
            {errors.targetAmount && <Text style={s.errorText}>{errors.targetAmount}</Text>}
          </View>

          {/* Current amount */}
          <View style={s.field}>
            <Text style={s.label}>{t('savings.addModal.currentAmountLabel')}</Text>
            <TextInput
              style={s.input}
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Target date */}
          <View style={s.field}>
            <Text style={s.label}>{t('savings.addModal.targetDateLabel')}</Text>
            <TouchableOpacity
              style={[s.input, s.dateRow]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={targetDate ? s.inputText : s.placeholder}>
                {targetDate ? formatDisplayDate(targetDate, displayLocale) : t('savings.addModal.targetDatePlaceholder')}
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
            <Text style={s.label}>{t('savings.addModal.colorLabel')}</Text>
            <View style={s.swatches}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[s.swatch, { backgroundColor: c }, color === c && s.swatchSelected]}
                  onPress={() => { Haptics.selectionAsync(); setColor(c); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: color === c }}
                />
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={s.field}>
            <Text style={s.label}>{t('savings.addModal.statusLabel')}</Text>
            <View style={s.segRow}>
              {(['active', 'paused'] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[s.segPill, status === st && s.segPillActive]}
                  onPress={() => { Haptics.selectionAsync(); setStatus(st); }}
                >
                  <Text style={[s.segText, status === st && s.segTextActive]}>
                    {st === 'active' ? t('savings.addModal.statusActive') : t('savings.addModal.statusPaused')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={s.field}>
            <Text style={s.label}>{t('savings.addModal.notesLabel')}</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('savings.addModal.notesPlaceholder')}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>
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
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#0f172a' },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  field: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#64748b', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#0f172a',
    backgroundColor: '#fafafa',
  },
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
  segPill: {
    flex: 1, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  segPillActive: { backgroundColor: '#4f46e5' },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#64748b' },
  segTextActive: { color: '#fff' },
  saveBtn: {
    marginHorizontal: 16, marginTop: 16, height: 52,
    backgroundColor: '#4f46e5', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },
});
