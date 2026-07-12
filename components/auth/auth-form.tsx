"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GithubAuthProvider,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FaGithub, FaGoogle } from "react-icons/fa";
import {
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiInfo,
} from "react-icons/fi";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { captureGitHubLoginFromCredential } from "@/lib/auth-providers";
import { readPendingProviderLink, type PendingProviderLink } from "@/lib/auth-linking";
import { loadProfile } from "@/lib/profile-store";
import { getFirebaseAuthError } from "./firebase-errors";
import { LinkAccountPrompt } from "./link-account-prompt";
import styles from "./auth.module.css";

type AuthMode = "sign-in" | "sign-up";
type ProviderName = "google" | "github";
const TERMS_VERSION = "2026-07-11";

async function recordTermsAcceptance(user: User) {
  if (!db) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      email: user.email,
      displayName: user.displayName,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: TERMS_VERSION,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function getPostAuthRoute(user: User) {
  const usesPassword = user.providerData.some(
    (provider) => provider.providerId === "password",
  );

  if (usesPassword && !user.emailVerified) return "/verify-email";

  try {
    const profile = await loadProfile(user.uid);
    return profile ? "/dashboard" : "/onboarding";
  } catch {
    return "/dashboard";
  }
}

export function AuthForm({ mode, returnTo }: { mode: AuthMode; returnTo?: string }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingProviderLink | null>(null);

  const isBusy = pendingAction !== null;
  const isReady = isFirebaseConfigured && Boolean(auth);

  function validateSignUp() {
    if (displayName.trim().length < 2) {
      return "Enter the name you want people to see on your profile.";
    }
    if (password.length < 8) {
      return "Create a password with at least 8 characters.";
    }
    if (password !== confirmPassword) {
      return "The passwords do not match.";
    }
    if (!acceptedTerms) {
      return "Accept the Terms and Privacy Policy before creating an account.";
    }
    return null;
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setError("Accounts are not configured for this deployment.");
      return;
    }

    if (isSignUp) {
      const validationError = validateSignUp();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setPendingAction("email");
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        );
        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });
        await recordTermsAcceptance(credential.user);
        try {
          await sendEmailVerification(credential.user, {
            url: `${window.location.origin}/verify-email`,
          });
        } catch {
          // The verification screen includes a resend action if delivery fails.
        }
        router.push("/verify-email");
        return;
      }

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );
      const route = await getPostAuthRoute(credential.user);
      router.push(returnTo && route === "/dashboard" ? returnTo : route);
    } catch (authError) {
      const linkPrompt = await readPendingProviderLink(authError);
      if (linkPrompt) {
        setPendingLink(linkPrompt);
        setError(null);
      } else {
        setError(getFirebaseAuthError(authError));
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function finishLinkedSignIn(user: User) {
    const route = await getPostAuthRoute(user);
    router.push(returnTo && route === "/dashboard" ? returnTo : route);
  }

  async function handleProvider(providerName: ProviderName) {
    setError(null);

    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setError("Accounts are not configured for this deployment.");
      return;
    }
    if (isSignUp && !acceptedTerms) {
      setError("Accept the Terms and Privacy Policy before creating an account.");
      return;
    }

    setPendingAction(providerName);
    try {
      const provider =
        providerName === "google"
          ? new GoogleAuthProvider()
          : new GithubAuthProvider();

      if (providerName === "google") {
        provider.setCustomParameters({ prompt: "select_account" });
      } else {
        provider.addScope("read:user");
      }

      const result = await signInWithPopup(firebaseAuth, provider);
      if (providerName === "github") {
        await captureGitHubLoginFromCredential(result);
      }
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
      if (isSignUp) await recordTermsAcceptance(result.user);
      const route = isNewUser ? "/onboarding" : await getPostAuthRoute(result.user);
      router.push(returnTo && route === "/dashboard" ? returnTo : route);
    } catch (authError) {
      const linkPrompt = await readPendingProviderLink(authError);
      if (linkPrompt) {
        setPendingLink(linkPrompt);
        setError(null);
      } else {
        setError(getFirebaseAuthError(authError));
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <div className={styles.formHeading}>
        <h2>{isSignUp ? "Create your account" : "Welcome back"}</h2>
        <p>
          {isSignUp
            ? "Choose a sign-in method. You will claim your Socialize handle next."
            : "Sign in to edit your profile, publish links, and manage your hosted page."}
        </p>
      </div>

      {!isReady ? (
        <div className={`${styles.notice} ${styles.noticeInfo}`} role="status">
          <FiInfo aria-hidden="true" />
          <p>
            Authentication is not configured yet. Add the public environment values
            to this deployment, then enable Email, Google, and GitHub sign-in.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <FiAlertCircle aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {pendingLink ? (
        <LinkAccountPrompt
          pendingLink={pendingLink}
          emailPassword={
            isSignUp
              ? { email: email.trim(), password }
              : undefined
          }
          onComplete={() => {
            setPendingLink(null);
            const currentUser = auth?.currentUser;
            if (currentUser) void finishLinkedSignIn(currentUser);
          }}
          onCancel={() => setPendingLink(null)}
        />
      ) : (
        <>
      <div className={styles.providerGrid}>
        <button
          className={styles.providerButton}
          type="button"
          disabled={!isReady || isBusy}
          onClick={() => handleProvider("google")}
        >
          {pendingAction === "google" ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : (
            <FaGoogle aria-hidden="true" />
          )}
          Continue with Google
        </button>
        <button
          className={styles.providerButton}
          type="button"
          disabled={!isReady || isBusy}
          onClick={() => handleProvider("github")}
        >
          {pendingAction === "github" ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : (
            <FaGithub aria-hidden="true" />
          )}
          Continue with GitHub
        </button>
      </div>

      <div className={styles.divider}>or use email</div>

      <form className={styles.form} onSubmit={handleEmailSubmit} noValidate>
        {isSignUp ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="display-name">
              Display name
            </label>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                id="display-name"
                name="displayName"
                type="text"
                autoComplete="name"
                maxLength={60}
                required
                value={displayName}
                placeholder="Ada Lovelace"
                disabled={isBusy}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email address
          </label>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              placeholder="you@example.com"
              disabled={isBusy}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelLine}>
            <label htmlFor="password">Password</label>
            {!isSignUp ? <Link href="/forgot-password">Forgot password?</Link> : null}
          </div>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={isSignUp ? 8 : undefined}
              required
              value={password}
              placeholder={isSignUp ? "At least 8 characters" : "Your password"}
              disabled={isBusy}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className={styles.passwordToggle}
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={isBusy}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
            </button>
          </div>
        </div>

        {isSignUp ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm-password">
              Confirm password
            </label>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                id="confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                placeholder="Repeat your password"
                disabled={isBusy}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {isSignUp ? (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              disabled={isBusy}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              I agree to the <Link href="/terms">Terms</Link> and acknowledge the{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>
        ) : null}

        <button
          className={styles.primaryButton}
          type="submit"
          disabled={!isReady || isBusy}
        >
          {pendingAction === "email" ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : null}
          {pendingAction === "email"
            ? isSignUp
              ? "Creating account..."
              : "Signing in..."
            : isSignUp
              ? "Create account"
              : "Sign in with email"}
        </button>
      </form>

      <p className={styles.authMeta}>
        {isSignUp ? "Already have an account?" : "New to Socialize?"}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
        </>
      )}
    </>
  );
}
