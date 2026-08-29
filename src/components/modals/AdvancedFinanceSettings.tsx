import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeContext';
import type { Category } from '../../api/categories';
import type { BankAccount } from '../../api/bankAccounts';
import type { CalcRule, CalculationSettings } from '../../api/financeShared';

const ACCENT = '#4f46e5';
const CALC_ROWS = ['income', 'expense', 'transfer_in', 'transfer_out'] as const;
const CALC_OPTIONS: CalcRule[] = ['positive', 'negative', 'ignore'];

type ChoiceItem = { id: number; label: string; depth: number };

interface Props {
  variant: 'saving' | 'debt';
  categories: Category[];
  selectedCategoryIds: number[];
  onChangeCategoryIds: (ids: number[]) => void;
  bankAccounts: BankAccount[];
  selectedBankAccountIds: number[];
  onChangeBankAccountIds: (ids: number[]) => void;
  autoSync: boolean;
  onChangeAutoSync: (v: boolean) => void;
  calc: CalculationSettings;
  onChangeCalc: (next: CalculationSettings) => void;
  autoSyncError?: string | null;
}

export function AdvancedFinanceSettings({
  variant,
  categories,
  selectedCategoryIds,
  onChangeCategoryIds,
  bankAccounts,
  selectedBankAccountIds,
  onChangeBankAccountIds,
  autoSync,
  onChangeAutoSync,
  calc,
  onChangeCalc,
  autoSyncError,
}: Props) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  const [expanded, setExpanded] = useState(autoSync);

  // Open whenever auto-sync is on. This panel holds the rules that decide what
  // auto-sync actually does, and leaving them collapsed is how a record ends up
  // syncing nothing. The effect is required, not just the initial value: the edit
  // modal loads the record in its own effect, so autoSync is still false on the
  // first render and seeding from it alone never fires.
  useEffect(() => {
    if (autoSync) setExpanded(true);
  }, [autoSync]);

  const calcNs = variant === 'debt' ? 'debts' : 'savings';

  const categoryItems: ChoiceItem[] = useMemo(() => {
    const rows: ChoiceItem[] = [];
    for (const parent of categories) {
      rows.push({ id: parent.id, label: parent.name, depth: 0 });
      for (const child of parent.children ?? []) rows.push({ id: child.id, label: child.name, depth: 1 });
    }
    return rows;
  }, [categories]);

  const bankItems: ChoiceItem[] = useMemo(
    () => bankAccounts.map((a) => ({ id: a.id, label: a.custom_name || a.name, depth: 0 })),
    [bankAccounts],
  );

  function toggle() {
    Haptics.selectionAsync().catch(() => {});
    setExpanded((v) => !v);
  }

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.header} onPress={toggle} activeOpacity={0.7} accessibilityRole="button">
        <Text style={[s.headerText, { color: textPrimary }]}>{t('advancedSettings.title')}</Text>
        <ChevronDown
          size={20}
          color={textSecondary}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{ gap: 16 }}>
          <InlineMultiSelect
            label={t('advancedSettings.categories')}
            placeholder={t('advancedSettings.selectCategories')}
            items={categoryItems}
            selectedIds={selectedCategoryIds}
            onChange={onChangeCategoryIds}
          />

          <InlineMultiSelect
            label={t('advancedSettings.bankAccounts')}
            placeholder={t('advancedSettings.selectBankAccounts')}
            items={bankItems}
            selectedIds={selectedBankAccountIds}
            onChange={onChangeBankAccountIds}
          />

          {/* Auto-sync */}
          <View>
            <View style={s.switchRow}>
              <Text style={[s.fieldLabel, { color: textSecondary }]}>{t('advancedSettings.autoSync')}</Text>
              <Switch
                value={autoSync}
                onValueChange={(v) => { Haptics.selectionAsync().catch(() => {}); onChangeAutoSync(v); }}
                trackColor={{ false: borderCol, true: ACCENT }}
                thumbColor="#ffffff"
              />
            </View>
            <Text style={[s.help, { color: textSecondary }]}>{t('advancedSettings.autoSyncHelp')}</Text>
            {autoSyncError ? <Text style={s.errorText}>{autoSyncError}</Text> : null}
          </View>

          {/* Calculation settings */}
          <View>
            <Text style={[s.fieldLabel, { color: textSecondary }]}>{t('advancedSettings.calcTitle')}</Text>
            <Text style={[s.help, { color: textSecondary, marginBottom: 8 }]}>{t('advancedSettings.calcHelp')}</Text>
            {CALC_ROWS.map((row) => (
              <View key={row} style={{ marginTop: 10 }}>
                <Text style={[s.rowLabel, { color: textPrimary }]}>
                  {t(`advancedSettings.rows.${row}`)}
                </Text>
                <View style={[s.segGroup, { backgroundColor: inputBg }]}>
                  {CALC_OPTIONS.map((opt) => {
                    const active = (calc[row] ?? 'ignore') === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[s.segOpt, active && s.segOptActive]}
                        onPress={() => { Haptics.selectionAsync().catch(() => {}); onChangeCalc({ ...calc, [row]: opt }); }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[s.segText, { color: textSecondary }, active && s.segTextActive]} numberOfLines={1}>
                          {t(`${calcNs}.calcOptions.${opt}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Inline multi-select (categories / bank accounts) ─────────────────────────

function InlineMultiSelect({
  label,
  placeholder,
  items,
  selectedIds,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: ChoiceItem[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const inputBg = isDark ? theme.surfaceElevated : '#f1f5f9';
  const borderCol = isDark ? theme.border : '#e2e8f0';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  const summary =
    selectedIds.length === 0
      ? placeholder
      : t('advancedSettings.selectedCount', { count: selectedIds.length });

  function toggleId(id: number) {
    Haptics.selectionAsync().catch(() => {});
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <View>
      <Text style={[s.fieldLabel, { color: textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[s.selectBtn, { backgroundColor: inputBg, borderColor: borderCol }]}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); setOpen((v) => !v); }}
        activeOpacity={0.7}
      >
        <Text style={[s.selectSummary, { color: selectedIds.length ? textPrimary : '#94a3b8' }]} numberOfLines={1}>
          {summary}
        </Text>
        <ChevronDown size={18} color="#94a3b8" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>

      {open && (
        <View style={[s.panel, { borderColor: borderCol }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('advancedSettings.search')}
            placeholderTextColor="#94a3b8"
            style={[s.search, { color: textPrimary, borderBottomColor: borderCol }]}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.optRow, { paddingLeft: 12 + item.depth * 18 }]}
                  onPress={() => toggleId(item.id)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                >
                  <View style={[s.checkbox, { borderColor: checked ? ACCENT : borderCol, backgroundColor: checked ? ACCENT : 'transparent' }]}>
                    {checked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <Text style={[s.optText, { color: item.depth > 0 ? textSecondary : textPrimary }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  headerText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  help: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#e11d48', marginTop: 4 },
  selectBtn: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectSummary: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },
  panel: { marginTop: 6, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  search: { paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Inter_400Regular', fontSize: 15, borderBottomWidth: 1 },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: 12, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  rowLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 6 },
  segGroup: { flexDirection: 'row', borderRadius: 8, padding: 3, gap: 3 },
  segOpt: { flex: 1, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segOptActive: { backgroundColor: ACCENT },
  segText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  segTextActive: { color: '#ffffff' },
});
