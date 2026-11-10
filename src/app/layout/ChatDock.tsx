import { useEffect, useRef, useState, type AnimationEvent } from 'react';
import { ChatPanel, ChatReopenButton } from '../../features/chat/components/ChatPanel';
import { useUi } from '../../shared/store/uiStore';
import { useGlassLevel } from '../../shared/theme/useLiquidLight';
import { Glass } from '../../shared/ui/Glass';
import { LiquidLens } from '../../shared/ui/LiquidShell';
import { introDelay } from './introDelay';

/**
 * Desktop chat column. Stays mounted while it slides out so the close is animated too;
 * the first open (page load) waits a beat so it follows the top bar in.
 */
export function ChatDock() {
  const chatOpen = useUi((s) => s.chatOpen);
  const [mounted, setMounted] = useState(chatOpen);
  const firstOpen = useRef(true);
  useEffect(() => {
    if (chatOpen) setMounted(true);
  }, [chatOpen]);
  const closing = mounted && !chatOpen;
  // Level 3: the lens comes from @samasante/liquid-glass, wrapped around the dock (see below).
  const liquid = useGlassLevel() === 3;

  if (!mounted) {
    return (
      <div className="self-start fade-in">
        <ChatReopenButton />
      </div>
    );
  }
  const slide = closing ? 'chat-slide-out' : 'chat-slide-in';
  const slideStyle = firstOpen.current && !closing ? introDelay(0.15) : undefined;
  const onSlideEnd = (e: AnimationEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return; // ignore animations of children
    firstOpen.current = false;
    if (closing) setMounted(false);
  };
  const panel = <ChatPanel onCollapse={() => useUi.getState().setChatOpen(false)} />;

  if (liquid) {
    // The library's material wrapper carries the backdrop lens, so it is the box that slides; the dock inside
    // keeps its markup, tokens and rim light but drops its own backdrop filter (index.css [data-lgr]; optics in ui/LiquidShell.dark.ts / .light.ts): a
    // backdrop-filtered child of a backdrop-filtered box would only see the box, not the world.
    return (
      <LiquidLens
        panel="chat"
        className={`w-[32vw] min-w-[340px] max-w-[520px] h-full ${slide}`}
        style={slideStyle}
        aria-hidden={closing || undefined}
        onAnimationEnd={onSlideEnd}
      >
        <Glass refract="chat" data-lgr className="w-full h-full overflow-hidden" data-testid="chat-dock">
          {panel}
        </Glass>
      </LiquidLens>
    );
  }
  return (
    <Glass
      refract="chat"
      className={`w-[32vw] min-w-[340px] max-w-[520px] h-full overflow-hidden ${slide}`}
      style={slideStyle}
      aria-hidden={closing || undefined}
      data-testid="chat-dock"
      onAnimationEnd={onSlideEnd}
    >
      {panel}
    </Glass>
  );
}
