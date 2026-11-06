import { useRef, useState } from 'react';
import { ChatPanel } from '../../features/chat/components/ChatPanel';
import { Glass } from '../../shared/ui/Glass';
import { introDelay } from './introDelay';

/** Mobile chat: bottom sheet with a drag handle snapping between peek / half / full. */
export function BottomSheet() {
  const [height, setHeight] = useState(42);
  const drag = useRef<{ y: number; h: number } | null>(null);
  return (
    <Glass material="strong" className="absolute inset-x-0 bottom-0 z-20 !rounded-b-none flex flex-col intro-up" style={{ height: `${height}vh`, ...introDelay(0.15) }}>
      <div
        className="py-2 grid place-items-center cursor-grab touch-none"
        role="slider"
        aria-label="Kéo để thay đổi chiều cao chat"
        aria-valuemin={12}
        aria-valuemax={88}
        aria-valuenow={Math.round(height)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') setHeight((h) => Math.min(88, h + 10));
          if (e.key === 'ArrowDown') setHeight((h) => Math.max(12, h - 10));
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, h: height };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dy = ((drag.current.y - e.clientY) / window.innerHeight) * 100;
          setHeight(Math.max(12, Math.min(88, drag.current.h + dy)));
        }}
        onPointerUp={() => {
          drag.current = null;
          setHeight((h) => [12, 42, 88].reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a)));
        }}
      >
        <span className="block h-1.5 w-12 rounded-full bg-[color-mix(in_srgb,var(--ink)_30%,transparent)]" />
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </Glass>
  );
}
