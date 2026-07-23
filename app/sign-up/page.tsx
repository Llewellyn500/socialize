import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a free Socialize account and publish your developer link page.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Give your work one good address."
      description="Create a free hosted developer profile, then export a structured backup if you later move to the self-hosted starter."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
