import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { ChevronLeft, FileText, Upload } from 'lucide-react-native';
import { Trash } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es as dateFnsEs } from 'date-fns/locale';
import {
  useDeleteStatementFile,
  useRetryStatementFile,
  useStatementFiles,
} from '../../src/hooks/useStatementFiles';
import { useUIStore } from '../../src/stores/uiStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, spacing } from '../../src/theme';
import type { StatementFile } from '../../src/api/statementFiles';

// ── Status pill ────────────────────────────────────────────────────────────

const STATUS_TINT: Record<StatementFile['status'], string> = {
  pending: '#f59e0b',
  processing: '#4f46e5',
  parsed: '#10b981',
  completed: '#10b981',
  error: '#e11d48',
};

function StatusPill({ status }: { status: StatementFile['status'] }) {
  const { t } = useTranslation();
  const tint = STATUS_TINT[status];
  const busy = status === 'pending' || status === 'processing';
  return (
    <View style={[styles.pill, { backgroundColor: `${tint}1a` }]}>
      {busy && <ActivityIndicator size="small" color={tint} style={styles.pillSpinner} />}
      <Text style={[styles.pillText, { color: tint }]}>
        {t(`statement_files.status.${status}`)}
      </Text>
    </View>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  sf: StatementFile;
  onPress: (sf: StatementFile) => void;
  onDelete: (sf: StatementFile) => void;
}

function StatementFileRow({ sf, onPress, onDelete }: RowProps) {
  const { t } = useTranslation();
  const { locale } = useUIStore();
  const { theme, isDark } = useTheme();
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const rowBg = isDark ? theme.surface : '#ffffff';
  const swipeableRef = useRef<Swipeable>(null);

  const cutoff = sf.cutoff_date
    ? format(
        new Date(`${sf.cutoff_date}T00:00:00`),
        locale === 'es' ? "d 'de' MMM yyyy" : 'MMM d, yyyy',
        locale === 'es' ? { locale: dateFnsEs } : {},
      )
    : null;

  function handleDeletePress() {
    swipeableRef.current?.close();
    Alert.alert(
      t('statement_files.deleteConfirmTitle'),
      // Deleting the file also deletes the transactions it imported — say so,
      // because that is not what "delete file" normally implies.
      sf.transactions_count === 0
        ? t('statement_files.deleteConfirmMessageNone')
        : t('statement_files.deleteConfirmMessage', { count: sf.transactions_count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            onDelete(sf);
          },
        },
      ],
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={handleDeletePress}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
        >
          <Trash size={22} color="#ffffff" weight="bold" />
        </TouchableOpacity>
      )}
      friction={2}
      rightThreshold={80}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }}
    >
      <TouchableOpacity
        style={[styles.row, { backgroundColor: rowBg }]}
        onPress={() => onPress(sf)}
        accessibilityRole="button"
      >
        <View style={styles.rowIcon}>
          <FileText size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: textPrimary }]} numberOfLines={1}>
            {sf.bank_account.display_name}
          </Text>
          <Text style={[styles.rowMeta, { color: textSecondary }]} numberOfLines={1}>
            {[cutoff, t('statement_files.transactionCount', { count: sf.transactions_count })]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <StatusPill status={sf.status} />
      </TouchableOpacity>
    </Swipeable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function StatementFilesScreen() {
  const { t } = useTranslation();
  const { showToast, openStatementUpload } = useUIStore();
  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.background : '#f8fafc';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStatementFiles();
  const deleteMutation = useDeleteStatementFile();
  const retryMutation = useRetryStatementFile();

  const [passwordFor, setPasswordFor] = useState<StatementFile | null>(null);
  const [password, setPassword] = useState('');

  const statementFiles = useMemo(
    () => data?.pages.flatMap((p) => p.data.statement_files) ?? [],
    [data],
  );

  async function handleDelete(sf: StatementFile) {
    try {
      await deleteMutation.mutateAsync(sf.id);
      showToast(t('statement_files.deletedToast'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  async function runRetry(sf: StatementFile, pwd?: string) {
    try {
      await retryMutation.mutateAsync({ id: sf.id, password: pwd });
      showToast(t('statement_files.retryStartedToast'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  function handleRowPress(sf: StatementFile) {
    if (sf.status === 'error') {
      if (sf.password_required) {
        setPassword('');
        setPasswordFor(sf);
        return;
      }
      Alert.alert(
        t('statement_files.retryTitle'),
        sf.error_message ?? t('statement_upload.errors.processing.body'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('statement_upload.retry_button'), onPress: () => runRetry(sf) },
        ],
      );
      return;
    }
    if (sf.status === 'completed' || sf.status === 'parsed') {
      router.push(
        `/(app)/transactions?statement_file_id=${sf.id}` as `/(app)/transactions`,
      );
    }
    // pending/processing rows are not actionable — the pill already says why.
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textPrimary }]}>{t('statement_files.title')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => openStatementUpload()}
          accessibilityRole="button"
          accessibilityLabel={t('statement_upload.modal_title')}
        >
          <Upload size={22} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>
            {t('statement_files.errorTitle')}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
            <Text style={styles.primaryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : statementFiles.length === 0 ? (
        <View style={styles.center}>
          <FileText size={48} color="#818cf8" style={{ marginBottom: spacing.md }} />
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>
            {t('statement_files.emptyTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
            {t('statement_files.emptySubtitle')}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openStatementUpload()}>
            <Text style={styles.primaryBtnText}>{t('statement_upload.upload_button')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={statementFiles}
          keyExtractor={(sf) => String(sf.id)}
          renderItem={({ item }) => (
            <StatementFileRow sf={item} onPress={handleRowPress} onDelete={handleDelete} />
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.divider, { backgroundColor: dividerCol }]} />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={textSecondary} />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.brand.primary} />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}

      {/* PDF password prompt — Alert.prompt is iOS-only, so this covers both. */}
      <Modal visible={passwordFor !== null} transparent animationType="fade">
        <View style={styles.promptOverlay}>
          <View style={[styles.promptCard, { backgroundColor: isDark ? theme.surface : '#ffffff' }]}>
            <Text style={[styles.promptTitle, { color: textPrimary }]}>
              {t('statement_files.passwordTitle')}
            </Text>
            <Text style={[styles.promptBody, { color: textSecondary }]}>
              {t('statement_files.passwordBody')}
            </Text>
            <TextInput
              style={[styles.promptInput, { color: textPrimary, borderColor: isDark ? theme.border : '#e2e8f0' }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={textSecondary}
            />
            <View style={styles.promptActions}>
              <TouchableOpacity style={styles.promptBtn} onPress={() => setPasswordFor(null)}>
                <Text style={[styles.promptBtnText, { color: textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptBtn}
                disabled={password.length === 0}
                onPress={() => {
                  const target = passwordFor;
                  setPasswordFor(null);
                  if (target) runRetry(target, password);
                }}
              >
                <Text
                  style={[
                    styles.promptBtnText,
                    { color: password.length === 0 ? textSecondary : colors.brand.primary },
                  ]}
                >
                  {t('statement_upload.retry_button')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(79,70,229,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginLeft: 68 },
  deleteAction: {
    backgroundColor: '#e11d48',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillSpinner: { marginRight: 6, transform: [{ scale: 0.7 }] },
  pillText: { fontSize: 12, fontWeight: '600' },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  promptCard: { width: '100%', borderRadius: 16, padding: spacing.lg },
  promptTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  promptBody: { fontSize: 14, marginBottom: spacing.md },
  promptInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  promptActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md, gap: spacing.md },
  promptBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  promptBtnText: { fontSize: 15, fontWeight: '600' },
});
