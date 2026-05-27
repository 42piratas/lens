"use client";

import { useEffect, useRef, useState } from "react";
import { usePanelStore } from "@/lib/panel/store";
import { useChatStore } from "@/lib/chat/store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const HEADER = "Ask LENS";
const PLACEHOLDER = "Ask anything…";
const GREETING = "Hi — I'll answer questions about your calendar, Trello, notes, OKRs, and weight once integrations land in Phase 2.";

function BotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

export function FloatingChat() {
  const open = useChatStore((s) => s.open);
  const closeChat = useChatStore((s) => s.close);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);
  const panelMode = usePanelStore((s) => s.mode);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) {
      greetedRef.current = false;
      return;
    }
    if (greetedRef.current) return;
    greetedRef.current = true;
    setLoading(true);
    const timer = setTimeout(() => {
      setMessages([{ role: "assistant", content: GREETING }]);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [open]);

  if (panelMode !== "closed" || !open) return null;

  return (
    <>
      {open && (
        <div className="lens-chat-panel">
          <div className="lens-chat-header">
            <div className="flex items-center gap-2 text-(--accent)">
              <BotIcon size={16} />
              <span className="text-sm font-medium">{HEADER}</span>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Close chat"
              className="text-xs text-(--fg-muted) hover:opacity-70"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start items-start gap-2"}`}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full mt-0.5 bg-(--accent-soft) text-(--accent)">
                    <BotIcon size={12} />
                  </div>
                )}
                <div
                  className={`text-sm leading-relaxed rounded-lg px-3 py-2 max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-(--surface-muted) text-(--fg)"
                      : "bg-(--accent) text-(--surface)"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start items-start gap-2">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-(--accent-soft) text-(--accent)">
                  <BotIcon size={12} />
                </div>
                <div className="text-sm rounded-lg px-3 py-2 flex items-center gap-1 bg-(--surface-muted) text-(--fg-muted)">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-current" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="lens-chat-footer">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={PLACEHOLDER}
                maxLength={1000}
                disabled
                className="flex-1 h-auto text-sm rounded-md px-3 py-2 outline-none disabled:opacity-60 bg-(--surface-muted) text-(--fg) border border-(--border)"
              />
              <button
                type="button"
                disabled
                aria-label="Send"
                className="h-8 w-8 grid place-items-center rounded-md disabled:opacity-40 hover:opacity-90 bg-(--accent) text-(--surface)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
