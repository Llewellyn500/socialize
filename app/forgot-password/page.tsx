import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset for your Socialize account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="A clean way back in."
      description="Request a time-limited reset link by email. Your existing profile and links stay exactly where you left them."
      context="Account recovery"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
