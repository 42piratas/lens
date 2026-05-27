"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { isWorkspaceIconName } from "@/lib/workspace/icons";
import { WorkspaceIcon } from "./WorkspaceIcon";

/**
 * Renders a pin's visual.
 *
 * - When `iconName` is non-empty and resolves to a lucide name → render the
 *   lucide glyph via `WorkspaceIcon` (reuses the workspace registry).
 * - Otherwise → fetch the favicon for `url` via the server-side proxy.
 * - If both fail → show a Globe fallback.
 */
export function PinIcon({
  iconName,
  url,
  size = 18,
}: {
  iconName: string;
  url: string;
  size?: number;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  if (iconName && isWorkspaceIconName(iconName)) {
    return <WorkspaceIcon name={iconName} size={size} />;
  }

  if (faviconFailed) {
    return <Globe size={size} strokeWidth={1.75} aria-hidden />;
  }

  const src = `/api/pinboard/favicon?url=${encodeURIComponent(url)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="lens-pin-favicon"
      onError={() => setFaviconFailed(true)}
    />
  );
}
