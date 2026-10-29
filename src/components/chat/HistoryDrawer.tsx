import { useState } from 'react';
import { Check, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { useSessionStore } from '../../store/sessionStore';
import type { LocalChatSession } from '../../db/chatDb';

function formatRelativeTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
  } catch {
    return '';
  }
}

export function HistoryDrawer() {
  const sessions = useSessionStore((s) => s.sessions);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const isHistoryOpen = useSessionStore((s) => s.isHistoryOpen);
  const toggleHistory = useSessionStore((s) => s.toggleHistory);
  const startNewChat = useSessionStore((s) => s.startNewChat);
  const switchSession = useSessionStore((s) => s.switchSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  // ID of session currently in 2-step deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isHistoryOpen) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col surface-opaque backdrop-blur-md border-r border-[var(--ui-border)] transition-all animate-fadeIn"
      role="dialog"
      aria-label="Lịch sử trò chuyện"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--ui-border)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
          Lịch sử trò chuyện
        </span>
        <button
          type="button"
          className="btn btn-icon !p-1 text-[var(--ink-faint)] hover:text-[var(--ink)]"
          onClick={() => toggleHistory(false)}
          title="Đóng lịch sử"
          aria-label="Đóng lịch sử"
        >
          <X size={15} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-2 border-b border-[var(--ui-border)]">
        <button
          type="button"
          onClick={startNewChat}
          className="btn w-full justify-center gap-2 !py-2 text-xs font-medium !bg-[var(--accent)] hover:!brightness-110 !text-[var(--accent-ink)] transition-all shadow-sm"
        >
          <Plus size={15} />
          Đoạn chat mới
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--ink-faint)]">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
            <p>Chưa có đoạn chat nào.</p>
            <p className="mt-1">Bắt đầu bằng cách nhập câu hỏi!</p>
          </div>
        ) : (
          sessions.map((session: LocalChatSession) => {
            const isActive = session.id === currentSessionId;
            const isConfirming = confirmDeleteId === session.id;

            return (
              <div
                key={session.id}
                className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)]/16 border border-[var(--accent)]/40 text-[var(--ink)] font-medium shadow-xs'
                    : 'hover:bg-[var(--glass-fill-hover)] text-[var(--ink-muted)]'
                }`}
                onClick={() => {
                  if (!isConfirming) {
                    void switchSession(session.id);
                  }
                }}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="truncate font-medium leading-tight">
                    {session.title || 'Đoạn chat mới'}
                  </div>
                  <div className="text-[10px] text-[var(--ink-faint)] mt-0.5">
                    {formatRelativeTime(session.last_message_at || session.created_at)}
                    {session.message_count > 0 && ` • ${session.message_count} tin nhắn`}
                  </div>
                </div>

                {/* Inline Delete & 2-Step Confirmation */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isConfirming ? (
                    <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--danger)_16%,var(--ui-surface-strong))] border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] rounded px-1.5 py-0.5 animate-fadeIn">
                      <span className="text-[10px] text-[var(--danger)] font-semibold mr-0.5">Xóa?</span>
                      <button
                        type="button"
                        className="p-1 text-[var(--danger)] hover:text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--danger)_24%,transparent)] rounded"
                        title="Xác nhận xoá"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          void deleteSession(session.id);
                        }}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--glass-fill-hover)] rounded"
                        title="Huỷ"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] rounded transition-all"
                      title="Xoá đoạn chat"
                      aria-label="Xoá đoạn chat"
                      onClick={() => setConfirmDeleteId(session.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
