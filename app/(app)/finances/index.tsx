import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plus, Upload } from 'lucide-react-native';
import i18n from '../../../src/i18n';
import { useAuthStore } from '../../../src/stores/authStore';
import { useUIStore } from '../../../src/stores/uiStore';
import { useSavings } from '../../../src/hooks/useSavings';
import { useDebts } from '../../../src/hooks/useDebts';
import { useGoals } from '../../../src/hooks/useGoals';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AddEditSavingModal } from '../../../src/components/modals/AddEditSavingModal';
import { AddEditDebtModal } from '../../../src/components/modals/AddEditDebtModal';
import { AddEditGoalModal } from '../../../src/components/modals/AddEditGoalModal';
import type { Saving } from '../../../src/api/savings';
import type { Debt } from '../../../src/api/debts';
import type { Goal } from '../../../src/api/goals';

// ── Helpers ────────────────────────────────────────────────────────────────

type Segment = 'savings' | 'debts' | 'goals';

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={[skStyles.circle40, { backgroundColor: '#e2e8f0' }]} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <View style={[skStyles.bar, { width: 140, height: 16 }]} />
        <View style={[skStyles.bar, { width: 80, height: 14 }]} />
        <View style={[skStyles.bar, { width: '100%', height: 4 }]} />
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 8,
  },
  circle40: { width: 40, height: 40, borderRadius: 20 },
  bar: { backgroundColor: '#e2e8f0', borderRadius: 4 },
});

// ── SavingsList ────────────────────────────────────────────────────────────

