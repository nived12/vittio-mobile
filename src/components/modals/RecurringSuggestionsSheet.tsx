import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../theme/ThemeContext';
import type { RecurringSuggestion } from '../../api/transactions';
import { AddEditTransactionModal } from './AddEditTransactionModal';

interface Props {
  visible: boolean;
  suggestions: RecurringSuggestion[];
  onClose: () => void;
}

interface PrefillData {
  amount: number;
  description: string;
  merchant: string;
  suggestedCategoryId: number | null;
}

export function RecurringSuggestionsSheet({ visible, suggestions, onClose }: Props) {
  const { theme, isDark } = useTheme();
  const sheetBg = isDark ? (theme as any).surface : '#ffffff';
  const inputBg = isDark ? (theme as any).surfaceElevated : '#f1f5f9';
  const textPrimary = isDark ? (theme as any).textPrimary : '#0f172a';
  const textSecondary = isDark ? (theme as any).textSecondary : '#64748b';
  const borderCol = isDark ? (theme as any).border : '#e2e8f0';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { locale } = useUIStore();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  const dateLocale = locale === 'es' ? es : enUS;

  const handleAdd = (suggestion: RecurringSuggestion) => {
    setPrefillData({
      amount: suggestion.amount,
      description: suggestion.merchant,
      merchant: suggestion.merchant,
      suggestedCategoryId: suggestion.suggested_category_id,
    });
    setAddModalVisible(true);
  };

  const handleAddModalClose = (merchantKey?: string) => {
    setAddModalVisible(false);
    if (merchantKey) {
      setAddedIds((prev) => new Set([...prev, merchantKey]));
    }
  };

  const formatFrequency = (suggestion: RecurringSuggestion) => {
    const lastDate = format(parseISO(suggestion.last_seen), 'dd MMM yyyy', { locale: dateLocale });
    return t('aiInput.recurring.frequency', {
      days: suggestion.frequency_days,
      date: lastDate,
    });
  };

  const avatarLetter = (merchant: string) => merchant.charAt(0).toUpperCase();

  const renderCard = ({ item }: { item: RecurringSuggestion }) => {
    const key = item.merchant.toLowerCase().trim();
    const added = addedIds.has(key);

    return (
      <View style={[styles.card, { backgroundColor: inputBg, borderColor: borderCol }, added && styles.cardDimmed]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter(item.merchant)}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={[styles.merchantName, { color: textPrimary }]} numberOfLines={1}>
              {item.merchant}
            </Text>
            <Text style={[styles.amount, { color: textPrimary }]}>
              {new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-MX', {
                style: 'currency',
                currency: 'MXN',
              }).format(item.amount)}
            </Text>
          </View>
          <Text style={[styles.frequency, { color: textSecondary }]} numberOfLines={1}>
            {formatFrequency(item)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, added && styles.addBtnDone, added && { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4' }]}
          onPress={() => !added && handleAdd(item)}
          disabled={added}
          accessibilityLabel={t('aiInput.recurring.addButton')}
        >
          {added ? (
            <Ionicons name="checkmark" size={16} color="#10b981" />
          ) : (
            <Text style={styles.addBtnText}>{t('aiInput.recurring.addButton')}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: sheetBg }]}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0' }]} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: dividerCol }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: textPrimary }]}>{t('aiInput.recurring.sheetTitle')}</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>{t('aiInput.recurring.sheetSubtitle')}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {suggestions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="repeat-outline" size={40} color={textSecondary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t('aiInput.recurring.emptyTitle')}</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{t('aiInput.recurring.emptySubtitle')}</Text>
              </View>
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.merchant}
                renderItem={renderCard}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Add transaction modal pre-filled from suggestion */}
      <AddEditTransactionModal
        visible={addModalVisible}
        onClose={() => {
          const key = prefillData?.merchant.toLowerCase().trim();
          handleAddModalClose(key);
        }}
        prefill={prefillData ? {
          amount: prefillData.amount,
          description: prefillData.description,
          merchant: prefillData.merchant,
          transaction_type: 'variable_expense',
          category_id: prefillData.suggestedCategoryId ?? undefined,
        } : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardDimmed: {
    opacity: 0.6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  frequency: {
    fontSize: 12,
    color: '#64748b',
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  addBtnDone: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4f46e5',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
