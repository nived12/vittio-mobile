import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent: string | null;
  is_deterministic: boolean;
  next_best_action: string | Record<string, unknown> | null;
  created_at: string;
}

export interface AssistantConversation {
  id: string;
  title: string;
  locale: string;
  last_message_at: string | null;
  message_count: number;
}

export interface AssistantUsageSnapshot {
  plan: 'premium' | 'trial' | null;
  used: number;
  limit: number;
  remaining: number;
  resets_at: string | null;
  /** Set only on the response that crosses an 80/90/95 threshold for premium users. */
  threshold_crossed?: 80 | 90 | 95;
}

export interface ChatResponse {
  conversation: AssistantConversation;
  user_message: AssistantMessage;
  assistant_message: AssistantMessage;
  disclaimer: string;
  usage: AssistantUsageSnapshot;
}

export interface ConversationDetail {
  conversation: AssistantConversation;
  messages: AssistantMessage[];
  usage: AssistantUsageSnapshot;
}

// ── API calls ──────────────────────────────────────────────────────────────

/** POST /api/v1/assistant/chat */
export async function sendChatMessage(params: {
  message: string;
  conversation_id?: string;
  locale?: string;
}): Promise<ChatResponse> {
  const res = await apiClient.post<{
    data: Omit<ChatResponse, 'usage'>;
    meta: { usage: AssistantUsageSnapshot };
  }>('/assistant/chat', params);
  return { ...res.data.data, usage: res.data.meta.usage };
}

/** GET /api/v1/assistant/conversations */
export async function listConversations(page = 1): Promise<{
  conversations: AssistantConversation[];
  pagination: { page: number; pages: number; count: number; page_size: number };
}> {
  const res = await apiClient.get<{
    data: { conversations: AssistantConversation[] };
    meta: { pagination: { page: number; pages: number; count: number; page_size: number } };
  }>('/assistant/conversations', { params: { page, page_size: 20 } });
  return {
    conversations: res.data.data.conversations,
    pagination: res.data.meta.pagination,
  };
}

/** GET /api/v1/assistant/conversations/:id */
export async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await apiClient.get<{
    data: { conversation: AssistantConversation; messages: AssistantMessage[] };
    meta: { usage: AssistantUsageSnapshot };
  }>(`/assistant/conversations/${id}`);
  return {
    conversation: res.data.data.conversation,
    messages: res.data.data.messages,
    usage: res.data.meta.usage,
  };
}

/** DELETE /api/v1/assistant/conversations/:id */
export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/assistant/conversations/${id}`);
}

/** GET /api/v1/assistant/usage */
export async function getAssistantUsage(): Promise<AssistantUsageSnapshot> {
  const res = await apiClient.get<{ data: AssistantUsageSnapshot }>('/assistant/usage');
  return res.data.data;
}
