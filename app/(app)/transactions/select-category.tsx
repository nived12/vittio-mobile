import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useCategories } from '../../../src/hooks/useCategories';
import { resolveCategoryPicker } from '../../../src/utils/categoryPickerCallback';
import type { Category } from '../../../src/api/categories';

export default function SelectCategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { selectedId: selectedIdParam } = useLocalSearchParams<{ selectedId?: string }>();
  const selectedId = selectedIdParam ? Number(selectedIdParam) : null;

  const { data: categoriesData } = useCategories();
  const categories: Category[] = categoriesData ?? [];

  const [query, setQuery] = useState('');

  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';
  const accent = '#4f46e5';

  const flat = useMemo(() => {
    const rows: Array<{ cat: Category; depth: number }> = [];
    const q = query.trim().toLowerCase();
    for (const parent of categories) {
      if (!q) {
        rows.push({ cat: parent, depth: 0 });
        for (const child of parent.children ?? []) rows.push({ cat: child, depth: 1 });
      } else {
        const matchedChildren = (parent.children ?? []).filter((ch) =>
          ch.name.toLowerCase().includes(q)
        );
        const parentMatches = parent.name.toLowerCase().includes(q);
        if (parentMatches || matchedChildren.length > 0) {
          rows.push({ cat: parent, depth: 0 });
          for (const child of parentMatches ? (parent.children ?? []) : matchedChildren) {
            rows.push({ cat: child, depth: 1 });
          }
        }
      }
    }
    return rows;
  }, [categories, query]);

  function handleSelect(cat: Category | null) {
    resolveCategoryPicker(cat ? { id: cat.id, name: cat.name } : null);
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: surface, borderBottomColor: borderCol }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textPrimary }]}>{t('transactions.category_label')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.searchWrap, { backgroundColor: surface, borderBottomColor: borderCol }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('common.search') + '...'}
            placeholderTextColor={textSecondary}
            style={[styles.searchInput, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
            autoCorrect={false}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={flat}
          keyExtractor={(item) => String(item.cat.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListHeaderComponent={
            !query ? (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: dividerCol }]}
                onPress={() => handleSelect(null)}
              >
                <Text style={[styles.rowText, { color: textPrimary }]}>
                  {t('transactionDetail.fields.uncategorized')}
                </Text>
                {selectedId === null && <Check size={18} color={accent} />}
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { paddingLeft: 16 + item.depth * 20, borderBottomColor: dividerCol }]}
              onPress={() => handleSelect(item.cat)}
            >
              <Text style={[styles.rowText, { color: item.depth > 0 ? textSecondary : textPrimary }]}>
                {item.cat.name}
              </Text>
              {selectedId === item.cat.id && <Check size={18} color={accent} />}
            </TouchableOpacity>
          )}
        />
      </KeyboardAvoidingView>
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
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingRight: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  rowText: { fontSize: 15, flex: 1 },
});
