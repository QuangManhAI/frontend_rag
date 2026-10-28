import { useEffect } from 'react';
import { ChevronsLeft, History, LogOut, MessagesSquare, Plus, WifiOff } from 'lucide-react';
import { USE_MOCK } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import { useUi } from '../../store/uiStore';
import { AuthOverlay } from '../auth/AuthOverlay';
import { ChatInput } from './ChatInput';
import { HistoryDrawer } from './HistoryDrawer';
import { MessageList } from './MessageList';
import { PipelineStatus } from './PipelineStatus';

/** Chat column content; positioning (side panel / bottom sheet) is done by AppShell. */
export function ChatPanel({ onCollapse }: { onCollapse?: () => void }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const isOffline = useSessionStore((s) => s.isOffline);
  const isHistoryOpen = useSessionStore((s) => s.isHistoryOpen);
  const toggleHistory = useSessionStore((s) => s.toggleHistory);
  const startNewChat = useSessionStore((s) => s.startNewChat);
  const sessions = useSessionStore((s) => s.sessions);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);

  // Initialize Dexie cache and background sync on mount & on auth changes
  useEffect(() => {
    void useSessionStore.getState().init();
  }, [isAuthenticated]);

  const activeSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <section className="relative flex flex-col h-full min-h-0 overflow-hidden" aria-label="Khung chat">
      <header className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[var(--ui-border)] shrink-0">
        <button
          type="button"
          className={`btn btn-icon !p-1.5 transition-colors ${
            isHistoryOpen ? '!bg-[var(--accent)] !text-white' : 'text-[var(--ink-secondary,#cbd5e1)] hover:text-[var(--ink)]'
          }`}
          onClick={() => toggleHistory()}
          title="Lịch sử trò chuyện"
          aria-label="Lịch sử trò chuyện"
        >
          <History size={16} />
        </button>

        <button
          type="button"
          className="btn btn-icon !p-1.5 text-[var(--ink-secondary,#cbd5e1)] hover:text-[var(--ink)]"
          onClick={startNewChat}
          title="Đoạn chat mới"
          aria-label="Đoạn chat mới"
        >
          <Plus size={16} />
        </button>

        <div className="flex items-center gap-1.5 min-w-0 mr-auto pl-1">
          <MessagesSquare size={15} className="text-[var(--accent)] shrink-0" />
          <h2 className="text-xs font-semibold truncate max-w-[140px]" title={activeSession?.title || 'Hỏi đáp RAG'}>
            {activeSession?.title || 'Hỏi đáp RAG'}
          </h2>
          {USE_MOCK && <span className="tag mono !text-[10px] !py-0 !px-1">mock</span>}
          {isOffline && !USE_MOCK && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title="Máy chủ ngoại tuyến. Bạn vẫn có thể xem toàn bộ lịch sử trò chuyện đã lưu."
            >
              <WifiOff size={10} />
              Ngoại tuyến
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isAuthenticated && user && (
            <>
              <span
                className="liquid-badge-chip max-w-[110px] truncate !text-[var(--ink)] text-[11px]"
                title={user.email}
              >
                {user.display_name || user.email}
              </span>
              <button
                type="button"
                className="btn btn-icon !p-1.5"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                onClick={logout}
              >
                <LogOut size={13} />
              </button>
            </>
          )}
          {onCollapse && (
            <button type="button" className="btn btn-icon !p-1.5" aria-label="Thu gọn chat" onClick={onCollapse}>
              <ChevronsLeft size={15} />
            </button>
          )}
        </div>
      </header>

      {/* History Drawer overlay */}
      <HistoryDrawer />

      {isAuthenticated ? (
        <>
          <PipelineStatus />
          <MessageList />
          <ChatInput />
        </>
      ) : (
        <AuthOverlay />
      )}
    </section>
  );
}

export function ChatReopenButton() {
  return (
    <button type="button" className="btn glass !rounded-xl" onClick={() => useUi.getState().setChatOpen(true)} aria-label="Mở chat">
      <MessagesSquare size={16} /> Chat
    </button>
  );
}
