import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useTemplates } from '../../hooks/useTemplates';
import type { SavingTemplate, DebtTemplate } from '../../api/templates';

type Props =
  | {
      visible: boolean;
      onClose: () => void;
      type: 'savings';
      onSelect: (template: SavingTemplate) => void;
    }
  | {
      visible: boolean;
      onClose: () => void;
      type: 'debts';
      onSelect: (template: DebtTemplate) => void;
    };

export function TemplatePickerModal({ visible, onClose, type, onSelect }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? theme.surface         : '#ffffff';
  const textPrimary   = isDark ? theme.textPrimary     : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary   : '#64748b';
  const borderCol     = isDark ? theme.border          : '#e2e8f0';
  const dividerCol    = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const { data, isLoading, isError } = useTemplates();
  const templates = type === 'savings' ? data?.savings ?? [] : data?.debts ?? [];

  function handleSelect(template: SavingTemplate | DebtTemplate) {
    Haptics.selectionAsync().catch(() => {});
    // The picker is rendered per-type, so the template matches the onSelect signature.
    (onSelect as (tpl: SavingTemplate | DebtTemplate) => void)(template);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: sheetBg }]}>
        <View style={[s.handle, { backgroundColor: borderCol }]} />
        <View style={[s.header, { borderBottomColor: dividerCol }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: textPrimary }]}>{t('templates.pickerHeading')}</Text>
            <Text style={[s.subtitle, { color: textSecondary }]}>{t('templates.pickerSubheading')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          {isLoading ? (
            <View style={s.centered}><ActivityIndicator color="#4f46e5" /></View>
          ) : isError ? (
            <View style={s.centered}>
              <Text style={[s.subtitle, { color: textSecondary }]}>{t('common.tryAgain')}</Text>
            </View>
          ) : (
            templates.map((template) => (
              <TouchableOpacity
                key={template.key}
                style={[s.row, { borderColor: borderCol }]}
                onPress={() => handleSelect(template)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={[s.dot, { backgroundColor: `${template.color}1A` }]}>
                  <View style={[s.dotInner, { backgroundColor: template.color }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: textPrimary }]}>{template.name}</Text>
                  <Text style={[s.rowDesc, { color: textSecondary }]}>{template.description}</Text>
                </View>
                <ChevronRight size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  centered: { paddingVertical: 40, alignItems: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginVertical: 4, padding: 14,
    borderWidth: 1, borderRadius: 12,
  },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 12, height: 12, borderRadius: 6 },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  rowDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
});
