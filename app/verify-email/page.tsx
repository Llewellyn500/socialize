import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify the email address attached to your Socialize account.",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Confirm the human behind the handle."
      description="Email verification protects your account and keeps public profile addresses tied to real owners."
      context="Account security"
    >
      <VerifyEmailPanel />
    </AuthShell>
  );
}
