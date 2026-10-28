import { beforeEach, describe, expect, it } from 'vitest';
import { chatDb } from '../db/chatDb';
import { useRag } from './ragStore';
import { useSessionStore } from './sessionStore';

describe('useSessionStore & Offline-First Dexie persistence', () => {
  beforeEach(async () => {
    // Clear in-memory & Dexie database
    await chatDb.messages.clear();
    await chatDb.sessions.clear();
    useSessionStore.setState({
      currentSessionId: null,
      sessions: [],
      isHistoryOpen: false,
      isOffline: false,
    });
    useRag.setState({ messages: [], runId: 0, phase: 'idle' });
  });

  it('createOrGetSession creates session locally with sliced prompt as title', async () => {
    const prompt = 'Cho tôi biết kiến trúc tổng quan của hệ thống RAG và các thành phần chính';
    const sessionId = await useSessionStore.getState().createOrGetSession(prompt);

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');

    // Title should be sliced to 48 characters
    const stored = await chatDb.sessions.get(sessionId);
    expect(stored).toBeDefined();
    expect(stored?.title).toBe(prompt.slice(0, 48));

    // sessionStore should track it
    expect(useSessionStore.getState().currentSessionId).toBe(sessionId);
    expect(useSessionStore.getState().sessions.length).toBe(1);
  });

  it('saveExchangeToDb persists multi-turn Q&A exchanges to Dexie offline', async () => {
    const sessionId = await useSessionStore.getState().createOrGetSession('Câu hỏi 1');

    await useSessionStore.getState().saveExchangeToDb(
      sessionId,
      { id: 'u1', content: 'Câu hỏi 1', created_at: new Date().toISOString() },
      {
        id: 'a1',
        content: 'Trả lời câu hỏi 1',
        status: 'done',
        citationChecks: [{ marker: '2310.00297', paper_id: '2310.00297', status: 'verified' }],
        grounded_chunks: [],
        timings: { embed_ms: 10, route_ms: 5, search_ms: 20, rerank_ms: 10, llm_ms: 100, total_ms: 145 },
        created_at: new Date().toISOString(),
      },
    );

    const msgs = await chatDb.messages.where('sessionId').equals(sessionId).sortBy('created_at');
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('Câu hỏi 1');
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].content).toBe('Trả lời câu hỏi 1');
    expect(msgs[1].citationChecks?.length).toBe(1);

    const session = await chatDb.sessions.get(sessionId);
    expect(session?.message_count).toBe(2);
  });

  it('switchSession rehydrates messages from Dexie into useRag store without network', async () => {
    const sessionId = await useSessionStore.getState().createOrGetSession('Câu hỏi cũ');

    await useSessionStore.getState().saveExchangeToDb(
      sessionId,
      { id: 'u1', content: 'Nội dung câu hỏi cũ', created_at: new Date().toISOString() },
      {
        id: 'a1',
        content: 'Nội dung câu trả lời cũ',
        status: 'done',
        created_at: new Date().toISOString(),
      },
    );

    // Simulate switching away or clearing
    useSessionStore.getState().startNewChat();
    expect(useSessionStore.getState().currentSessionId).toBeNull();
    expect(useRag.getState().messages.length).toBe(0);

    // Switch back
    await useSessionStore.getState().switchSession(sessionId);
    expect(useSessionStore.getState().currentSessionId).toBe(sessionId);
    expect(useRag.getState().messages.length).toBe(2);
    expect(useRag.getState().messages[0].content).toBe('Nội dung câu hỏi cũ');
    expect(useRag.getState().messages[1].content).toBe('Nội dung câu trả lời cũ');
  });

  it('deleteSession purges session and all its messages from IndexedDB', async () => {
    const sessionId = await useSessionStore.getState().createOrGetSession('Đoạn chat cần xoá');
    await useSessionStore.getState().saveExchangeToDb(
      sessionId,
      { id: 'u1', content: 'Xoá tôi đi', created_at: new Date().toISOString() },
      { id: 'a1', content: 'Đang đợi xoá', status: 'done', created_at: new Date().toISOString() },
    );

    expect(await chatDb.sessions.count()).toBe(1);
    expect(await chatDb.messages.count()).toBe(2);

    await useSessionStore.getState().deleteSession(sessionId);

    expect(await chatDb.sessions.count()).toBe(0);
    expect(await chatDb.messages.count()).toBe(0);
    expect(useSessionStore.getState().sessions.length).toBe(0);
    expect(useSessionStore.getState().currentSessionId).toBeNull();
  });
});
