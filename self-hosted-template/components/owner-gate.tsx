"use client";

import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { hasOwnerAccess } from "@/lib/owner-access";

export function OwnerGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "setup">("checking");

  useEffect(() => {
    const services = getFirebaseServices();

    if (!services) {
      setState("setup");
      return;
    }

    return onAuthStateChanged(services.auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        if (await hasOwnerAccess(user)) {
          setState("allowed");
          return;
        }
      } catch {
        // The redirect below is the safe fallback for token errors.
      }

      await signOut(services.auth);
      router.replace("/login?error=not-owner");
    });
  }, [router]);

  if (state === "allowed") {
    return children;
  }

  if (state === "setup") {
    return (
      <main className="gate-page">
        <div className="gate-panel">
          <ShieldCheck aria-hidden="true" size={34} weight="duotone" />
          <h1>Connect your backend first</h1>
          <p>The private workspace stays closed until the backend environment values are present.</p>
          <Link className="primary-button" href="/">Return to profile</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="gate-page" aria-live="polite">
      <div className="gate-panel gate-loading">
        <span className="skeleton-line skeleton-short" />
        <span className="skeleton-line" />
        <span className="skeleton-line" />
        <p>Checking owner access</p>
      </div>
    </main>
  );
}
