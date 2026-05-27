"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, UserCircle } from "lucide-react";

const LAYOUT_KEYS = [
  "lens.workspaces",
  "lens.layout",
  "lens.scratchpad",
  "lens.scratchpad_pending_write",
  "lens.payload_pending_write",
];

function clearUserLocalState() {
  if (typeof window === "undefined") return;
  for (const key of LAYOUT_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (status !== "authenticated" || !session?.user) return null;

  const name = session.user.name ?? session.user.email ?? "Account";
  const image = session.user.image;

  return (
    <div className="lens-dock-user" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Signed in as ${name}`}
        title={name}
        aria-expanded={open}
        className="lens-dock-btn"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="lens-dock-user__avatar" />
        ) : (
          <UserCircle size={18} strokeWidth={1.75} aria-hidden />
        )}
      </button>
      {open ? (
        <div role="menu" className="lens-dock-user__menu">
          <p className="lens-dock-user__name">{name}</p>
          <button
            type="button"
            role="menuitem"
            className="lens-dock-user__menu-item"
            onClick={async () => {
              clearUserLocalState();
              await signOut({ redirectTo: "/sign-in" });
            }}
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
