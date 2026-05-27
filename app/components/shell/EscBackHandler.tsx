"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function EscBackHandler() {
  const router = useRouter();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
  return null;
}
