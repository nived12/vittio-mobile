import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { X, FileText, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  uploadStatementFile,
  getStatementFile,
  retryStatementFile,
  type StatementFile,
} from '../../api/statementFiles';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import { useUIStore } from '../../stores/uiStore';
import type { BankAccount } from '../../api/bankAccounts';

// ── Types ──────────────────────────────────────────────────────────────────

type Step = 'account_selection' | 'uploading' | 'processing' | 'success' | 'error';

interface PickedFile {
  uri: string;
  name: string;
  size: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Pre-select an account (entry from Account Detail) */
  preselectedAccount?: BankAccount;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function lastDayOfPrevMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0);
}

const TERMINAL_STATUSES: StatementFile['status'][] = ['completed', 'parsed', 'error'];
const MAX_POLLS = 40; // 120s

// ── Progress bar ──────────────────────────────────────────────────────────

function UploadProgressBar({ pct }: { pct: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct / 100, duration: 200, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <Animated.View style={[styles.progressFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// ── Shimmer bar ───────────────────────────────────────────────────────────

function ShimmerBar() {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    return () => sweep.stopAnimation();
  }, []);
  return (
    <View style={styles.shimmerTrack}>
      <Animated.View
        style={[
          styles.shimmerFill,
          {
            transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] }) }],
          },
        ]}
      />
    </View>
  );
}

// ── Pulse icon ────────────────────────────────────────────────────────────

