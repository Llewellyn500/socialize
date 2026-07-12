"use client";

import { FormEvent, useState } from "react";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { FiAlertCircle, FiLock } from "react-icons/fi";
import {
  providerLabel,
  type AuthProviderId,
} from "@/lib/auth-providers";
import {
  signInAndLinkPendingCredential,
  type PendingProviderLink,
} from "@/lib/auth-linking";
import { getFirebaseAuthError } from "./firebase-errors";
import styles from "./auth.module.css";

type LinkAccountPromptProps = {
  pendingLink: PendingProviderLink;
  emailPassword?: { email: string; password: string };
  onComplete: () => void;
  onCancel: () => void;
};

export function LinkAccountPrompt({
  pendingLink,
  emailPassword,
  onComplete,
  onCancel,
}: LinkAccountPromptProps) {
  const [password, setPassword] = useState(emailPassword?.password ?? "");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oauthMethods = pendingLink.methods.filter((method) => method !== "password");
  const supportsPassword = pendingLink.methods.includes("password");

  async function handleProvider(providerId: AuthProviderId) {
    setError(null);
    setPendingAction(providerId);
    try {
      await signInAndLinkPendingCredential(
        providerId,
        pendingLink.pendingCredential,
        providerId === "password" && emailPassword
          ? { email: emailPassword.email, password }
          : providerId === "password"
            ? { email: pendingLink.email, password }
            : undefined,
      );
      onComplete();
    } catch (linkError) {
      setError(getFirebaseAuthError(linkError));
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Enter the password for this account.");
      return;
    }
    await handleProvider("password");
  }

  return (
    <div className={styles.linkPrompt} role="region" aria-label="Link sign-in methods">
      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <FiLock aria-hidden="true" />
        <p>
          <strong>{pendingLink.email}</strong> already has a Socialize account. Sign in with
          your existing method to link this new one, then you can use either next time.
        </p>
      </div>

      {error ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <FiAlertCircle aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {supportsPassword ? (
        <form className={styles.form} onSubmit={handlePasswordSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="link-password">
              Password for {pendingLink.email}
            </label>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                id="link-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                disabled={pendingAction !== null}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={pendingAction !== null}
          >
            {pendingAction === "password" ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : null}
            Sign in with {providerLabel("password")}
          </button>
        </form>
      ) : null}

      {oauthMethods.length > 0 ? (
        <div className={styles.providerGrid}>
          {oauthMethods.includes("google.com") ? (
            <button
              className={styles.providerButton}
              type="button"
              disabled={pendingAction !== null}
              onClick={() => void handleProvider("google.com")}
            >
              {pendingAction === "google.com" ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <FaGoogle aria-hidden="true" />
              )}
              Continue with Google
            </button>
          ) : null}
          {oauthMethods.includes("github.com") ? (
            <button
              className={styles.providerButton}
              type="button"
              disabled={pendingAction !== null}
              onClick={() => void handleProvider("github.com")}
            >
              {pendingAction === "github.com" ? (
                <span className={styles.spinner} aria-hidden="true" />
              ) : (
                <FaGithub aria-hidden="true" />
              )}
              Continue with GitHub
            </button>
          ) : null}
        </div>
      ) : null}

      <button className={styles.linkPromptCancel} type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
