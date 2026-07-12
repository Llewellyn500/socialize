import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your hosted Socialize developer profile.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; deleted?: string }>;
}) {
  const { returnTo: requestedReturnTo, deleted } = await searchParams;
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : undefined;

  return (
    <AuthShell
      title="Your work, ready when you are."
      description="Return to the place where your projects, writing, and ways to reach you live together."
    >
      <AuthForm
        mode="sign-in"
        returnTo={returnTo}
        notice={
          deleted === "1"
            ? "Your Socialize account and profile were deleted."
            : undefined
        }
      />
    </AuthShell>
  );
}
