import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCreateCategory, useUpdateCategory } from '../../hooks/useCategories';
import { useUIStore } from '../../stores/uiStore';
import { colors, spacing, textStyles } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import type { Category } from '../../api/categories';

// ── Constants ─────────────────────────────────────────────────────────────

// Common Lucide icon names for categories
const ICON_OPTIONS = [
  'shopping-cart', 'utensils', 'car', 'home', 'heart-pulse',
  'graduation-cap', 'briefcase', 'plane', 'gamepad-2', 'shirt',
  'coffee', 'wifi', 'zap', 'droplets', 'phone',
  'music', 'book', 'dumbbell', 'baby', 'gift',
  'landmark', 'wallet', 'piggy-bank', 'trending-up', 'receipt',
  'tag', 'star', 'circle-help', 'layers', 'folder',
];

const COLOR_OPTIONS = [
  '#4f46e5', // indigo
  '#7c3aed', // violet
  '#db2777', // pink
  '#dc2626', // red
  '#d97706', // amber
  '#16a34a', // green
  '#0891b2', // cyan
  '#2563eb', // blue
  '#9333ea', // purple
  '#c2410c', // orange
  '#065f46', // emerald dark
  '#374151', // gray
];

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  /** If provided, opens in edit mode pre-filled with this category */
  category?: Category;
  /** Optional parent category for creating a subcategory */
  parentCategory?: Category;
}

// ── Component ─────────────────────────────────────────────────────────────

export function AddEditCategoryModal({ visible, onClose, category, parentCategory }: Props) {
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? (theme as any).surface         : '#ffffff';
  const inputBg       = isDark ? (theme as any).surfaceElevated : '#f1f5f9';
  const textPrimary   = isDark ? (theme as any).textPrimary     : '#0f172a';
  const textSecondary = isDark ? (theme as any).textSecondary   : '#64748b';
  const borderCol     = isDark ? (theme as any).border          : '#e2e8f0';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showToast } = useUIStore();
  const isEditMode = Boolean(category);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(category?.id ?? 0);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('tag');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (category) {
      setName(category.name);
      setSelectedIcon(category.icon ?? 'tag');
      setSelectedColor(category.color ?? COLOR_OPTIONS[0]);
    } else {
      setName('');
      setSelectedIcon('tag');
      setSelectedColor(COLOR_OPTIONS[0]);
    }
    setHasAttemptedSave(false);
  }, [visible, category]);

  const nameError = hasAttemptedSave && name.trim().length === 0;

  const handleSave = async () => {
    setHasAttemptedSave(true);
    if (name.trim().length === 0) return;
    Keyboard.dismiss();

    const body = {
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      ...(parentCategory ? { parent_id: parentCategory.id } : {}),
    };

    try {
      if (isEditMode && category) {
        await updateMutation.mutateAsync(body);
        showToast(t('categories.updatedToast'), 'success');
      } else {
        await createMutation.mutateAsync(body);
        showToast(t('categories.createdToast'), 'success');
      }
      onClose();
    } catch {
      showToast(t('common.error'), 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: sheetBg }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.neutral[300] }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {isEditMode ? t('categories.editTitle') : t('categories.addTitle')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {parentCategory && (
            <View style={styles.parentBadge}>
              <Text style={styles.parentBadgeText}>
                {t('categories.subcategoryOf', { name: parentCategory.name })}
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name field */}
            <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('categories.nameLabel')}</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }, nameError && styles.textInputError]}
              value={name}
              onChangeText={setName}
              placeholder={t('categories.namePlaceholder')}
              placeholderTextColor={textSecondary}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            {nameError && (
              <Text style={styles.errorText}>{t('categories.nameRequired')}</Text>
            )}

            {/* Color picker */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.md, color: textSecondary }]}>{t('categories.colorLabel')}</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSwatchSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedColor(c);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedColor === c }}
                />
              ))}
            </View>

            {/* Icon picker */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.md, color: textSecondary }]}>{t('categories.iconLabel')}</Text>
            <Text style={[styles.iconHint, { color: textSecondary }]}>{t('categories.iconHint')}</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconCell,
                    { backgroundColor: inputBg, borderColor: borderCol },
                    selectedIcon === icon && { backgroundColor: selectedColor + '22', borderColor: selectedColor },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedIcon(icon);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedIcon === icon }}
                >
                  <Text style={[styles.iconText, { color: textSecondary }, selectedIcon === icon && { color: selectedColor }]}>
                    {icon.split('-').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            <View style={[styles.preview, { backgroundColor: inputBg }]}>
              <View style={[styles.previewDot, { backgroundColor: selectedColor }]} />
              <Text style={[styles.previewName, { color: textPrimary }]}>{name || t('categories.namePlaceholder')}</Text>
            </View>

            <View style={{ height: spacing.lg }} />
          </ScrollView>

          {/* Save button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>
                {isSaving
                  ? t('common.loading')
                  : isEditMode
                  ? t('categories.saveChangesButton')
                  : t('categories.saveButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    justifyContent:  'flex-end',
    backgroundColor: colors.bg.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bg.card,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    maxHeight:            '85%',
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.neutral[300],
    alignSelf:       'center',
    marginTop:       10,
    marginBottom:    4,
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...textStyles.headingLg,
    color: colors.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  parentBadge: {
    marginHorizontal: spacing.screenPaddingH,
    marginBottom:     spacing.sm,
    backgroundColor:  colors.brand.primaryLight,
    borderRadius:     6,
    paddingHorizontal: 10,
    paddingVertical:  4,
    alignSelf:        'flex-start',
  },
  parentBadgeText: {
    ...textStyles.bodySm,
    color: colors.brand.primary,
  },
  scroll: {
    paddingHorizontal: spacing.screenPaddingH,
  },
  fieldLabel: {
    ...textStyles.label,
    color:        colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.bg.surface2,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border.default,
    paddingHorizontal: 14,
    paddingVertical:   12,
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  textInputError: {
    borderColor: colors.border.error,
    backgroundColor: colors.error.bg,
  },
  errorText: {
    ...textStyles.bodySm,
    color:     colors.expense,
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
    marginTop:     4,
  },
  colorSwatch: {
    width:        36,
    height:       36,
    borderRadius: 18,
    borderWidth:  2,
    borderColor:  'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.text.primary,
    transform:   [{ scale: 1.15 }],
  },
  iconHint: {
    ...textStyles.bodySm,
    color:        colors.text.muted,
    marginBottom: spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
    marginTop:      4,
  },
  iconCell: {
    width:           44,
    height:          44,
    borderRadius:    10,
    backgroundColor: colors.bg.surface2,
    borderWidth:     1,
    borderColor:     colors.border.default,
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconText: {
    fontFamily: 'Inter_700Bold',
    fontSize:   11,
    color:      colors.text.secondary,
  },
  preview: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            10,
    marginTop:     spacing.md,
    padding:       spacing.cardPadding,
    backgroundColor: colors.bg.surface2,
    borderRadius:  10,
  },
  previewDot: {
    width:        14,
    height:       14,
    borderRadius:  7,
  },
  previewName: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  footer: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop:        spacing.sm,
    paddingBottom:     spacing.xs,
  },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius:    12,
    paddingVertical: 15,
    alignItems:      'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   16,
    color:      '#ffffff',
  },
});
