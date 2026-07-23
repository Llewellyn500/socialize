"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { type User } from "firebase/auth";
import { FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import { getFirebaseAuthError } from "@/components/auth/firebase-errors";
import { deleteAccount } from "@/lib/delete-account";
import styles from "./dashboard-app.module.css";

type DeleteAccountPanelProps = {
  user: User | null;
  handle: string;
  disabled?: boolean;
};

export function DeleteAccountPanel({
  user,
  handle,
  disabled = false,
}: DeleteAccountPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmHandle, setConfirmHandle] = useState("");
  const [password, setPassword] = useState("");
  const [exported, setExported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerIds = useMemo(
    () => user?.providerData.map((entry) => entry.providerId) ?? [],
    [user],
  );
  const usesOauthReauth = providerIds.some(
    (id) => id === "google.com" || id === "github.com",
  );
  // ponytail: password only when there is no OAuth to re-confirm with
  const needsPassword =
    !usesOauthReauth && providerIds.includes("password");

  const confirmationMatches =
    confirmHandle.trim().replace(/^@/, "").toLowerCase() ===
    handle.trim().replace(/^@/, "").toLowerCase();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError("Sign in before deleting an account.");
      return;
    }
    if (disabled) {
      setError("Wait for image uploads to finish before deleting your account.");
      return;
    }
    if (!exported) {
      setError("Export your profile first, then confirm deletion.");
      return;
    }
    if (!confirmationMatches) {
      setError(`Type @${handle} exactly to confirm.`);
      return;
    }
    if (needsPassword && !password) {
      setError("Enter your password to confirm account deletion.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await deleteAccount(user, {
        password: needsPassword ? password : undefined,
      });
      router.replace("/sign-in?deleted=1");
    } catch (deleteError) {
      setError(getFirebaseAuthError(deleteError));
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className={`${styles.settingsBlock} ${styles.settingsDangerBlock}`}>
      <div>
        <h3>Delete account</h3>
        <p>
          Permanently remove your profile, handle, uploads, and sign-in. Export a
          backup first if you want to keep your data.
        </p>
      </div>
      {!open ? (
        <button
          type="button"
          className={styles.dangerButton}
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
        >
          <FiTrash2 aria-hidden="true" /> Delete account
        </button>
      ) : null}

      {open ? (
        <form className={styles.deleteAccountForm} onSubmit={onSubmit}>
          <p className={styles.deleteAccountWarning}>
            <FiAlertTriangle aria-hidden="true" />
            This cannot be undone. Your public page at /{handle} will disappear.
          </p>

          <label className={styles.deleteAccountCheck}>
            <input
              checked={exported}
              type="checkbox"
              onChange={(event) => setExported(event.target.checked)}
            />
            <span>I already exported my profile JSON (or I do not need a copy).</span>
          </label>

          <label className={styles.deleteAccountField}>
            <span>Type @{handle} to confirm</span>
            <input
              autoComplete="off"
              disabled={busy}
              spellCheck={false}
              value={confirmHandle}
              onChange={(event) => setConfirmHandle(event.target.value)}
            />
          </label>

          {needsPassword ? (
            <label className={styles.deleteAccountField}>
              <span>Password</span>
              <input
                autoComplete="current-password"
                disabled={busy}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          ) : null}

          {usesOauthReauth ? (
            <p className={styles.deleteAccountHint}>
              You will re-confirm with Google or GitHub before deletion finishes.
            </p>
          ) : null}

          {error ? (
            <p className={styles.deleteAccountError} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.deleteAccountActions}>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirmHandle("");
                setPassword("");
                setError(null);
              }}
            >
              Cancel
            </button>
            <button
              className={styles.dangerButton}
              disabled={
                disabled ||
                busy ||
                !exported ||
                !confirmationMatches ||
                (needsPassword && !password)
              }
              type="submit"
            >
              <FiTrash2 aria-hidden="true" />
              {busy ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
