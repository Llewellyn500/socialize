import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = {
  title: "Create your profile",
  description: "Claim a Socialize handle and create your developer profile.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <AuthShell
      title="Start with the part people remember."
      description="Claim a concise handle and add enough context for visitors to understand what you make. Links come next."
      context="Profile setup"
      wide
    >
      <OnboardingForm />
    </AuthShell>
  );
}
