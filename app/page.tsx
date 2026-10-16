'use client';

import React, { useState, useEffect } from 'react';
import { loadConversation, saveConversation, clearConversation } from '../lib/chatStorage';
import { ThemeProvider } from '../src/context/ThemeContext';
import { Navbar } from '../components/Navbar';
import { ChatPanel } from '../components/ChatPanel';
import { GroundedInspector } from '../components/GroundedInspector';
import { PaperModal } from '../components/PaperModal';
import {
  ChatMessage,
  GroundedChunkResult,
  HealthResponse,
  QueryOptions,
  RAGSynthesisResponse,
} from '../src/types/rag';

function WorkbenchContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChunks, setActiveChunks] = useState<GroundedChunkResult[]>([]);
  const [selectedChunk, setSelectedChunk] = useState<GroundedChunkResult | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [conversationReady, setConversationReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const requestGeneration = React.useRef(0);

  const persistMessages = async (nextMessages: ChatMessage[]) => {
    try {
      await saveConversation(nextMessages);
    } catch (error) {
      console.error('Failed to persist chat history:', error);
      setStorageNotice('Chat history could not be saved locally. The conversation remains available for this session.');
    }
  };

  useEffect(() => {
    let mounted = true;

    loadConversation()
      .then((storedMessages) => {
        if (!mounted) return;
        setMessages(storedMessages);
        const latestChunks = [...storedMessages]
          .reverse()
          .find((message) => message.role === 'assistant' && message.grounded_chunks?.length)
          ?.grounded_chunks;
        setActiveChunks(latestChunks || []);
      })
      .catch((error) => {
        console.error('Failed to restore chat history:', error);
        if (mounted) {
          setStorageNotice('Saved chat history could not be restored. You can continue in memory.');
        }
      })
      .finally(() => {
        if (mounted) setConversationReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Poll backend health status
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/rag/health');
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } catch (err) {
        console.error('Failed to fetch backend health:', err);
      } finally {
        setLoadingHealth(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Send RAG Query
  const handleSendMessage = async (query: string, options: QueryOptions) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const generation = requestGeneration.current;
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await persistMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          top_k: options.top_k,
          category: options.category || undefined,
          use_authority_boost: options.use_authority_boost,
          expand_query: options.expand_query,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server returned ${res.status}`);
      }

      const data: RAGSynthesisResponse = await res.json();
      if (requestGeneration.current !== generation) return;

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        citations: data.citations,
        grounded_chunks: data.grounded_chunks,
        latency_ms: data.latency_ms,
      };

      const completeMessages = [...nextMessages, assistantMsg];
      setMessages(completeMessages);
      await persistMessages(completeMessages);
      setActiveChunks(data.grounded_chunks || []);
    } catch (error) {
      if (requestGeneration.current !== generation) return;
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error communicating with backend**: ${(error as Error).message}\n\nPlease verify that the NestJS backend is active on \`http://localhost:8000\`.`,
        timestamp: new Date().toISOString(),
      };
      const failedMessages = [...nextMessages, errorMsg];
      setMessages(failedMessages);
      await persistMessages(failedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = async () => {
    requestGeneration.current += 1;
    setClearDialogOpen(false);
    setMessages([]);
    setActiveChunks([]);
    setSelectedChunk(null);
    setIsLoading(false);

    try {
      await clearConversation();
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      setStorageNotice('Chat history could not be cleared locally.');
    }
  };

  // Handle citation click -> Open paper modal with matching chunk
  const handleCitationClick = (paperId: string) => {
    const cleanId = paperId.trim();
    const normalizedId = cleanId.toLowerCase().replace(/^arxiv:\s*/i, '');

    // Search across activeChunks and all previous messages' grounded_chunks
    const allChunks = [
      ...activeChunks,
      ...messages.flatMap((m) => m.grounded_chunks || []),
    ];

    const found = allChunks.find((c) => {
      const cId = c.paper_id.trim().toLowerCase().replace(/^arxiv:\s*/i, '');
      return cId === normalizedId || cId.includes(normalizedId) || normalizedId.includes(cId);
    });

    if (found) {
      setSelectedChunk(found);
    } else {
      const isAlex = cleanId.startsWith('openalex:');
      const isReview = cleanId.startsWith('openreview_');
      const isCvf = cleanId.startsWith('cvf_');

      const fallbackTitle = isAlex
        ? `OpenAlex: ${cleanId}`
        : isReview
        ? `OpenReview: ${cleanId.replace('openreview_', '')}`
        : isCvf
        ? 'CVPR Open Access Paper'
        : `arXiv: ${cleanId}`;

      const fallbackText = isAlex
        ? `Full publication metadata and citation graph available on OpenAlex.org/works/${cleanId.replace('openalex:', '')}`
        : isReview
        ? `Full conference submission and reviews available on OpenReview.net/forum?id=${cleanId.replace('openreview_', '')}`
        : isCvf
        ? `Full paper text and supplemental material available on CVF Open Access.`
        : `Full preprint paper and metadata available on arXiv.org/abs/${cleanId}`;

      setSelectedChunk({
        chunk_id: `${cleanId}_ref`,
        paper_id: cleanId,
        title: fallbackTitle,
        text: fallbackText,
        similarity_score: 1.0,
        authority_score: 0.5,
        final_score: 0.9,
        citation_tag: `[Paper: ${cleanId}]`,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)] font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar health={health} loadingHealth={loadingHealth} />

      {/* Main Workbench Layout: Left Chat + Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onCitationClick={handleCitationClick}
          activeChunks={activeChunks}
          canSend={conversationReady}
          onClearConversation={() => setClearDialogOpen(true)}
          storageNotice={storageNotice}
        />

        {/* Collapsible Grounded Chunks Inspector */}
        <GroundedInspector
          chunks={activeChunks}
          onSelectChunk={(chunk) => setSelectedChunk(chunk)}
          selectedChunkId={selectedChunk?.chunk_id}
          isOpen={inspectorOpen}
          onToggle={() => setInspectorOpen(!inspectorOpen)}
        />
      </div>

      {/* Deep-dive Paper Inspection Modal */}
      {selectedChunk && (
        <PaperModal
          chunk={selectedChunk}
          onClose={() => setSelectedChunk(null)}
        />
      )}

      {clearDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-conversation-title"
            className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--ink)]"
          >
            <h2 id="clear-conversation-title" className="text-base font-semibold">
              Clear conversation?
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This removes the saved conversation from this browser.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClearDialogOpen(false)}
                className="rounded border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-raised)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearConversation}
                className="rounded bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
              >
                Clear conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <WorkbenchContent />
    </ThemeProvider>
  );
}
