"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged, unlink, type User } from "firebase/auth";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { FiCheck, FiLock, FiMail } from "react-icons/fi";
import {
  hasAuthProvider,
  primaryAuthEmail,
  providerLabel,
  type AuthProviderId,
} from "@/lib/auth-providers";
import {
  linkEmailPassword,
  linkGithub,
  linkGoogle,
} from "@/lib/auth-linking";
import { auth } from "@/lib/firebase";
import { getFirebaseAuthError } from "@/components/auth/firebase-errors";
import styles from "./dashboard-app.module.css";

const PROVIDERS: AuthProviderId[] = ["password", "google.com", "github.com"];

function providerIcon(providerId: AuthProviderId) {
  if (providerId === "google.com") return <FaGoogle aria-hidden="true" />;
  if (providerId === "github.com") return <FaGithub aria-hidden="true" />;
  return <FiMail aria-hidden="true" />;
}

export function LinkedSignInMethods() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
  }, []);

  if (!user) {
    return (
      <p className={styles.signInMethodsHint}>
        Sign in with a connected account to manage linked sign-in methods.
      </p>
    );
  }

  const accountEmail = primaryAuthEmail(user);

  async function runAction(actionId: string, task: () => Promise<void>) {
    setMessage(null);
    setPendingAction(actionId);
    try {
      await task();
      setMessage({ tone: "success", text: "Sign-in method updated." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({ tone: "error", text: getFirebaseAuthError(error) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLinkProvider(providerId: AuthProviderId) {
    if (!user) return;

    if (providerId === "google.com") {
      await runAction(providerId, async () => {
        await linkGoogle(user);
      });
      return;
    }

    if (providerId === "github.com") {
      await runAction(providerId, async () => {
        await linkGithub(user);
      });
    }
  }

  async function handleLinkPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!accountEmail) {
      setMessage({
        tone: "error",
        text: "Your account needs an email address before you can add a password.",
      });
      return;
    }
    if (password.length < 8) {
      setMessage({ tone: "error", text: "Use a password with at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ tone: "error", text: "The passwords do not match." });
      return;
    }

    await runAction("password", async () => {
      await linkEmailPassword(user, accountEmail, password);
    });
  }

  async function handleUnlink(providerId: AuthProviderId) {
    if (!user) return;
    await runAction(`unlink-${providerId}`, async () => {
      await unlink(user, providerId);
    });
  }

  return (
    <div className={styles.signInMethods}>
      <p className={styles.signInMethodsHint}>
        Link email, Google, and GitHub to the same account so you can sign in with any of them.
        {accountEmail ? ` Primary email: ${accountEmail}.` : ""}
      </p>

      {message ? (
        <p className={styles.signInMethodsStatus} data-tone={message.tone}>
          {message.text}
        </p>
      ) : null}

      <ul className={styles.signInMethodsList}>
        {PROVIDERS.map((providerId) => {
          const linked = hasAuthProvider(user, providerId);
          return (
            <li className={styles.signInMethodRow} key={providerId}>
              <div className={styles.signInMethodCopy}>
                <span className={styles.signInMethodIcon}>{providerIcon(providerId)}</span>
                <div>
                  <strong>{providerLabel(providerId)}</strong>
                  <small>{linked ? "Linked to this account" : "Not linked yet"}</small>
                </div>
              </div>
              {linked ? (
                <span className={styles.signInMethodLinked}>
                  <FiCheck aria-hidden="true" /> Linked
                </span>
              ) : providerId === "password" ? (
                <span className={styles.signInMethodPending}>
                  <FiLock aria-hidden="true" /> Add below
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => void handleLinkProvider(providerId)}
                >
                  {pendingAction === providerId ? "Linking…" : "Link"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!hasAuthProvider(user, "password") ? (
        <form className={styles.signInMethodForm} onSubmit={handleLinkPassword}>
          <strong>Add email password sign-in</strong>
          <p>Use your account email and a new password to enable email sign-in.</p>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              disabled={pendingAction !== null}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              disabled={pendingAction !== null}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={pendingAction !== null || !accountEmail}>
            {pendingAction === "password" ? "Saving…" : "Link email password"}
          </button>
        </form>
      ) : null}

      <div className={styles.signInMethodUnlink}>
        {PROVIDERS.filter((providerId) => hasAuthProvider(user, providerId)).map((providerId) => (
          <button
            key={`unlink-${providerId}`}
            type="button"
            disabled={pendingAction !== null || user.providerData.length <= 1}
            onClick={() => void handleUnlink(providerId)}
          >
            Unlink {providerLabel(providerId)}
          </button>
        ))}
      </div>
    </div>
  );
}
