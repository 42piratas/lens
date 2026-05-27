"use client";

import { createElement, useEffect, useRef, useState, type FormEvent } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import "./login.css";
import "./logo";

const DECODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

function useDecodedText(text: string, startMs: number, durationMs = 350): string {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // Reduced-motion: skip animation entirely, settle to final text once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(text);
      return;
    }
    setDisplay("");
    let frame = 0;
    const startTimer = window.setTimeout(() => {
      const startAt = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startAt;
        if (elapsed >= durationMs) {
          setDisplay(text);
          return;
        }
        const progress = elapsed / durationMs;
        const settled = Math.floor(text.length * progress);
        let out = text.slice(0, settled);
        for (let i = settled; i < text.length; i++) {
          const c = text[i]!;
          if (/[a-zA-Z0-9]/.test(c)) {
            out += DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
          } else {
            out += c;
          }
        }
        setDisplay(out);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, startMs);

    return () => {
      window.clearTimeout(startTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [text, startMs, durationMs]);

  return display;
}

export function SplashLogin({
  googleAction,
  initialError,
}: {
  googleAction: () => Promise<void>;
  initialError?: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const googleFormRef = useRef<HTMLFormElement>(null);

  const usernameDecoded = useDecodedText("username", 2700, 350);
  const passwordDecoded = useDecodedText("password", 2900, 350);
  const loginDecoded    = useDecodedText("login →",  3100, 350);
  const orDecoded       = useDecodedText("or",       3300, 200);
  const googleDecoded   = useDecodedText("Sign in with Google", 3450, 400);
  const githubDecoded   = useDecodedText("Sign in with GitHub", 3650, 400);
  const notRegDecoded   = useDecodedText("Not registered?",     3900, 350);
  const createAcctDec   = useDecodedText("Create an account",   4100, 400);

  function handleLocalSubmit(e: FormEvent) {
    e.preventDefault();
    setError("Local accounts aren't enabled — sign in with Google.");
  }

  return (
    <div className="login-page">
      <div className="login-logo">
        {createElement("splash-logo" as never, { text: "LENS", animated: "", height: 32 })}
      </div>
      <div className="widget-window">
        <div className="window-titlebar">
          <div className="window-dots" aria-hidden>
            <span className="dot-red" />
            <span className="dot-yellow" />
            <span className="dot-green" />
          </div>
        </div>
        <form className="window-body" onSubmit={handleLocalSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="input-wrapper">
            <User className="input-icon" size={16} aria-hidden />
            <input
              type="text"
              placeholder={usernameDecoded}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="input-wrapper">
            <Lock className="input-icon" size={16} aria-hidden />
            <input
              type={showPassword ? "text" : "password"}
              placeholder={passwordDecoded}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit">{loginDecoded}</button>
          <div className="divider"><span>{orDecoded}</span></div>

          <button
            type="button"
            className="google-btn"
            onClick={() => googleFormRef.current?.requestSubmit()}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleDecoded}
          </button>
          <button type="button" className="github-btn" disabled>
            <svg className="github-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {githubDecoded}
          </button>

          <p className="message">
            {notRegDecoded}{" "}
            <span className="message-link-disabled">{createAcctDec}</span>
          </p>
        </form>
      </div>

      <p className="login-copyright">© {new Date().getFullYear()} 42LABS</p>

      <form ref={googleFormRef} action={googleAction} hidden />
    </div>
  );
}
