import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import { useCategories } from '../../hooks/useCategories';
import { getCategoryColor } from '../../utils/categoryColors';
import type { Category } from '../../api/categories';

export type CategorySelection = { id: number; name: string } | null;

interface ListProps {
  selectedId: number | null;
  onSelect: (category: CategorySelection) => void;
  /** Offer the "Sin categoría" row. Off for filters, where clearing lives elsewhere. */
  allowUncategorized?: boolean;
  autoFocusSearch?: boolean;
  bottomInset?: number;
}

type Row = { cat: Category; depth: number };

/**
 * Search + parent/child list shared by the picker screen and the sheet, so
 * every entry point into re-categorizing looks and searches the same.
 */
export function CategoryPickerList({
  selectedId,
  onSelect,
  allowUncategorized = true,
  autoFocusSearch = false,
  bottomInset = 16,
}: ListProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const { data: categoriesData } = useCategories();
  const categories: Category[] = categoriesData ?? [];
  const [query, setQuery] = useState('');

  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const borderCol = isDark ? theme.border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const q = query.trim().toLowerCase();
    for (const parent of categories) {
      const children = parent.children ?? [];
      if (!q) {
        out.push({ cat: parent, depth: 0 });
        for (const child of children) out.push({ cat: child, depth: 1 });
        continue;
      }
      const parentMatches = parent.name.toLowerCase().includes(q);
      const matchedChildren = children.filter((ch) => ch.name.toLowerCase().includes(q));
      if (parentMatches || matchedChildren.length > 0) {
        out.push({ cat: parent, depth: 0 });
        for (const child of parentMatches ? children : matchedChildren) {
          out.push({ cat: child, depth: 1 });
        }
      }
    }
    return out;
  }, [categories, query]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[s.searchWrap, { backgroundColor: surface, borderBottomColor: borderCol }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('categories.searchPlaceholder')}
          placeholderTextColor={textSecondary}
          style={[s.searchInput, { backgroundColor: inputBg, color: textPrimary, borderColor: borderCol }]}
          autoCorrect={false}
          autoFocus={autoFocusSearch}
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel={t('categories.searchPlaceholder')}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.cat.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: bottomInset }}
        ListHeaderComponent={
          allowUncategorized && !query ? (
            <TouchableOpacity
              style={[s.row, { borderBottomColor: dividerCol }]}
              onPress={() => onSelect(null)}
              accessibilityRole="button"
            >
              <Text style={[s.rowText, { color: textPrimary }]}>
                {t('transactionDetail.fields.uncategorized')}
              </Text>
              {selectedId === null && <Check size={18} color={ACCENT} />}
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <Text style={[s.empty, { color: textSecondary }]}>{query ? t('categories.noResults') : t('categories.emptyTitle')}</Text>
        }
        renderItem={({ item }) => {
          const isChild = item.depth > 0;
          const isSelected = selectedId === item.cat.id;
          return (
            <TouchableOpacity
              style={[s.row, { paddingLeft: 16 + item.depth * 20, borderBottomColor: dividerCol }]}
              onPress={() => onSelect({ id: item.cat.id, name: item.cat.name })}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[s.dot, { backgroundColor: getCategoryColor(item.cat.icon) }, isChild && s.dotChild]} />
              <Text
                style={[
                  s.rowText,
                  { color: isChild ? textSecondary : textPrimary },
                  isSelected && { color: ACCENT, fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                {item.cat.name}
              </Text>
              {isSelected && <Check size={18} color={ACCENT} />}
            </TouchableOpacity>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: CategorySelection) => void;
  selectedId?: number | null;
  allowUncategorized?: boolean;
}

/** Bottom-sheet host for `CategoryPickerList`. Selecting a row closes it. */
export function CategoryPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedId = null,
  allowUncategorized = true,
}: SheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: surface, paddingBottom: insets.bottom }]}>
          <View style={[s.handle, { backgroundColor: borderCol }]} />
          <Text style={[s.title, { color: textPrimary }]}>{t('transactions.category_label')}</Text>
          <CategoryPickerList
            selectedId={selectedId}
            allowUncategorized={allowUncategorized}
            bottomInset={insets.bottom + 16}
            onSelect={(cat) => {
              onSelect(cat);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const ACCENT = '#4f46e5';

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 17, textAlign: 'center', paddingVertical: 12 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { height: 40, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingRight: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  rowText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotChild: { width: 6, height: 6, borderRadius: 3, marginLeft: 2, marginRight: 2 },
  empty: { textAlign: 'center', paddingVertical: 32, fontFamily: 'Inter_400Regular', fontSize: 14 },
});
