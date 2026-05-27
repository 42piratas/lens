import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { signSupabaseAccessToken } from "@/lib/auth/supabase-jwt";
import { persistOAuthTokens } from "@/lib/auth/persist-oauth-tokens";
import { mirrorPublicUser } from "@/lib/auth/mirror-user";
import { GOOGLE_BASE_SCOPES } from "@/lib/auth/google-scopes";

export const { auth, handlers, signIn, signOut } = NextAuth({
  // Build-time placeholders: Next.js evaluates this module during page-data
  // collection, before runtime envs land. The deploy target overrides both.
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.invalid",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder",
  }),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_BASE_SCOPES.join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user?.id) token.sub = user.id;
      // `hd` (hosted domain) is the Workspace claim from Google's id_token /
      // userinfo. Personal Gmail accounts carry no `hd`; Workspace accounts
      // carry the org's primary domain. Captured here so the session callback
      // can expose it to client code (Keep connector gate, b02-12).
      if (profile && typeof (profile as { hd?: unknown }).hd === "string") {
        token.hd = (profile as { hd: string }).hd;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        const supabaseAccessToken = await signSupabaseAccessToken(token.sub);
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub,
            hd: typeof token.hd === "string" ? token.hd : null,
          },
          supabaseAccessToken,
        };
      }
      return session;
    },
  },
  events: {
    // Fires once per new next_auth.users insertion. Mirror happens AFTER the
    // adapter has written the upstream row so the FK in public.users is
    // satisfiable.
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      await mirrorPublicUser({
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      });
    },
    // Fires on every successful sign-in. Persist (or refresh) the per-user
    // OAuth tokens. Skipped when account is absent (e.g. session refresh).
    async signIn({ user, account }) {
      if (!user.id || !account) return;
      await persistOAuthTokens({
        userId: user.id,
        provider: account.provider as "google" | "trello",
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        expiresAt: account.expires_at ?? null,
        scopes: account.scope?.split(" ") ?? [],
      });
    },
  },
});
