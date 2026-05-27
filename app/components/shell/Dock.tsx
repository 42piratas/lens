"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Grid3x3, HelpCircle, Settings, MessageCircle } from "lucide-react";
import { useGridStore } from "@/lib/grid/store";
import { usePanelStore } from "@/lib/panel/store";
import { useChatStore } from "@/lib/chat/store";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

function FortyTwoLabsMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 128 128"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M44,76 L42,70 C36,62 34,52 34,46 C34,22 94,22 94,46 C94,52 92,62 86,70 L84,76 L84,86 L44,86 Z" />
      <circle cx="50" cy="46" r="9" fill="currentColor" stroke="none" />
      <circle cx="78" cy="46" r="9" fill="currentColor" stroke="none" />
      <path d="M60,57 L64,65 L68,57" />
      <line x1="44" y1="76" x2="84" y2="76" />
      <line x1="54" y1="76" x2="54" y2="86" />
      <line x1="64" y1="76" x2="64" y2="86" />
      <line x1="74" y1="76" x2="74" y2="86" />
      <circle cx="26" cy="98" r="7" />
      <circle cx="26" cy="98" r="4" fill="currentColor" stroke="none" />
      <line x1="32" y1="102" x2="96" y2="116" />
      <circle cx="102" cy="120" r="7" />
      <circle cx="102" cy="120" r="4" fill="currentColor" stroke="none" />
      <circle cx="102" cy="98" r="7" />
      <circle cx="102" cy="98" r="4" fill="currentColor" stroke="none" />
      <line x1="96" y1="102" x2="32" y2="116" />
      <circle cx="26" cy="120" r="7" />
      <circle cx="26" cy="120" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Dock() {
  const gridVisible = useGridStore((s) => s.gridVisible);
  const toggleGridVisible = useGridStore((s) => s.toggleGridVisible);
  const setGridVisible = useGridStore((s) => s.setGridVisible);
  const openPanel = usePanelStore((s) => s.open);
  const toggleChat = useChatStore((s) => s.toggle);
  const chatOpen = useChatStore((s) => s.open);
  const gridLabel = gridVisible ? "Hide grid lines" : "Show grid lines";
  const pathname = usePathname();
  const settingsActive = pathname?.startsWith("/settings") ?? false;

  const onPlus = () => {
    setGridVisible(true);
    openPanel();
  };

  return (
    <aside className="lens-dock" aria-label="Dock">
      <a
        href="https://42labs.io"
        target="_blank"
        rel="noopener noreferrer"
        title="42labs"
        aria-label="42labs"
        className="lens-dock-brand"
      >
        <FortyTwoLabsMark />
      </a>

      <UserMenu />

      <hr className="lens-dock-divider" aria-hidden />

      <WorkspaceSwitcher />

      <hr className="lens-dock-divider" aria-hidden />

      <nav className="lens-dock-nav">
        <button
          type="button"
          onClick={onPlus}
          aria-label="Add a card"
          title="Add a card"
          className="lens-dock-btn"
        >
          <Plus size={18} strokeWidth={1.75} aria-hidden />
        </button>

        <button
          type="button"
          onClick={toggleGridVisible}
          aria-pressed={gridVisible}
          aria-label={gridLabel}
          title={gridLabel}
          className="lens-dock-btn"
          data-active={gridVisible ? "true" : undefined}
        >
          <Grid3x3 size={18} strokeWidth={1.75} aria-hidden />
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Help (coming soon)"
          title="Help — coming soon"
          className="lens-dock-btn lens-dock-btn--disabled"
        >
          <HelpCircle size={18} strokeWidth={1.75} aria-hidden />
        </button>

        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="lens-dock-btn"
          data-active={settingsActive ? "true" : undefined}
        >
          <Settings size={18} strokeWidth={1.75} aria-hidden />
        </Link>

        <ThemeToggle />

        <button
          type="button"
          onClick={toggleChat}
          aria-pressed={chatOpen}
          aria-label={chatOpen ? "Close chat" : "Open chat"}
          title={chatOpen ? "Close chat" : "Open chat"}
          className="lens-dock-btn"
        >
          <MessageCircle size={18} strokeWidth={1.75} aria-hidden />
        </button>
      </nav>
    </aside>
  );
}
