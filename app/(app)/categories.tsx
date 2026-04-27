import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCategories, useDeleteCategory } from '../../src/hooks/useCategories';
import { AddEditCategoryModal } from '../../src/components/modals/AddEditCategoryModal';
import { useUIStore } from '../../src/stores/uiStore';
import { colors, spacing, textStyles } from '../../src/theme';
import type { Category } from '../../src/api/categories';

// ── Category row with swipe-to-delete ─────────────────────────────────────

interface CategoryRowProps {
  cat: Category;
  isChild?: boolean;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  onAddSub: (parent: Category) => void;
}

function CategoryRow({ cat, isChild = false, onEdit, onDelete, onAddSub }: CategoryRowProps) {
  const { t } = useTranslation();
  const swipeableRef = useRef<Swipeable>(null);
  const dotColor = cat.color ?? colors.brand.primary;
  const hasChildren = !isChild && (cat.children ?? []).length > 0;

  function handleDeletePress() {
    swipeableRef.current?.close();
    if (hasChildren) {
      Alert.alert(
        t('categories.deleteBlockedTitle'),
        t('categories.deleteBlockedMessage'),
      );
      return;
    }
    Alert.alert(
      t('categories.deleteConfirmTitle'),
      t('categories.deleteConfirmMessage', { name: cat.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(cat);
          },
        },
      ],
    );
  }

  function renderRightAction() {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={handleDeletePress}
        accessibilityLabel={t('common.delete')}
      >
        <Trash2 size={22} color="#ffffff" />
      </TouchableOpacity>
    );
  }

  const row = (
    <TouchableOpacity
      style={[styles.row, isChild && styles.rowChild]}
      onPress={() => onEdit(cat)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={cat.name}
      accessibilityHint={t('categories.tapToEdit')}
    >
      {isChild && <View style={styles.childIndent} />}

      <View style={[styles.colorDot, { backgroundColor: dotColor }]} />

      <View style={styles.rowContent}>
        <Text style={styles.rowName}>{cat.name}</Text>
        {hasChildren && (
          <Text style={styles.rowMeta}>
            {t('categories.subcategoryCount', { count: (cat.children ?? []).length })}
          </Text>
        )}
      </View>

      {!isChild && (
        <TouchableOpacity
          style={styles.addSubBtn}
          onPress={() => onAddSub(cat)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('categories.addSubcategory')}
        >
          <Plus size={14} color={colors.text.muted} />
        </TouchableOpacity>
      )}

      <ChevronRight size={16} color={colors.text.muted} />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightAction}
      friction={2}
      rightThreshold={80}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }}
    >
      {row}
    </Swipeable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const { showToast } = useUIStore();

  const { data: categories = [], isLoading, refetch, isRefetching } = useCategories();
  const deleteMutation = useDeleteCategory();

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [parentCategory, setParentCategory] = useState<Category | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.reduce<Category[]>((acc, parent) => {
      const parentMatches = parent.name.toLowerCase().includes(q);
      const matchingChildren = (parent.children ?? []).filter((c) =>
        c.name.toLowerCase().includes(q),
      );
      if (parentMatches) {
        acc.push(parent);
      } else if (matchingChildren.length > 0) {
        acc.push({ ...parent, children: matchingChildren });
      }
      return acc;
    }, []);
  }, [categories, searchQuery]);

  function openAdd(parent?: Category) {
    setEditingCategory(undefined);
    setParentCategory(parent);
    setShowAddEdit(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setParentCategory(undefined);
    setShowAddEdit(true);
  }

  async function handleDelete(cat: Category) {
    try {
      await deleteMutation.mutateAsync(cat.id);
      showToast(t('categories.deletedToast'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  // Each parent renders as a group: parent row + children rows
  function renderGroup(parent: Category) {
    return (
      <View key={parent.id}>
        <CategoryRow
          cat={parent}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAddSub={openAdd}
        />
        {(parent.children ?? []).map((child) => (
          <View key={child.id}>
            <CategoryRow
              cat={child}
              isChild
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddSub={openAdd}
            />
            <View style={styles.childDivider} />
          </View>
        ))}
        <View style={styles.groupDivider} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('categories.title')}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openAdd()}
          accessibilityRole="button"
          accessibilityLabel={t('categories.addTitle')}
        >
          <Plus size={22} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color={colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('categories.searchPlaceholder')}
          placeholderTextColor={colors.text.muted}
          returnKeyType="search"
          clearButtonMode="never"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.center}>
          {searchQuery.length > 0 ? (
            <Text style={styles.emptyTitle}>{t('categories.noResults')}</Text>
          ) : (
            <>
              <Text style={styles.emptyTitle}>{t('categories.emptyTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('categories.emptySubtitle')}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => openAdd()}>
                <Text style={styles.emptyBtnText}>{t('categories.addTitle')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(cat) => String(cat.id)}
          renderItem={({ item }) => renderGroup(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand.primary}
            />
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}

      <AddEditCategoryModal
        visible={showAddEdit}
        onClose={() => setShowAddEdit(false)}
        category={editingCategory}
        parentCategory={parentCategory}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg.screen,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical:   spacing.md,
    gap:               8,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    ...textStyles.displayLg,
    color: colors.text.primary,
    flex:  1,
  },
  addBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  spacing.screenPaddingH,
    marginBottom:      spacing.sm,
    backgroundColor:   colors.bg.card,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       colors.border.default,
    paddingHorizontal: 12,
    paddingVertical:   10,
    gap:               8,
  },
  searchIcon: {},
  searchInput: {
    flex:    1,
    ...textStyles.bodyMd,
    color:   colors.text.primary,
    padding: 0,
  },
  listContent: {
    marginHorizontal: spacing.screenPaddingH,
    backgroundColor:  colors.bg.card,
    borderRadius:     12,
    borderWidth:      1,
    borderColor:      colors.border.default,
    overflow:         'hidden',
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.cardPadding,
    paddingVertical:   14,
    backgroundColor:   colors.bg.card,
    gap:               10,
    minHeight:         52,
  },
  rowChild: {
    backgroundColor: colors.bg.surface2,
    minHeight:       46,
  },
  childIndent: {
    width: 12,
  },
  colorDot: {
    width:       10,
    height:      10,
    borderRadius: 5,
    flexShrink:   0,
  },
  rowContent: {
    flex: 1,
  },
  rowName: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  rowMeta: {
    ...textStyles.bodySm,
    color:     colors.text.muted,
    marginTop: 1,
  },
  addSubBtn: {
    width:           24,
    height:          24,
    alignItems:      'center',
    justifyContent:  'center',
  },
  deleteAction: {
    width:           80,
    backgroundColor: colors.expense,
    alignItems:      'center',
    justifyContent:  'center',
  },
  childDivider: {
    height:           1,
    backgroundColor:  colors.border.subtle,
    marginHorizontal: spacing.cardPadding,
  },
  groupDivider: {
    height:          1,
    backgroundColor: colors.border.default,
  },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing.screenPaddingH,
  },
  loadingText: {
    ...textStyles.bodyMd,
    color: colors.text.muted,
  },
  emptyTitle: {
    ...textStyles.headingMd,
    color:        colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...textStyles.bodyMd,
    color:        colors.text.secondary,
    textAlign:    'center',
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor:   colors.brand.primary,
    borderRadius:      10,
    paddingHorizontal: 20,
    paddingVertical:   12,
  },
  emptyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   15,
    color:      '#ffffff',
  },
});
