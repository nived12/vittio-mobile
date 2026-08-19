import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FileText } from 'lucide-react-native';
import { format } from 'date-fns';
import { es as dateFnsEs } from 'date-fns/locale';
import {
  useDeleteStatementFile,
  useRetryStatementFile,
  useStatementFile,
} from '../../../src/hooks/useStatementFiles';
import { StatementStatusPill } from '../../../src/components/ui/StatementStatusPill';
import { useUIStore } from '../../../src/stores/uiStore';
import { useTheme } from '../../../src/theme/ThemeContext';
import { colors, spacing } from '../../../src/theme';

function formatBytes(bytes: number | null | undefined): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StatementFileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const statementFileId = Number(id);
  const { t } = useTranslation();
  const { locale, showToast } = useUIStore();
  const { theme, isDark } = useTheme();
  const bg = isDark ? theme.background : '#f8fafc';
  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const dividerCol = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const { data: sf, isLoading, isError, refetch } = useStatementFile(statementFileId);
  const deleteMutation = useDeleteStatementFile();
  const retryMutation = useRetryStatementFile();

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  function fmtDate(value: string | null | undefined, withTime = false): string | null {
    if (!value) return null;
    const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    const pattern = locale === 'es'
      ? (withTime ? "d 'de' MMM yyyy, HH:mm" : "d 'de' MMMM 'de' yyyy")
      : (withTime ? 'MMM d, yyyy HH:mm' : 'MMMM d, yyyy');
    return format(d, pattern, locale === 'es' ? { locale: dateFnsEs } : {});
  }

  async function runRetry(pwd?: string) {
    try {
      await retryMutation.mutateAsync({ id: statementFileId, password: pwd });
      showToast(t('statement_files.retryStartedToast'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
  }

  function confirmDelete() {
    if (!sf) return;
    Alert.alert(
      t('statement_files.deleteConfirmTitle'),
      sf.transactions_count === 0
        ? t('statement_files.deleteConfirmMessageNone')
        : t('statement_files.deleteConfirmMessage', { count: sf.transactions_count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(statementFileId);
              showToast(t('statement_files.deletedToast'), 'success');
              router.back();
            } catch {
              showToast(t('common.error'), 'error');
            }
          },
        },
      ],
    );
  }

  function Row({ label, value }: { label: string; value: string | null }) {
    if (!value) return null;
    return (
      <View style={[styles.row, { borderBottomColor: dividerCol }]}>
        <Text style={[styles.rowLabel, { color: textSecondary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: textPrimary }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    );
  }

  const isDone = sf?.status === 'completed' || sf?.status === 'parsed';

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
        <Text style={[styles.title, { color: textPrimary }]}>
          {t('statement_files.detailTitle')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : isError || !sf ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>
            {t('statement_files.errorTitle')}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <View style={[styles.card, { backgroundColor: surface }]}>
            <View style={styles.fileHeader}>
              <View style={styles.fileIcon}>
                <FileText size={22} color={colors.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: textPrimary }]} numberOfLines={3}>
                  {sf.filename ?? t('statement_files.detailTitle')}
                </Text>
                {formatBytes(sf.file_size) && (
                  <Text style={[styles.fileMeta, { color: textSecondary }]}>
                    {formatBytes(sf.file_size)} · PDF
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.pillWrap}>
              <StatementStatusPill status={sf.status} large />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: surface }]}>
            <Row label={t('statement_files.bankAccount')} value={sf.bank_account.display_name} />
            <Row label={t('statement_upload.cutoff_date_label')} value={fmtDate(sf.cutoff_date)} />
            <Row label={t('statement_files.periodStart')} value={fmtDate(sf.period_start)} />
            <Row label={t('statement_files.uploadedAt')} value={fmtDate(sf.created_at, true)} />
            <Row label={t('statement_files.processedAt')} value={fmtDate(sf.processed_at, true)} />
            <Row
              label={t('statement_files.transactionsImported')}
              value={isDone ? String(sf.transactions_count) : null}
            />
            <Row
              label={t('statement_files.pendingReview')}
              value={sf.pending_transactions_count > 0 ? String(sf.pending_transactions_count) : null}
            />
          </View>

          {sf.status === 'error' && (
            <View style={[styles.card, { backgroundColor: surface }]}>
              <Text style={[styles.errorText, { color: '#e11d48' }]}>
                {sf.error_message ?? t('statement_upload.errors.processing.body')}
              </Text>
              <TouchableOpacity
                style={styles.primaryBtnStretch}
                accessibilityRole="button"
                onPress={() => {
                  if (sf.password_required) {
                    setPassword('');
                    setShowPassword(true);
                  } else {
                    runRetry();
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>{t('statement_upload.retry_button')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isDone && (
            <TouchableOpacity
              style={[styles.primaryBtnStretch, { marginHorizontal: spacing.md }]}
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  `/(app)/transactions?statement_file_id=${sf.id}` as `/(app)/transactions`,
                )
              }
            >
              <Text style={styles.primaryBtnText}>
                {t('statement_files.viewTransactions', { count: sf.transactions_count })}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} accessibilityRole="button">
            <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={showPassword} transparent animationType="fade">
        <View style={styles.promptOverlay}>
          <View style={[styles.promptCard, { backgroundColor: surface }]}>
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
            />
            <View style={styles.promptActions}>
              <TouchableOpacity style={styles.promptBtn} onPress={() => setShowPassword(false)}>
                <Text style={[styles.promptBtnText, { color: textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptBtn}
                disabled={password.length === 0}
                onPress={() => {
                  setShowPassword(false);
                  runRetry(password);
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
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.md, textAlign: 'center' },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  fileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.md },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: 'rgba(79,70,229,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { fontSize: 15, fontWeight: '600' },
  fileMeta: { fontSize: 13, marginTop: 2 },
  pillWrap: { flexDirection: 'row', paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14, flexShrink: 0 },
  rowValue: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  errorText: { fontSize: 14, paddingVertical: spacing.md },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnStretch: {
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  deleteBtn: { alignItems: 'center', paddingVertical: spacing.lg },
  deleteBtnText: { color: '#e11d48', fontWeight: '600', fontSize: 15 },
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
