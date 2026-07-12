"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { FiAlertCircle, FiCheck, FiInfo, FiMail } from "react-icons/fi";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { loadProfile } from "@/lib/profile-store";
import { AppLoadingState } from "@/components/app-loading-state";
import { getFirebaseAuthError } from "./firebase-errors";
import styles from "./auth.module.css";

export function VerifyEmailPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const isReady = isFirebaseConfigured && Boolean(auth);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setIsLoadingUser(false);
      return;
    }
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setIsLoadingUser(false);
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleCheck() {
    if (!user) return;
    setError(null);
    setMessage(null);
    setPendingAction("check");
    try {
      await user.reload();
      const refreshedUser = auth?.currentUser;
      if (!refreshedUser?.emailVerified) {
        setError(
          "This address is not verified yet. Open the newest email, then check again.",
        );
        return;
      }

      setMessage("Email verified. Opening your workspace...");
      try {
        const profile = await loadProfile(refreshedUser.uid);
        router.push(profile ? "/dashboard" : "/onboarding");
      } catch {
        router.push("/onboarding");
      }
    } catch (authError) {
      setError(getFirebaseAuthError(authError));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleResend() {
    if (!user || cooldown > 0) return;
    setError(null);
    setMessage(null);
    setPendingAction("resend");
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email`,
      });
      setCooldown(30);
      setMessage("A new verification email is on its way.");
    } catch (authError) {
      setError(getFirebaseAuthError(authError));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDifferentAccount() {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    setPendingAction("sign-out");
    try {
      await signOut(firebaseAuth);
      router.push("/sign-in");
    } finally {
      setPendingAction(null);
    }
  }

  if (!isReady) {
    return (
      <>
        <div className={styles.formHeading}>
          <h2>Email verification</h2>
          <p>Confirm your address before you claim a public profile handle.</p>
        </div>
        <div className={`${styles.notice} ${styles.noticeInfo}`} role="status">
          <FiInfo aria-hidden="true" />
          <p>
            Verification is unavailable until this deployment is connected to a
            cloud account service.
          </p>
        </div>
      </>
    );
  }

  if (isLoadingUser) {
    return (
      <AppLoadingState
        description="Checking your sign-in session…"
        inline
        label="Loading account"
        title="Loading your account."
      />
    );
  }

  if (!user) {
    return (
      <div className={styles.confirmation}>
        <span className={styles.confirmationIcon}>
          <FiMail aria-hidden="true" />
        </span>
        <h2>Sign in to verify</h2>
        <p>
          This browser does not have an active Socialize session. Sign in with the
          account whose email you want to verify.
        </p>
        <Link className={styles.primaryButton} href="/sign-in">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (user.emailVerified) {
    return (
      <div className={styles.confirmation}>
        <span className={styles.confirmationIcon}>
          <FiCheck aria-hidden="true" />
        </span>
        <h2>Your email is verified</h2>
        <p>Your account is ready. Continue to claim a handle or open your workspace.</p>
        <button className={styles.primaryButton} type="button" onClick={handleCheck}>
          Continue to Socialize
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.formHeading}>
        <h2>Check your inbox</h2>
        <p>
          Open the verification email we sent, then return here to continue.
          Check spam or promotions if it does not arrive.
        </p>
      </div>

      <span className={styles.emailBadge}>{user.email ?? "Your account email"}</span>

      {error ? (
        <div
          className={`${styles.notice} ${styles.noticeError} ${styles.noticeSpaced}`}
          role="alert"
        >
          <FiAlertCircle aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {message ? (
        <div
          className={`${styles.notice} ${styles.noticeSuccess} ${styles.noticeSpaced}`}
          role="status"
        >
          <FiCheck aria-hidden="true" />
          <p>{message}</p>
        </div>
      ) : null}

      <div className={`${styles.inlineActions} ${styles.actionsSpaced}`}>
        <button
          className={styles.primaryButton}
          type="button"
          disabled={pendingAction !== null}
          onClick={handleCheck}
        >
          {pendingAction === "check" ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : null}
          {pendingAction === "check" ? "Checking status..." : "I verified my email"}
        </button>
        <button
          className={styles.secondaryButton}
          type="button"
          disabled={pendingAction !== null || cooldown > 0}
          onClick={handleResend}
        >
          {pendingAction === "resend" ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : null}
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </button>
      </div>

      <button
        className={`${styles.textButton} ${styles.textButtonSpaced}`}
        type="button"
        disabled={pendingAction !== null}
        onClick={handleDifferentAccount}
      >
        Use a different account
      </button>
    </>
  );
}
