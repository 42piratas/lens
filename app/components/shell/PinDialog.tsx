"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { pinUrlSchema, type Pin } from "@/lib/pinboard/schema";
import { WorkspaceIconPicker } from "./WorkspaceIconPicker";
import { PinIcon } from "./PinIcon";

export type PinDialogMode =
  | { kind: "create" }
  | { kind: "edit"; pin: Pin };

type IconChoice = "favicon" | "lucide";

export function PinDialog({
  mode,
  onClose,
  onConfirmCreate,
  onConfirmEdit,
}: {
  mode: PinDialogMode;
  onClose: () => void;
  onConfirmCreate: (input: { label: string; url: string; icon: string }) => void;
  onConfirmEdit: (id: string, input: { label: string; url: string; icon: string }) => void;
}) {
  const isEdit = mode.kind === "edit";
  const initialPin = isEdit ? mode.pin : null;

  const [url, setUrl] = useState(initialPin?.url ?? "");
  const [label, setLabel] = useState(initialPin?.label ?? "");
  const [iconChoice, setIconChoice] = useState<IconChoice>(
    initialPin && initialPin.icon ? "lucide" : "favicon",
  );
  const [iconName, setIconName] = useState(initialPin?.icon ?? "");
  const [touched, setTouched] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const urlCheck = pinUrlSchema.safeParse(url);
  const urlOk = urlCheck.success;
  const urlError = touched && !urlOk;

  const submit = () => {
    setTouched(true);
    if (!urlOk) return;
    const cleanIcon = iconChoice === "lucide" ? iconName.trim() : "";
    const payload = { label: label.trim(), url: urlCheck.data, icon: cleanIcon };
    if (isEdit && initialPin) onConfirmEdit(initialPin.id, payload);
    else onConfirmCreate(payload);
  };

  return (
    <div className="lens-ws-dialog-backdrop" onClick={onClose}>
      <div
        className="lens-ws-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit pin" : "New pin"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lens-ws-dialog-header">
          <h2 className="lens-ws-dialog-title">{isEdit ? "Edit pin" : "New pin"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="lens-ws-dialog-close"
            aria-label="Close"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="lens-ws-dialog-body">
          <label className="lens-ws-dialog-field">
            <span className="lens-ws-dialog-label">URL</span>
            <input
              ref={urlInputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="https://example.com"
              className="lens-ws-dialog-input"
              aria-invalid={urlError ? "true" : undefined}
            />
            {urlError ? (
              <span className="lens-pin-dialog-error">Must be an http(s) URL</span>
            ) : null}
          </label>

          <label className="lens-ws-dialog-field">
            <span className="lens-ws-dialog-label">Label (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              maxLength={80}
              placeholder={urlOk ? new URL(urlCheck.data).host : "Site name"}
              className="lens-ws-dialog-input"
            />
          </label>

          <div className="lens-ws-dialog-field">
            <span className="lens-ws-dialog-label">Icon</span>
            <div className="lens-segmented lens-pin-icon-mode" role="radiogroup" aria-label="Icon source">
              <button
                type="button"
                role="radio"
                aria-checked={iconChoice === "favicon"}
                onClick={() => setIconChoice("favicon")}
                className="lens-segmented-btn"
                data-pressed={iconChoice === "favicon" ? "true" : undefined}
              >
                Favicon
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={iconChoice === "lucide"}
                onClick={() => setIconChoice("lucide")}
                className="lens-segmented-btn"
                data-pressed={iconChoice === "lucide" ? "true" : undefined}
              >
                Lucide
              </button>
            </div>
            {iconChoice === "favicon" && urlOk ? (
              <div className="lens-pin-icon-preview" aria-hidden>
                <PinIcon iconName="" url={urlCheck.data} size={20} />
              </div>
            ) : null}
            {iconChoice === "lucide" ? (
              <WorkspaceIconPicker selected={iconName || "globe"} onSelect={setIconName} />
            ) : null}
          </div>
        </div>

        <div className="lens-ws-dialog-footer">
          <button type="button" onClick={onClose} className="lens-ws-dialog-btn lens-ws-dialog-btn--ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!urlOk}
            className="lens-ws-dialog-btn lens-ws-dialog-btn--primary"
          >
            {isEdit ? "Save" : "Add pin"}
          </button>
        </div>
      </div>
    </div>
  );
}
