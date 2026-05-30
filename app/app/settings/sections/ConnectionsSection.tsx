"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { SettingsSection } from "../SettingsSection";

type Connection = {
  provider: "google" | "trello" | "github";
  expires_at: string | null;
  scopes: string[] | null;
  updated_at: string;
};

const PROVIDERS: Array<{
  id: Connection["provider"];
  label: string;
  description: string;
  connect: () => void | Promise<void>;
}> = [
  {
    id: "google",
    label: "Google",
    description: "Calendar, Sheets, Tasks (read + event-write)",
    connect: () => signIn("google"),
  },
  {
    id: "trello",
    label: "Trello",
    description: "Boards, lists, cards, label writes",
    connect: () => {
      window.location.href = "/api/auth/trello/start";
    },
  },
  {
    id: "github",
    label: "GitHub",
    description: "PRs, issues, notifications (read-only; you pick the repos)",
    connect: () => {
      window.location.href = "/api/auth/github/start";
    },
  },
];

const CONNECTIONS_KEY = ["auth", "connections"] as const;

async function fetchConnections(): Promise<Connection[]> {
  const res = await fetch("/api/auth/connections", { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { connections?: Connection[] };
  return json.connections ?? [];
}

export function ConnectionsSection() {
  const queryClient = useQueryClient();
  const { data: items } = useQuery<Connection[]>({
    queryKey: CONNECTIONS_KEY,
    queryFn: fetchConnections,
    staleTime: 30_000,
  });
  const [busy, setBusy] = useState<string | null>(null);

  const disconnect = async (provider: Connection["provider"]) => {
    setBusy(provider);
    try {
      await fetch("/api/auth/connections", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsSection id="connections" title="Connections" multi>
      <ul className="lens-settings-connections">
        {PROVIDERS.map((p) => {
          const connection = items?.find((c) => c.provider === p.id);
          const connected = Boolean(connection);
          return (
            <li
              key={p.id}
              className="lens-settings-card lens-settings-connections__row"
            >
              <div className="lens-settings-connections__row-meta">
                <span className="lens-settings-connections__row-label">{p.label}</span>
                <span className="lens-settings-connections__row-desc">{p.description}</span>
                {connection?.expires_at ? (
                  <span className="lens-settings-connections__row-expiry">
                    Token expires {new Date(connection.expires_at).toLocaleString()}
                  </span>
                ) : null}
              </div>
              <div className="lens-settings-connections__row-actions">
                <button
                  type="button"
                  className="lens-settings-button"
                  onClick={() => p.connect()}
                  disabled={busy === p.id}
                >
                  {connected ? "Reconnect" : "Connect"}
                </button>
                {connected ? (
                  <button
                    type="button"
                    className="lens-settings-button lens-settings-button--ghost"
                    onClick={() => disconnect(p.id)}
                    disabled={busy === p.id}
                  >
                    Disconnect
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </SettingsSection>
  );
}
