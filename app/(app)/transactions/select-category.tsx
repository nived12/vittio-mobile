import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeContext';
import { CategoryPickerList } from '../../../src/components/modals/CategoryPickerSheet';
import { resolveCategoryPicker } from '../../../src/utils/categoryPickerCallback';

export default function SelectCategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { selectedId: selectedIdParam } = useLocalSearchParams<{ selectedId?: string }>();
  const selectedId = selectedIdParam ? Number(selectedIdParam) : null;

  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: surface, borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textPrimary }]}>{t('transactions.category_label')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <CategoryPickerList
        selectedId={selectedId}
        autoFocusSearch
        bottomInset={insets.bottom + 16}
        onSelect={(cat) => {
          resolveCategoryPicker(cat);
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 17, fontWeight: '600' },
});
