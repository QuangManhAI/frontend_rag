import { ChevronsLeft, MessagesSquare } from 'lucide-react';
import { USE_MOCK } from '../../api/client';
import { useUi } from '../../store/uiStore';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { PipelineStatus } from './PipelineStatus';

/** Chat column content; positioning (side panel / bottom sheet) is done by AppShell. */
export function ChatPanel({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <section className="flex flex-col h-full min-h-0" aria-label="Khung chat">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--ui-border)]">
        <MessagesSquare size={16} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold">Hỏi đáp RAG</h2>
        {USE_MOCK && <span className="tag ml-1 mono">mock</span>}
        {onCollapse && (
          <button type="button" className="btn btn-icon ml-auto" aria-label="Thu gọn chat" onClick={onCollapse}>
            <ChevronsLeft size={15} />
          </button>
        )}
      </header>
      <PipelineStatus />
      <MessageList />
      <ChatInput />
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
