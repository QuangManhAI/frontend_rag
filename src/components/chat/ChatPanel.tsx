import { ChevronsLeft, LogOut, MessagesSquare } from 'lucide-react';
import { USE_MOCK } from '../../api/client';
import { useAuth } from '../../store/authStore';
import { useUi } from '../../store/uiStore';
import { AuthOverlay } from '../auth/AuthOverlay';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { PipelineStatus } from './PipelineStatus';

/** Chat column content; positioning (side panel / bottom sheet) is done by AppShell. */
export function ChatPanel({ onCollapse }: { onCollapse?: () => void }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <section className="flex flex-col h-full min-h-0" aria-label="Khung chat">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--ui-border)]">
        <MessagesSquare size={16} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold">Hỏi đáp RAG</h2>
        {USE_MOCK && <span className="tag ml-1 mono">mock</span>}
        <div className="ml-auto flex items-center gap-1.5">
          {isAuthenticated && user && (
            <>
              <span
                className="liquid-badge-chip max-w-[130px] truncate !text-[var(--ink)]"
                title={user.email}
              >
                {user.display_name || user.email}
              </span>
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                onClick={logout}
              >
                <LogOut size={14} />
              </button>
            </>
          )}
          {onCollapse && (
            <button type="button" className="btn btn-icon" aria-label="Thu gọn chat" onClick={onCollapse}>
              <ChevronsLeft size={15} />
            </button>
          )}
        </div>
      </header>
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
