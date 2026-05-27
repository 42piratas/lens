import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/shell/SessionProvider";
import { ConditionalShell } from "@/components/shell/ConditionalShell";
import { PluginWorkerBootstrap } from "@/components/shell/PluginWorkerBootstrap";
import { WorkspaceSyncBridge } from "@/lib/workspace/SyncBridge";
import { ScratchpadSyncBridge } from "@/connectors/scratchpad/SyncBridge";
import { PinboardSyncBridge } from "@/lib/pinboard/SyncBridge";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/bootstrap";
import { PREFS_BOOTSTRAP_SCRIPT } from "@/lib/prefs/bootstrap";
import { PrefsHydrator } from "@/lib/prefs/PrefsHydrator";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LENS",
  description: "Bento dashboard for your day",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plex.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <SessionProvider>
          <QueryProvider>
            <PrefsHydrator />
            <PluginWorkerBootstrap />
            <WorkspaceSyncBridge />
            <ScratchpadSyncBridge />
            <PinboardSyncBridge />
            <ConditionalShell modal={modal}>{children}</ConditionalShell>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
