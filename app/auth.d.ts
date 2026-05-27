import "next-auth";
import "next-auth/jwt";
import "@auth/core/types";
import "@auth/core/jwt";

declare module "@auth/core/types" {
  interface Session {
    supabaseAccessToken?: string;
  }
}

declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    sub?: string;
    /** Google Workspace hosted-domain claim, captured from `profile.hd`. */
    hd?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    /** Google Workspace hosted-domain claim, captured from `profile.hd`. */
    hd?: string;
  }
}