function PulseIcon() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    return () => scale.stopAnimation();
  }, []);
  return (
    <Animated.Text style={[styles.largeEmoji, { transform: [{ scale }] }]}>🤖</Animated.Text>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function StatementUploadModal({ visible, onClose, preselectedAccount }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { locale, showToast } = useUIStore();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useBankAccounts();

  const [step, setStep] = useState<Step>('account_selection');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [cutoffDate, setCutoffDate] = useState<Date>(lastDayOfPrevMonth());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [result, setResult] = useState<StatementFile | null>(null);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-select account when provided or when accounts load
  useEffect(() => {
    if (preselectedAccount) {
      setSelectedAccount(preselectedAccount);
    } else if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [preselectedAccount, accounts]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep('account_selection');
      setFile(null);
      setUploadPct(0);
      setResult(null);
      pollCountRef.current = 0;
    } else {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
  }, [visible]);

  // ── File picking ──
  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const sizeBytes = asset.size ?? 0;
      if (sizeBytes > 10 * 1024 * 1024) {
        showToast('El archivo supera los 10 MB', 'error');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFile({ uri: asset.uri, name: asset.name, size: sizeBytes });
    } catch {
      // picker cancelled or error — silent
    }
  }

  // ── Upload ──
  async function handleUpload() {
    if (!file || !selectedAccount) return;
    Keyboard.dismiss();
    setStep('uploading');
    setUploadPct(0);

    try {
      const sf = await uploadStatementFile(
        file.uri,
        file.name,
        selectedAccount.id,
        format(cutoffDate, 'yyyy-MM-dd'),
        (pct) => setUploadPct(pct),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setResult(sf);
      setStep('processing');
      pollCountRef.current = 0;
      schedulePoll(sf.id);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: { code?: string } } } };
      const code = anyErr?.response?.data?.error?.code;
      if (code === 'SUBSCRIPTION_REQUIRED') {
        Alert.alert(t('errors.SUBSCRIPTION_REQUIRED'), '', [{ text: t('common.ok') }]);
      } else {
        showToast(t('errors.generic'), 'error');
      }
      setStep('account_selection');
    }
  }

  // ── Polling ──
  function schedulePoll(id: number) {
    pollTimerRef.current = setTimeout(() => poll(id), 3000);
  }

  async function poll(id: number) {
    pollCountRef.current += 1;
    if (pollCountRef.current > MAX_POLLS) {
      // Timeout
      setStep('error');
      setResult((prev) => prev ? { ...prev, status: 'error', error_message: 'timeout' } : prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      const sf = await getStatementFile(id);
      setResult(sf);
      if (TERMINAL_STATUSES.includes(sf.status)) {
        if (sf.status === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setStep('error');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStep('success');
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      } else {
        schedulePoll(id);
      }
    } catch {
      schedulePoll(id); // retry on network hiccup
    }
  }

  // ── Retry ──
  async function handleRetry() {
    if (!result) return;
    try {
      await retryStatementFile(result.id);
      setStep('processing');
      pollCountRef.current = 0;
      schedulePoll(result.id);
    } catch {
      showToast(t('errors.generic'), 'error');
    }
  }

  // ── Dismiss logic ──
  function handleDismissAttempt() {
    if (step === 'uploading' || step === 'processing') return; // non-dismissable
    if (step === 'account_selection' && file) {
      Alert.alert(
        t('statement_upload.cancel_confirm'),
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.ok'), style: 'destructive', onPress: onClose },
        ],
      );
      return;
    }
    onClose();
  }

  function handleViewTransactions() {
    onClose();
    if (result) {
      router.push(`/(app)/transactions?statement_file_id=${result.id}` as `/(app)/transactions`);
    }
  }

  const dateDisplay = format(cutoffDate, locale === 'es' ? "d 'de' MMMM 'de' yyyy" : 'MMMM d, yyyy');
  const isDismissable = step !== 'uploading' && step !== 'processing';

  // ── Render ──
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isDismissable ? handleDismissAttempt : undefined}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={isDismissable ? handleDismissAttempt : undefined}
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Handle */}
          {isDismissable && <View style={styles.handle} />}

          {/* ── Step: account_selection ── */}
          {step === 'account_selection' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={handleDismissAttempt} hitSlop={12}>
                  <X size={22} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('statement_upload.modal_title')}</Text>
                <View style={{ width: 22 }} />
              </View>

              {/* File card or pick prompt */}
              {file ? (
                <TouchableOpacity
                  style={styles.fileCard}
                  onPress={pickFile}
                  accessibilityLabel={`${t('statement_upload.file_card_label')}: ${file.name}, ${formatBytes(file.size)}`}
                >
                  <View style={styles.fileIconWrap}>
                    <FileText size={24} color="#4f46e5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={2}>{file.name}</Text>
                    <Text style={styles.fileMeta}>{formatBytes(file.size)} · PDF</Text>
                  </View>
                  <Text style={styles.changeFile}>{t('common.edit')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.pickPrompt} onPress={pickFile}>
                  <FileText size={32} color="#818cf8" />
                  <Text style={styles.pickPromptLabel}>{t('statement_upload.pick_file')}</Text>
                  <Text style={styles.pickPromptSub}>PDF · máx 10 MB</Text>
                </TouchableOpacity>
              )}

              {/* Cutoff date */}
              <Text style={styles.sectionLabel}>{t('statement_upload.cutoff_date_label')}</Text>
              <TouchableOpacity
                style={styles.fieldRow}
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
              >
                <Text style={styles.fieldRowText}>{dateDisplay}</Text>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={cutoffDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={(_evt, d) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (d) setCutoffDate(d);
                  }}
                />
              )}

              {/* Account list (collapsed if pre-selected from Account Detail) */}
              {!preselectedAccount && (
                <>
                  <Text style={styles.sectionLabel}>{t('statement_upload.account_question')}</Text>
                  <FlatList
                    data={accounts}
                    keyExtractor={(a) => String(a.id)}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                      const selected = item.id === selectedAccount?.id;
                      return (
                        <TouchableOpacity
                          style={[styles.accountRow, selected && styles.accountRowSelected]}
                          onPress={() => setSelectedAccount(item)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                        >
                          <View style={[styles.radio, selected && styles.radioSelected]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.accountName, selected && { color: '#4f46e5' }]}>
                              {item.custom_name ?? item.name}
                            </Text>
                            <Text style={styles.accountMeta}>{item.account_type} · {item.currency}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    style={styles.accountList}
                  />
                </>
              )}

              {preselectedAccount && (
                <>
                  <Text style={styles.sectionLabel}>{t('statement_upload.account_question')}</Text>
                  <View style={[styles.accountRow, styles.accountRowSelected]}>
                    <View style={[styles.radio, styles.radioSelected]} />
                    <Text style={[styles.accountName, { color: '#4f46e5' }]}>
                      {preselectedAccount.custom_name ?? preselectedAccount.name}
                    </Text>
                  </View>
                </>
              )}

              {/* Info note */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>ℹ️  {t('statement_upload.duplicate_note')}</Text>
              </View>

              {/* Upload button */}
              <TouchableOpacity
                style={[styles.primaryBtn, (!file || !selectedAccount) && styles.primaryBtnDisabled]}
                onPress={handleUpload}
                disabled={!file || !selectedAccount}
              >
                <Text style={styles.primaryBtnLabel}>{t('statement_upload.upload_button')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step: uploading ── */}
          {step === 'uploading' && (
            <View style={styles.centeredStep}>
              <FileText size={48} color="#4f46e5" style={{ marginBottom: 16 }} />
              <Text style={styles.stepTitle}>{t('statement_upload.uploading_title')}</Text>
              {file && <Text style={styles.stepSubtitle} numberOfLines={1}>{file.name}</Text>}
              <View style={{ width: '100%', marginTop: 24 }}>
                <UploadProgressBar pct={uploadPct} />
                <Text style={styles.pctLabel}>{uploadPct}%</Text>
              </View>
              <Text style={styles.hint}>{t('statement_upload.uploading_hint')}</Text>
            </View>
          )}

          {/* ── Step: processing ── */}
          {step === 'processing' && (
            <View style={styles.centeredStep} accessibilityLiveRegion="polite">
              <PulseIcon />
              <Text style={styles.stepTitle}>{t('statement_upload.processing_title')}</Text>
              <Text style={styles.stepSubtitle}>{t('statement_upload.processing_subtitle')}</Text>
              <View style={{ width: '100%', marginTop: 24 }}>
                <ShimmerBar />
              </View>
              <Text style={styles.hint}>{t('statement_upload.processing_wait')}</Text>
            </View>
          )}

          {/* ── Step: success ── */}
          {step === 'success' && result && (
            <View style={styles.centeredStep}>
              <CheckCircle size={64} color="#10b981" style={{ marginBottom: 16 }} />
              <Text style={[styles.stepTitle, { color: '#10b981' }]} accessibilityRole="header">
                {t('statement_upload.success_title')}
              </Text>
              {result.pending_transactions_count > 0 ? (
                <Text style={styles.stepSubtitle}>
                  {t('statement_upload.partial_body', {
                    new: result.transactions_count,
                    dupes: result.pending_transactions_count,
                  })}
                </Text>
              ) : (
                <Text style={styles.stepSubtitle}>
                  {t('statement_upload.success_body', { count: result.transactions_count })}
                </Text>
              )}
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 32 }]} onPress={handleViewTransactions}>
                <Text style={styles.primaryBtnLabel}>{t('statement_upload.view_transactions')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostBtnLabel}>{t('statement_upload.close_button')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step: error ── */}
          {step === 'error' && (
            <View style={styles.centeredStep}>
              <AlertTriangle size={64} color="#f59e0b" style={{ marginBottom: 16 }} />
              <Text style={styles.stepTitle} accessibilityRole="header">
                {result?.error_message === 'timeout'
                  ? t('statement_upload.timeout_message')
                  : t('statement_upload.failure_title')}
              </Text>
              {result?.error_message !== 'timeout' && (
                <Text style={styles.stepSubtitle}>{t('statement_upload.failure_body')}</Text>
              )}
              {result?.error_message !== 'timeout' && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 32 }]}
                  onPress={handleRetry}
                >
                  <ActivityIndicator size="small" color="#fff" style={{ display: 'none' }} />
                  <Text style={styles.primaryBtnLabel}>{t('statement_upload.retry_button')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostBtnLabel}>{t('statement_upload.close_button')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

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
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '95%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: '#0f172a',
  },
  // File card
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginBottom: 16,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1e1b4b',
  },
  fileMeta: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 2,
  },
  changeFile: {
    fontSize: 12,
    color: '#4f46e5',
    fontFamily: 'Inter_500Medium',
  },
  // Pick prompt
  pickPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c7d2fe',
    backgroundColor: '#f5f3ff',
    marginBottom: 16,
    gap: 8,
  },
  pickPromptLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#4f46e5',
  },
  pickPromptSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  // Section label
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  // Date row
  fieldRow: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fieldRowText: {
    fontSize: 15,
    color: '#0f172a',
    flex: 1,
  },
  // Account rows
  accountList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountRowSelected: {
    backgroundColor: 'transparent',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  radioSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  accountName: {
    fontSize: 15,
    color: '#0f172a',
    fontFamily: 'Inter_400Regular',
  },
  accountMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  // Info box
  infoBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  // Buttons
  primaryBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  primaryBtnLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  ghostBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostBtnLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  // Centered step layout (uploading / processing / success / error)
  centeredStep: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  largeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  pctLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 6,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
  // Progress bar
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4f46e5',
  },
  // Shimmer
  shimmerTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  shimmerFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 200,
    backgroundColor: 'rgba(99,102,241,0.5)',
    borderRadius: 4,
  },
});
