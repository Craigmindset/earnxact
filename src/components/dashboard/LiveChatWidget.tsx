"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MdChat } from "react-icons/md";

// Backend integration point:
// - Replace with the real WhatsApp Business number for support, in
//   E.164 format without the leading "+" (e.g. "2348012345678").
const SUPPORT_WHATSAPP_NUMBER = "2340000000000";

const DRAG_MOVE_THRESHOLD = 6;
const WIDGET_SIZE = 56;
const EDGE_MARGIN = 12;

export default function LiveChatWidget() {
  const [rightOffset, setRightOffset] = useState(EDGE_MARGIN + 8);
  const draggingRef = useRef(false);
  const dragStateRef = useRef({ startX: 0, startRight: rightOffset, moved: false });

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    draggingRef.current = true;
    dragStateRef.current = { startX: event.clientX, startRight: rightOffset, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;

    const delta = dragStateRef.current.startX - event.clientX;
    if (Math.abs(delta) > DRAG_MOVE_THRESHOLD) {
      dragStateRef.current.moved = true;
    }

    const maxRight = window.innerWidth - WIDGET_SIZE - EDGE_MARGIN;
    const nextRight = Math.min(
      Math.max(dragStateRef.current.startRight + delta, EDGE_MARGIN),
      Math.max(maxRight, EDGE_MARGIN)
    );
    setRightOffset(nextRight);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!dragStateRef.current.moved) {
      window.open(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ right: rightOffset }}
      aria-label="Chat with support on WhatsApp"
      title="Chat with us on WhatsApp"
      className="fixed bottom-6 z-50 flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-black/40 transition hover:bg-green-400 active:cursor-grabbing"
    >
      <MdChat className="text-2xl" />
    </button>
  );
}
