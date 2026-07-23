"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { FiAlertCircle, FiCheck, FiInfo } from "react-icons/fi";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getFirebaseAuthError } from "./firebase-errors";
import styles from "./auth.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isReady = isFirebaseConfigured && Boolean(auth);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setError("Accounts are not configured for this deployment.");
      return;
    }

    const normalizedEmail = email.trim();
    setIsSending(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, normalizedEmail, {
        url: `${window.location.origin}/sign-in`,
      });
      setSubmittedEmail(normalizedEmail);
    } catch (authError) {
      const code =
        typeof authError === "object" && authError && "code" in authError
          ? String(authError.code)
          : "";
      if (code === "auth/user-not-found") {
        setSubmittedEmail(normalizedEmail);
      } else {
        setError(getFirebaseAuthError(authError));
      }
    } finally {
      setIsSending(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className={styles.confirmation}>
        <span className={styles.confirmationIcon}>
          <FiCheck aria-hidden="true" />
        </span>
        <h2>Check your inbox</h2>
        <p>
          If an account exists for this address, we have sent a password reset
          link. It may take a minute to arrive.
        </p>
        <span className={styles.emailBadge}>{submittedEmail}</span>
        <div className={styles.inlineActions}>
          <Link className={styles.primaryButton} href="/sign-in">
            Return to sign in
          </Link>
          <button
            className={styles.textButton}
            type="button"
            onClick={() => setSubmittedEmail(null)}
          >
            Try another email
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.formHeading}>
        <h2>Reset your password</h2>
        <p>
          Enter the email on your account. We will send a secure reset link if
          it recognizes the address.
        </p>
      </div>

      {!isReady ? (
        <div className={`${styles.notice} ${styles.noticeInfo}`} role="status">
          <FiInfo aria-hidden="true" />
          <p>
            Password reset is unavailable until this deployment is connected to a
            cloud account service.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <FiAlertCircle aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-email">
            Email address
          </label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              id="reset-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              placeholder="you@example.com"
              disabled={isSending}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={!isReady || isSending}
        >
          {isSending ? <span className={styles.spinner} aria-hidden="true" /> : null}
          {isSending ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>

      <p className={styles.authMeta}>
        Remembered it? <Link href="/sign-in">Return to sign in</Link>
      </p>
    </>
  );
}
