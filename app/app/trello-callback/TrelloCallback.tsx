"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type State = { status: "starting" } | { status: "submitting" } | { status: "ok" } | { status: "error"; reason: string };

export function TrelloCallback() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "starting" });

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const token = params.get("token");
    void (async () => {
      if (!token) {
        setState({
          status: "error",
          reason: "Trello did not return a token. Try connecting again.",
        });
        return;
      }
      setState({ status: "submitting" });
      try {
        const res = await fetch("/api/auth/trello/store", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(json.error?.message ?? `HTTP ${res.status}`);
        }
        window.history.replaceState(null, "", window.location.pathname);
        setState({ status: "ok" });
        setTimeout(() => router.replace("/settings"), 600);
      } catch (err) {
        setState({ status: "error", reason: (err as Error).message });
      }
    })();
  }, [router]);

  return (
    <main className="lens-trello-callback">
      {state.status === "starting" || state.status === "submitting" ? (
        <p>Connecting Trello…</p>
      ) : null}
      {state.status === "ok" ? <p>Trello connected. Returning to settings…</p> : null}
      {state.status === "error" ? (
        <>
          <p>Trello connection failed.</p>
          <p className="lens-trello-callback__reason">{state.reason}</p>
        </>
      ) : null}
    </main>
  );
}
