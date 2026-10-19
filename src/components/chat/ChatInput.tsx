import { SendHorizonal, Square } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRag } from '../../store/ragStore';

export function ChatInput() {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const phase = useRag((s) => s.phase);
  const running = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  const submit = () => {
    if (!value.trim()) return;
    void useRag.getState().send(value);
    setValue('');
    if (ref.current) ref.current.style.height = '';
  };

  return (
    <form
      className="p-3 border-t border-[var(--ui-border)] flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        aria-label="Câu hỏi"
        placeholder="Hỏi về các bài báo… (Enter gửi, Shift+Enter xuống dòng)"
        className="field resize-none max-h-40 scroll-thin"
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = '';
          e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {running ? (
        <button type="button" className="btn btn-danger flex-none" onClick={() => useRag.getState().stop()} aria-label="Dừng">
          <Square size={14} /> Dừng
        </button>
      ) : null}
      <button type="submit" className="btn btn-primary flex-none" disabled={!value.trim()} aria-label="Gửi">
        <SendHorizonal size={15} />
      </button>
    </form>
  );
}
