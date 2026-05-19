import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { CaretLeft, ClockCounterClockwise, PaperPlaneTilt, Plus, Sparkle, Trash } from 'phosphor-react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, spacing, textStyles } from '../../src/theme';
import {
  AssistantConversation,
  AssistantUsageSnapshot,
  deleteConversation,
  getConversation,
  listConversations,
  sendChatMessage,
} from '../../src/api/assistant';

// ── Local message type (UI layer) ──────────────────────────────────────────

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant' | 'typing';
  content: string;
  next_best_action?: string | Record<string, unknown> | null;
  created_at: string;
}

// ── Quick-reply chips ──────────────────────────────────────────────────────

const QUICK_REPLY_KEYS = [
  'monthChanges',
  'cutSpending',
  'vsLastMonth',
  'savingsPlan',
] as const;

// ── Typing indicator ───────────────────────────────────────────────────────

function TypingBubble({ surfaceColor, textColor }: { surfaceColor: string; textColor: string }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapLeft]}>
      <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: surfaceColor, borderColor: surfaceColor }]}>
        <Text style={[styles.bubbleText, { color: textColor, fontStyle: 'italic', opacity: 0.6 }]}>
          {t('assistant.typing')}
        </Text>
      </View>
    </View>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  surfaceColor,
  textColor,
  borderColor,
}: {
  message: LocalMessage;
  surfaceColor: string;
  textColor: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  if (message.role === 'typing') {
    return <TypingBubble surfaceColor={surfaceColor} textColor={textColor} />;
  }

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? styles.bubbleUser
            : [styles.bubbleAssistant, { backgroundColor: surfaceColor, borderColor }],
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : { color: textColor }]}>
          {message.content}
        </Text>
      </View>
      {!isUser && typeof message.next_best_action === 'string' && message.next_best_action ? (
        <View style={[styles.nextActionWrap, { borderColor }]}>
          <Text style={[styles.nextActionLabel, { color: textColor, opacity: 0.5 }]}>
            {t('assistant.nextBestAction')}
          </Text>
          <Text style={[styles.nextActionText, { color: textColor }]}>{message.next_best_action}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── History modal ──────────────────────────────────────────────────────────

function HistoryModal({
  visible,
  onClose,
  onSelect,
  bg,
  surface,
  textPrimary,
  textSecondary,
  borderColor,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (conv: AssistantConversation) => void;
  bg: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    listConversations()
      .then((r) => setConversations(r.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  async function handleDelete(id: string) {
    Alert.alert(
      t('assistant.deleteConversation'),
      t('assistant.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteConversation(id).catch(() => {});
            setConversations((prev) => prev.filter((c) => c.id !== id));
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.historyContainer, { backgroundColor: bg }]} edges={['top']}>
        <View style={[styles.historyHeader, { borderBottomColor: borderColor }]}>
          <Text style={[styles.historyTitle, { color: textPrimary }]}>{t('assistant.historyTitle')}</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" style={styles.historyCloseBtn}>
            <Text style={[styles.historyCloseTxt, { color: colors.brand.primary }]}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand.primary} />
        ) : conversations.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Text style={[styles.historyEmptyText, { color: textSecondary }]}>{t('assistant.historyEmpty')}</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.screenPaddingH, paddingTop: spacing.sm }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: borderColor }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.historyRow, { backgroundColor: surface }]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyRowTitle, { color: textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.historyRowMeta, { color: textSecondary }]}>
                    {item.message_count} msgs
                    {item.last_message_at
                      ? ` · ${new Date(item.last_message_at).toLocaleDateString()}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('assistant.deleteConversation')}
                >
                  <Trash size={18} color={colors.negative} weight="regular" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function AssistantScreen() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { theme, isDark } = useTheme();

  const bg           = isDark ? theme.background      : '#f8fafc';
  const surface      = isDark ? theme.surface         : '#ffffff';
  const textPrimary  = isDark ? theme.textPrimary      : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary   : '#64748b';
  const borderColor  = isDark ? theme.border           : '#e2e8f0';

  const isPremium =
    user?.subscription_status === 'active' || user?.subscription_status === 'trial_active';

  const scrollRef   = useRef<ScrollView>(null);
  const inputRef    = useRef<TextInput>(null);

  const [messages, setMessages]         = useState<LocalMessage[]>([]);
  const [conversationId, setConvId]     = useState<string | null>(null);
  const [inputText, setInputText]       = useState('');
  const [isSending, setIsSending]       = useState(false);
  const [usage, setUsage]               = useState<AssistantUsageSnapshot | null>(null);
  const [showHistory, setShowHistory]   = useState(false);

  const isAtLimit = usage != null && usage.remaining === 0;
  const canSend   = !isSending && inputText.trim().length > 0 && !isAtLimit;

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  async function handleSend(text?: string) {
    const msg = (text ?? inputText).trim();
    if (!msg || isSending || isAtLimit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    setIsSending(true);

    const userMsg: LocalMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    };
    const typingMsg: LocalMessage = {
      id: 'typing',
      role: 'typing',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    scrollToBottom();

    try {
      const result = await sendChatMessage({
        message: msg,
        conversation_id: conversationId ?? undefined,
        locale: i18n.language,
      });

      setConvId(result.conversation.id);
      setUsage(result.usage);

      setMessages((prev) => {
        const withoutTyping = prev.filter((m) => m.id !== 'typing');
        const assistantMsg: LocalMessage = {
          id: result.assistant_message.id,
          role: 'assistant',
          content: result.assistant_message.content,
          next_best_action: result.assistant_message.next_best_action,
          created_at: result.assistant_message.created_at,
        };
        return [...withoutTyping, assistantMsg];
      });
      scrollToBottom();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== 'typing'));
      Alert.alert(t('assistant.errors.send'));
    } finally {
      setIsSending(false);
    }
  }

  async function handleLoadConversation(conv: AssistantConversation) {
    try {
      const detail = await getConversation(conv.id);
      setConvId(conv.id);
      setUsage(detail.usage);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          next_best_action: m.next_best_action,
          created_at: m.created_at,
        })),
      );
      scrollToBottom();
    } catch {
      Alert.alert(t('assistant.errors.load'));
    }
  }

  function handleNewChat() {
    setMessages([]);
    setConvId(null);
    setInputText('');
    inputRef.current?.focus();
  }

  const showEmpty    = messages.length === 0;
  const showQuickReplies = showEmpty && !isSending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <CaretLeft size={24} color={textPrimary} weight="regular" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Sparkle size={18} color={colors.brand.primary} weight="fill" />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('assistant.headerTitle')}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowHistory(true)}
            accessibilityRole="button"
            accessibilityLabel={t('assistant.history')}
          >
            <ClockCounterClockwise size={22} color={textSecondary} weight="regular" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleNewChat}
            accessibilityRole="button"
            accessibilityLabel={t('assistant.newChat')}
          >
            <Plus size={22} color={textSecondary} weight="regular" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Near-limit nudge — only shown at ≥80% usage, no counter displayed */}
      {usage != null && usage.limit > 0 && usage.used / usage.limit >= 0.8 && usage.remaining > 0 && (
        <View style={[styles.nudgeBanner, { backgroundColor: `${colors.warning}14`, borderBottomColor: `${colors.warning}30` }]}>
          <Text style={[styles.nudgeText, { color: colors.warning }]}>
            {t('assistant.nearLimitNudge', { pct: Math.round((usage.used / usage.limit) * 100) })}
          </Text>
        </View>
      )}

      {/* Chat area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.messageList, showEmpty && styles.messageListEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {showEmpty ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.brand.primary}18` }]}>
                <Sparkle size={36} color={colors.brand.primary} weight="fill" />
              </View>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t('assistant.emptyTitle')}</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{t('assistant.emptySubtitle')}</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                surfaceColor={surface}
                textColor={textPrimary}
                borderColor={borderColor}
              />
            ))
          )}
        </ScrollView>

        {/* Quick-reply chips */}
        {showQuickReplies && isPremium && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesContent}
            style={[styles.quickReplies, { borderTopColor: borderColor }]}
          >
            {QUICK_REPLY_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, { backgroundColor: surface, borderColor }]}
                onPress={() => handleSend(t(`assistant.quickReplies.${key}`))}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, { color: textPrimary }]}>
                  {t(`assistant.quickReplies.${key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Limit wall */}
        {isAtLimit && (
          <View style={[styles.limitBanner, { backgroundColor: `${colors.negative}12`, borderColor: `${colors.negative}30` }]}>
            <Text style={[styles.limitTitle, { color: colors.negative }]}>{t('assistant.limitTitle')}</Text>
            <Text style={[styles.limitSubtitle, { color: textSecondary }]}>{t('assistant.limitSubtitle')}</Text>
            <TouchableOpacity
              style={styles.limitCta}
              onPress={() => router.push('/(app)/premium')}
              accessibilityRole="button"
            >
              <Text style={styles.limitCtaText}>{t('assistant.limitCta')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Composer */}
        {!isAtLimit && (
          <View style={[styles.composer, { backgroundColor: bg, borderTopColor: borderColor }]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.composerInput,
                { backgroundColor: surface, color: textPrimary, borderColor },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('assistant.inputPlaceholder')}
              placeholderTextColor={textSecondary}
              multiline
              maxLength={2000}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t('assistant.send')}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <PaperPlaneTilt size={20} color="#ffffff" weight="fill" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimerWrap, { backgroundColor: bg }]}>
          <Text style={[styles.disclaimerText, { color: textSecondary }]}>{t('assistant.disclaimer')}</Text>
        </View>
      </KeyboardAvoidingView>

      {/* History modal */}
      <HistoryModal
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleLoadConversation}
        bg={bg}
        surface={surface}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  headerBtn: { padding: 6, minWidth: 36, alignItems: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: { ...textStyles.displayMd, fontFamily: 'Inter_600SemiBold' },
  headerActions: { flexDirection: 'row', gap: 2 },

  // Near-limit nudge
  nudgeBanner: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  nudgeText: { ...textStyles.bodySm, textAlign: 'center' },

  // Messages
  messageList: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  messageListEmpty: { flex: 1, justifyContent: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', gap: 12, paddingBottom: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...textStyles.displayMd, textAlign: 'center' },
  emptySubtitle: { ...textStyles.bodyMd, textAlign: 'center', opacity: 0.7, paddingHorizontal: 20 },

  // Bubbles
  bubbleWrap: { marginBottom: 4, maxWidth: '85%' },
  bubbleWrapLeft: { alignSelf: 'flex-start' },
  bubbleWrapRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  bubbleUser: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: { borderBottomLeftRadius: 4 },
  bubbleText: { ...textStyles.bodyMd, lineHeight: 22 },
  bubbleTextUser: { color: '#ffffff' },

  // Next best action
  nextActionWrap: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    gap: 2,
  },
  nextActionLabel: { ...textStyles.bodySm, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 },
  nextActionText: { ...textStyles.bodySm },

  // Quick replies
  quickReplies: { borderTopWidth: 1, maxHeight: 56 },
  quickRepliesContent: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { ...textStyles.bodySm, fontFamily: 'Inter_500Medium' },

  // Limit banner
  limitBanner: {
    margin: spacing.screenPaddingH,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    alignItems: 'center',
  },
  limitTitle: { ...textStyles.displayMd, fontFamily: 'Inter_600SemiBold' },
  limitSubtitle: { ...textStyles.bodySm, textAlign: 'center', opacity: 0.8 },
  limitCta: {
    marginTop: 4,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  limitCtaText: { color: '#ffffff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    ...textStyles.bodyMd,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Disclaimer
  disclaimerWrap: { paddingHorizontal: spacing.screenPaddingH, paddingBottom: 12, paddingTop: 4 },
  disclaimerText: { ...textStyles.bodySm, textAlign: 'center', opacity: 0.5, fontSize: 11 },

  // History modal
  historyContainer: { flex: 1 },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  historyTitle: { ...textStyles.displayMd, fontFamily: 'Inter_600SemiBold' },
  historyCloseBtn: { padding: 4 },
  historyCloseTxt: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  historyEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  historyEmptyText: { ...textStyles.bodyMd, opacity: 0.6 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 1,
    gap: 12,
  },
  historyRowTitle: { ...textStyles.bodyMd, fontFamily: 'Inter_500Medium' },
  historyRowMeta: { ...textStyles.bodySm, opacity: 0.6, marginTop: 2 },
});
