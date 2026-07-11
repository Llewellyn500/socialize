import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Socialize account and publish your developer link page.",
};

export default function SignUpPage() {
  return (
    <AuthShell
      title="Give your work one good address."
      description="Create a hosted developer profile without giving up the option to export your data or self-host later."
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
