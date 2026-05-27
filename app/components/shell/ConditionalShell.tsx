"use client";

import { usePathname } from "next/navigation";
import { Dock } from "./Dock";
import { Pinboard } from "./Pinboard";
import { FloatingChat } from "./FloatingChat";
import { AddCardPanel } from "@/components/panel/AddCardPanel";

const SHELL_FREE_PREFIXES = ["/sign-in", "/trello-callback"] as const;

function isShellFree(pathname: string | null): boolean {
  if (!pathname) return false;
  return SHELL_FREE_PREFIXES.some((p) => pathname.startsWith(p));
}

export function ConditionalShell({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const pathname = usePathname();
  if (isShellFree(pathname)) return <>{children}</>;
  return (
    <>
      <div className="lens-shell flex h-screen w-screen overflow-hidden">
        <Dock />
        <main className="relative flex-1 h-full overflow-hidden">
          {children}
          {modal}
          <AddCardPanel />
        </main>
        <Pinboard />
      </div>
      <FloatingChat />
    </>
  );
}