function SavingsList({
  onAdd,
}: {
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const { data: savings, isLoading, isError, refetch } = useSavings();

  return (
    <View style={{ flex: 1 }}>
      {/* List header */}
      <View style={listStyles.listHeader}>
        <Text style={listStyles.listTitle}>{t('savings.title')}</Text>
        <TouchableOpacity
          onPress={onAdd}
          style={listStyles.addBtn}
          accessibilityLabel={t('savings.addButton')}
          accessibilityRole="button"
        >
          <Plus size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          iconColor="#cbd5e1"
          title={t('savings.error.title')}
          ctaLabel={t('common.retry')}
          ctaVariant="primary"
          onCta={() => refetch()}
        />
      ) : !savings || savings.length === 0 ? (
        <EmptyState
          icon="piggy-bank"
          iconColor="#c7d2fe"
          title={t('savings.empty.title')}
          subtitle={t('savings.empty.subtitle')}
          ctaLabel={t('savings.empty.cta')}
          ctaVariant="primary"
          onCta={onAdd}
        />
      ) : (
        <FlatList
          data={savings}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <SavingCard saving={item} locale={displayLocale} />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

function SavingCard({ saving, locale }: { saving: Saving; locale: string }) {
  const { t } = useTranslation();
  const days = daysUntil(saving.target_date);

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={() => router.push(`/(app)/finances/savings/${saving.id}` as `/(app)/finances/savings/${string}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {/* Row 1 */}
      <View style={cardStyles.row1}>
        <View style={[cardStyles.iconCircle, { backgroundColor: saving.color }]}>
          <Text style={cardStyles.iconText}>💰</Text>
        </View>
        <View style={cardStyles.centerInfo}>
          <Text style={cardStyles.name} numberOfLines={1}>{saving.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <StatusBadge status={saving.status} type="saving" />
            {days !== null && (
              <Text style={[cardStyles.daysText, days <= 30 && { color: '#d97706' }]}>
                {days > 0
                  ? t('savings.daysLeft', { count: days })
                  : days === 0
                    ? t('savings.daysLeft', { count: 0 })
                    : t('savings.daysLeft', { count: 0 })}
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
          <Text style={[cardStyles.pct, { color: saving.color }]}>
            {saving.progress_percentage}%
          </Text>
          <ChevronRight size={16} color="#cbd5e1" />
        </View>
      </View>

      {/* Row 2 — Progress bar */}
      <View style={[cardStyles.track, { marginTop: 10 }]}>
        <View
          style={[
            cardStyles.fill,
            {
              backgroundColor: saving.color,
              width: `${Math.min(saving.progress_percentage, 100)}%` as unknown as number,
              minWidth: 4,
            },
          ]}
        />
      </View>

      {/* Row 3 — Amounts */}
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
        <Text style={cardStyles.amtText}>{formatCurrency(saving.current_amount, locale)}</Text>
        <Text style={[cardStyles.amtText, { color: '#94a3b8' }]}>/</Text>
        <Text style={cardStyles.amtText}>{formatCurrency(saving.target_amount, locale)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── DebtsList ──────────────────────────────────────────────────────────────

function DebtsList({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const locale = useUIStore((s) => s.locale);
  const displayLocale = locale === 'es' ? 'es-MX' : 'en-MX';
  const { data: debts, isLoading, isError, refetch } = useDebts();

  return (
    <View style={{ flex: 1 }}>
      <View style={listStyles.listHeader}>
        <Text style={listStyles.listTitle}>{t('debts.title')}</Text>
        <TouchableOpacity
          onPress={onAdd}
          style={listStyles.addBtn}
          accessibilityLabel={t('debts.addButton')}
          accessibilityRole="button"
        >
          <Plus size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          iconColor="#cbd5e1"
          title={t('debts.error.title')}
          ctaLabel={t('common.retry')}
          ctaVariant="primary"
          onCta={() => refetch()}
        />
      ) : !debts || debts.length === 0 ? (
        <EmptyState
          icon="credit-card"
          iconColor="#c7d2fe"
          title={t('debts.empty.title')}
          subtitle={t('debts.empty.subtitle')}
          ctaLabel={t('debts.empty.cta')}
          ctaVariant="primary"
          onCta={onAdd}
        />
      ) : (
        <FlatList
          data={debts}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <DebtCard debt={item} locale={displayLocale} />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

function DebtCard({ debt, locale }: { debt: Debt; locale: string }) {
  const { t } = useTranslation();
  const today = new Date().getDate();
  const isOverdue = Boolean(
    debt.due_day_of_month && today > debt.due_day_of_month && debt.status === 'active',
  );

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={() => router.push(`/(app)/finances/debts/${debt.id}` as `/(app)/finances/debts/${string}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {/* Row 1 */}
      <View style={cardStyles.row1}>
        <View style={[cardStyles.iconCircle, { backgroundColor: debt.color }]}>
          <Text style={cardStyles.iconText}>💳</Text>
        </View>
        <View style={cardStyles.centerInfo}>
          <Text style={cardStyles.name} numberOfLines={1}>{debt.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={cardStyles.daysText}>{debt.progress_percentage}% paid</Text>
            {debt.due_day_of_month !== null && (
              <View
                style={[
                  cardStyles.duePill,
                  isOverdue ? { backgroundColor: '#fee2e2' } : { backgroundColor: '#fef3c7' },
                ]}
              >
                <Text
                  style={[
                    cardStyles.duePillText,
                    isOverdue ? { color: '#e11d48' } : { color: '#b45309' },
                  ]}
                >
                  {t('debts.dueDay', { day: debt.due_day_of_month })}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
          <Text style={[cardStyles.pct, { color: '#e11d48' }]}>
            −{formatCurrency(debt.current_balance, locale)}
          </Text>
          <ChevronRight size={16} color="#cbd5e1" />
        </View>
      </View>

      {/* Row 2 — Progress bar */}
      <View style={[cardStyles.track, { marginTop: 10 }]}>
        <View
          style={[
            cardStyles.fill,
            {
              backgroundColor: debt.color,
              width: `${Math.min(debt.progress_percentage, 100)}%` as unknown as number,
              minWidth: 4,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// ── GoalsList ──────────────────────────────────────────────────────────────

function GoalsList({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const { data: goals, isLoading, isError, refetch } = useGoals();

  return (
    <View style={{ flex: 1 }}>
      <View style={listStyles.listHeader}>
        <Text style={listStyles.listTitle}>{t('goals.title')}</Text>
        <TouchableOpacity
          onPress={onAdd}
          style={listStyles.addBtn}
          accessibilityLabel={t('goals.addButton')}
          accessibilityRole="button"
        >
          <Plus size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      ) : isError ? (
        <EmptyState
          icon="wifi-off"
          iconColor="#cbd5e1"
          title={t('goals.error.title')}
          ctaLabel={t('common.retry')}
          ctaVariant="primary"
          onCta={() => refetch()}
        />
      ) : !goals || goals.length === 0 ? (
        <EmptyState
          icon="target"
          iconColor="#c7d2fe"
          title={t('goals.empty.title')}
          subtitle={t('goals.empty.subtitle')}
          ctaLabel={t('goals.empty.cta')}
          ctaVariant="primary"
          onCta={onAdd}
        />
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => <GoalCard goal={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={() => router.push(`/(app)/finances/goals/${goal.id}` as `/(app)/finances/goals/${string}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {/* Row 1 — Type + strategy */}
      <View style={[cardStyles.row1, { alignItems: 'center' }]}>
        <View
          style={[
            cardStyles.typeBadge,
            goal.goal_type === 'savings_goal'
              ? { backgroundColor: '#e0e7ff' }
              : { backgroundColor: '#ffe4e6' },
          ]}
        >
          <Text
            style={[
              cardStyles.typeBadgeText,
              goal.goal_type === 'savings_goal'
                ? { color: '#3730a3' }
                : { color: '#9f1239' },
            ]}
          >
            {goal.goal_type === 'savings_goal'
              ? t('goals.type.savingsGoal')
              : t('goals.type.debtPayoff')}
          </Text>
        </View>
        {goal.goal_type === 'debt_payoff' && goal.debt_strategy && (
          <View style={[cardStyles.typeBadge, { backgroundColor: '#f1f5f9', marginLeft: 6 }]}>
            <Text style={[cardStyles.typeBadgeText, { color: '#475569' }]}>
              {goal.debt_strategy === 'snowball'
                ? t('goals.strategy.snowball')
                : t('goals.strategy.avalanche')}
            </Text>
          </View>
        )}
        <ChevronRight size={16} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
      </View>

      {/* Row 2 — Name */}
      <Text style={[cardStyles.name, { marginTop: 6 }]} numberOfLines={1}>{goal.name}</Text>

      {/* Row 3 — Progress bar */}
      <View style={[cardStyles.track, { marginTop: 10 }]}>
        <View
          style={[
            cardStyles.fill,
            {
              backgroundColor: goal.color,
              width: `${Math.min(goal.progress_percentage, 100)}%` as unknown as number,
              minWidth: 4,
            },
          ]}
        />
      </View>

      {/* Row 4 — Stats */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <Text
          style={[
            cardStyles.daysText,
            goal.days_remaining <= 30 && goal.days_remaining > 0 ? { color: '#d97706' } : {},
            goal.days_remaining < 0 ? { color: '#e11d48' } : {},
          ]}
        >
          {t('goals.daysLeft', { count: goal.days_remaining })}
        </Text>
        <Text style={[cardStyles.daysText, { color: '#94a3b8' }]}>·</Text>
        <Text style={cardStyles.daysText}>
          {t('goals.percentComplete', { percent: goal.progress_percentage })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ status, type }: { status: string; type: 'saving' | 'debt' }) {
  const { t } = useTranslation();
  const configs: Record<string, { bg: string; text: string; key: string }> = {
    active:    { bg: '#e0e7ff', text: '#3730a3', key: `${type === 'saving' ? 'savings' : 'debts'}.status.active` },
    completed: { bg: '#d1fae5', text: '#065f46', key: 'savings.status.completed' },
    paused:    { bg: '#fef3c7', text: '#92400e', key: `${type === 'saving' ? 'savings' : 'debts'}.status.paused` },
    archived:  { bg: '#f1f5f9', text: '#64748b', key: `${type === 'saving' ? 'savings' : 'debts'}.status.archived` },
    paid_off:  { bg: '#d1fae5', text: '#065f46', key: 'debts.status.archived' },
  };
  const cfg = configs[status] ?? configs['active'];
  return (
    <View style={[cardStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[cardStyles.badgeText, { color: cfg.text }]}>{t(cfg.key)}</Text>
    </View>
  );
}

// ── ProfileBottomSheet ─────────────────────────────────────────────────────

function ProfileBottomSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const insets = useSafeAreaInsets();

  function toggleLanguage(lang: 'en' | 'es') {
    Haptics.selectionAsync();
    setLocale(lang);
    i18n.changeLanguage(lang);
  }

  function handleLogout() {
    Alert.alert(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmMessage'),
      [
        { text: t('profile.logoutCancel'), style: 'cancel' },
        {
          text: t('profile.logoutConfirm'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onClose();
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  function handleUpload() {
    onClose();
    setTimeout(() => openStatementUpload(), 300);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={sheetStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={sheetStyles.handle} />

        {/* User info */}
        <View style={sheetStyles.userRow}>
          <View style={sheetStyles.avatarLg}>
            <Text style={sheetStyles.avatarTextLg}>{getInitials(user?.full_name)}</Text>
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={sheetStyles.userName}>{user?.full_name ?? '—'}</Text>
            <Text style={sheetStyles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        <View style={sheetStyles.divider} />

        {/* Language toggle */}
        <View style={sheetStyles.row}>
          <Text style={sheetStyles.rowLabel}>{t('profile.language')}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {(['en', 'es'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => toggleLanguage(lang)}
                style={[
                  sheetStyles.langPill,
                  locale === lang && sheetStyles.langPillActive,
                ]}
              >
                <Text
                  style={[
                    sheetStyles.langPillText,
                    locale === lang && sheetStyles.langPillTextActive,
                  ]}
                >
                  {lang.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={sheetStyles.divider} />

        {/* Upload statement */}
        <TouchableOpacity style={sheetStyles.row} onPress={handleUpload} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Upload size={20} color="#4f46e5" />
            <Text style={sheetStyles.rowLabel}>{t('profile.statementUpload')}</Text>
          </View>
          <ChevronRight size={16} color="#cbd5e1" />
        </TouchableOpacity>

        <View style={sheetStyles.divider} />

        {/* Log out */}
        <TouchableOpacity
          style={sheetStyles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={t('profile.logout')}
        >
          <Text style={sheetStyles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function FinancesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [activeSegment, setActiveSegment] = useState<Segment>('savings');
  const [showProfile, setShowProfile] = useState(false);
  const [showAddSaving, setShowAddSaving] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const segments: { key: Segment; label: string }[] = [
    { key: 'savings', label: t('finances.tabs.savings') },
    { key: 'debts',   label: t('finances.tabs.debts')   },
    { key: 'goals',   label: t('finances.tabs.goals')   },
  ];

  function handleSegmentPress(key: Segment) {
    Haptics.selectionAsync();
    setActiveSegment(key);
  }

  return (
    <>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Image
            source={require('../../../assets/images/vittio_logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Vittio"
            accessibilityRole="image"
          />
          <TouchableOpacity
            onPress={() => setShowProfile(true)}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel={t('finances.header.profileButton')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Segmented control */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentTrack} accessibilityRole="tablist">
            {segments.map(({ key, label }) => {
              const isActive = activeSegment === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.segmentPill, isActive && styles.segmentPillActive]}
                  onPress={() => handleSegmentPress(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
        >
          {activeSegment === 'savings' && <SavingsList onAdd={() => setShowAddSaving(true)} />}
          {activeSegment === 'debts'   && <DebtsList   onAdd={() => setShowAddDebt(true)}   />}
          {activeSegment === 'goals'   && <GoalsList   onAdd={() => setShowAddGoal(true)}   />}
        </ScrollView>
      </View>

      {/* Modals */}
      <ProfileBottomSheet visible={showProfile} onClose={() => setShowProfile(false)} />
      <AddEditSavingModal visible={showAddSaving} onClose={() => setShowAddSaving(false)} />
      <AddEditDebtModal   visible={showAddDebt}   onClose={() => setShowAddDebt(false)}   />
      <AddEditGoalModal   visible={showAddGoal}   onClose={() => setShowAddGoal(false)}   />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
  },
  logo: { height: 28, width: 120 },
  avatarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#3730a3',
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
  },
  segmentPill: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentPillActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#64748b',
  },
  segmentLabelActive: {
    fontFamily: 'Inter_600SemiBold',
    color: '#4f46e5',
  },
});

const listStyles = StyleSheet.create({
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
    marginBottom: 8,
  },
  listTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#0f172a',
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  centerInfo: { flex: 1, marginLeft: 12 },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#0f172a',
  },
  pct: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  amtText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  duePill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  duePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  daysText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748b',
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
});

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 60,
  },
  avatarLg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#3730a3',
  },
  userName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#0f172a',
  },
  userEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#0f172a',
  },
  langPill: {
    width: 36,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillActive: { backgroundColor: '#4f46e5' },
  langPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#94a3b8',
  },
  langPillTextActive: { color: '#ffffff' },
  logoutBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
  },
  logoutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#e11d48',
  },
});
