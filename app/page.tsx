'use client';

import React, { useState, useEffect } from 'react';
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

    setMessages((prev) => [...prev, userMsg]);
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

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        citations: data.citations,
        grounded_chunks: data.grounded_chunks,
        latency_ms: data.latency_ms,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActiveChunks(data.grounded_chunks || []);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error communicating with backend**: ${(error as Error).message}\n\nPlease verify that the NestJS backend is active on \`http://localhost:8000\`.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle citation click -> Open paper modal with matching chunk
  const handleCitationClick = (paperId: string) => {
    const found = activeChunks.find((c) => c.paper_id === paperId);
    if (found) {
      setSelectedChunk(found);
    } else {
      setSelectedChunk({
        chunk_id: `${paperId}_ref`,
        paper_id: paperId,
        title: `Paper ID: ${paperId}`,
        text: `Full metadata preview available on arXiv.`,
        similarity_score: 1.0,
        authority_score: 0.5,
        final_score: 0.9,
        citation_tag: `[Paper: ${paperId}]`,
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
