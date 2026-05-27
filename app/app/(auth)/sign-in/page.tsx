import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { SplashLogin } from "./SplashLogin";

export const metadata = { title: "Sign in — LENS" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";

  async function googleSignIn() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  return (
    <SplashLogin
      googleAction={googleSignIn}
      initialError={params.error ? "Sign-in failed. Try again." : undefined}
    />
  );
}
