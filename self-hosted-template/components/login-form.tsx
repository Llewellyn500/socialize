"use client";

import {
  GithubLogo,
  GoogleLogo,
  LockKey,
  SignIn
} from "@phosphor-icons/react";
import { FirebaseError } from "firebase/app";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type UserCredential
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { firebaseIsConfigured, getFirebaseServices } from "@/lib/firebase";
import { hasOwnerAccess } from "@/lib/owner-access";
import { selfHostedConfig } from "@/profile.config";

type LoginState = "idle" | "working";

function readableAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Sign-in failed. Check the account and try again.";
  }

  const messages: Record<string, string> = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/popup-closed-by-user": "The sign-in window was closed before it finished.",
    "auth/account-exists-with-different-credential": "Use the provider already linked to this email.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again."
  };

  return messages[error.code] ?? "Firebase could not complete sign-in. Check the provider configuration.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(
    selfHostedConfig.ownerEmail === "you@example.com" ? "" : selfHostedConfig.ownerEmail
  );
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState(
    searchParams.get("error") === "not-owner" ? "That account does not have owner access." : ""
  );

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) return;

    return onAuthStateChanged(services.auth, async (user) => {
      if (!user) return;
      try {
        if (await hasOwnerAccess(user)) {
          router.replace("/manage");
        }
      } catch {
        // The form remains available and reports errors from explicit sign-in attempts.
      }
    });
  }, [router]);

  async function finishSignIn(credential: UserCredential) {
    if (!(await hasOwnerAccess(credential.user))) {
      const services = getFirebaseServices();
      if (services) await signOut(services.auth);
      throw new Error("not-owner");
    }

    router.replace("/manage");
  }

  async function runSignIn(action: () => Promise<UserCredential>) {
    setState("working");
    setError("");

    try {
      await finishSignIn(await action());
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "not-owner"
        ? "That account does not have owner access."
        : readableAuthError(caught));
      setState("idle");
    }
  }

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const services = getFirebaseServices();
    if (!services) return;
    await runSignIn(() => signInWithEmailAndPassword(services.auth, email, password));
  }

  const services = getFirebaseServices();

  if (!firebaseIsConfigured || !services) {
    return (
      <section className="auth-card setup-card" aria-live="polite">
        <LockKey aria-hidden="true" size={30} weight="duotone" />
        <h2>Firebase setup needed</h2>
        <p>Copy <code>.env.example</code> to <code>.env.local</code>, then add the web app values from Firebase Console.</p>
      </section>
    );
  }

  const disabled = state === "working";

  return (
    <section className="auth-card" aria-label="Owner sign in">
      <div className="provider-stack">
        <button
          className="provider-button"
          disabled={disabled}
          onClick={() => runSignIn(() => signInWithPopup(services.auth, new GoogleAuthProvider()))}
          type="button"
        >
          <GoogleLogo aria-hidden="true" size={20} weight="bold" />
          Continue with Google
        </button>
        <button
          className="provider-button"
          disabled={disabled}
          onClick={() => runSignIn(() => signInWithPopup(services.auth, new GithubAuthProvider()))}
          type="button"
        >
          <GithubLogo aria-hidden="true" size={20} weight="fill" />
          Continue with GitHub
        </button>
      </div>

      <div className="form-divider"><span>or use email</span></div>

      <form className="auth-form" onSubmit={handleEmail}>
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@example.com"
          required
          type="email"
          value={email}
        />

        <label htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          id="password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />

        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <button className="primary-button" disabled={disabled} type="submit">
          <SignIn aria-hidden="true" size={19} weight="bold" />
          {disabled ? "Checking access" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
