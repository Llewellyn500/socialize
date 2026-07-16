"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FiAlertCircle, FiCheck, FiImage, FiInfo } from "react-icons/fi";
import { uploadUserAvatar } from "@/lib/avatar-upload";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  isValidHandle,
  normalizeHandle,
  type ProfileConfig,
} from "@/lib/profile";
import { loadProfile, saveProfile, isHandleAvailableForUser } from "@/lib/profile-store";
import { AppLoadingState } from "@/components/app-loading-state";
import { getFirebaseAuthError } from "./firebase-errors";
import styles from "./auth.module.css";

function initials(value: string) {
  const characters = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return characters.toUpperCase() || "YOU";
}

export function OnboardingForm() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [existingProfile, setExistingProfile] = useState<ProfileConfig | null>(null);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleAvailability, setHandleAvailability] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const isReady = isFirebaseConfigured && Boolean(auth);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setIsLoadingUser(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsLoadingUser(false);
        return;
      }

      setDisplayName(
        nextUser.displayName?.trim() || nextUser.email?.split("@")[0] || "",
      );
      if (nextUser.photoURL) {
        setAvatarUrl(nextUser.photoURL);
      }
      try {
        const profile = await loadProfile(nextUser.uid);
        setExistingProfile(profile);
      } catch {
        // A profile can still be created if the initial read is unavailable.
      } finally {
        setIsLoadingUser(false);
      }
    });
  }, []);

  const handleError = useMemo(() => {
    if (!handleTouched || !handle) return null;
    if (!isValidHandle(handle)) {
      return "Use 3 to 30 lowercase letters, numbers, or hyphens. Reserved routes are unavailable.";
    }
    if (handleAvailability === "taken") return "That handle is already taken.";
    if (handleAvailability === "error") {
      return "Could not check availability. Try again.";
    }
    return null;
  }, [handle, handleTouched, handleAvailability]);

  const handleHint = useMemo(() => {
    if (handleError) return handleError;
    if (handleAvailability === "checking") return "Checking if this handle is available…";
    if (handleAvailability === "available" && handle) return `@${handle} is available`;
    return "Lowercase letters, numbers, and hyphens only.";
  }, [handle, handleAvailability, handleError]);

  useEffect(() => {
    if (!handle) {
      setHandleAvailability("idle");
      return;
    }
    if (!isValidHandle(handle)) {
      setHandleAvailability("idle");
      return;
    }
    if (!isFirebaseConfigured || !user) {
      setHandleAvailability("available");
      return;
    }

    let cancelled = false;
    setHandleAvailability("checking");
    const timer = window.setTimeout(() => {
      void isHandleAvailableForUser(handle, user.uid)
        .then((available) => {
          if (cancelled) return;
          setHandleAvailability(available ? "available" : "taken");
        })
        .catch(() => {
          if (cancelled) return;
          setHandleAvailability("error");
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [handle, user]);

  const needsVerifiedEmail = Boolean(user && !user.emailVerified);

  async function handleAvatarChange(file: File | undefined) {
    if (!file || !user) return;
    setError(null);
    setIsUploadingAvatar(true);
    try {
      const url = await uploadUserAvatar(user.uid, file);
      setAvatarUrl(url);
      setAvatarFileName(file.name);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The avatar upload failed. Try again.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setHandleTouched(true);

    if (!user) {
      setError("Sign in before claiming a Socialize handle.");
      return;
    }
    if (needsVerifiedEmail) {
      setError("Verify your email before claiming a public handle.");
      return;
    }
    if (!isValidHandle(handle)) {
      setError(
        "Choose a handle with 3 to 30 lowercase letters, numbers, or hyphens.",
      );
      return;
    }
    if (handleAvailability === "checking") {
      setError("Wait for the handle availability check to finish.");
      return;
    }
    if (handleAvailability === "taken") {
      setError("That handle is already taken.");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Enter the name you want visitors to see.");
      return;
    }
    if (isUploadingAvatar) {
      setError("Wait for the avatar upload to finish before continuing.");
      return;
    }

    setIsSaving(true);
    try {
      await user.reload();
      if (!user.emailVerified) {
        setError("Verify your email before claiming a public handle.");
        return;
      }
      await user.getIdToken(true);

      const available = await isHandleAvailableForUser(handle, user.uid);
      if (!available) {
        setHandleAvailability("taken");
        setError("That handle is already taken.");
        return;
      }

      const initialProfile: ProfileConfig = {
        handle,
        displayName: displayName.trim(),
        role: role.trim(),
        bio: bio.trim(),
        ...(avatarUrl ? { avatarUrl } : {}),
        theme: "paper",
        accent: "#8a2be2",
        published: false,
        socials: {},
        links: [],
      };

      await saveProfile(user.uid, initialProfile);
      router.push("/dashboard");
    } catch (saveError) {
      setError(getFirebaseAuthError(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  if (!isReady) {
    return (
      <>
        <div className={styles.formHeading}>
          <h2>Claim your developer handle</h2>
          <p>This step creates the first valid profile document for your workspace.</p>
        </div>
        <div className={`${styles.notice} ${styles.noticeInfo}`} role="status">
          <FiInfo aria-hidden="true" />
          <p>
            Onboarding is unavailable until sign-in and profile storage are
            configured for this deployment.
          </p>
        </div>
      </>
    );
  }

  if (isLoadingUser) {
    return (
      <AppLoadingState
        description="Checking your account and any existing profile…"
        inline
        label="Loading account"
        title="Loading your account."
      />
    );
  }

  if (!user) {
    return (
      <div className={styles.confirmation}>
        <h2>Sign in to continue</h2>
        <p>
          Your handle and profile must be attached to an authenticated Socialize
          account.
        </p>
        <Link className={styles.primaryButton} href="/sign-in">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className={styles.confirmation}>
        <span className={styles.confirmationIcon}>
          <FiCheck aria-hidden="true" />
        </span>
        <h2>Your profile is already set up</h2>
        <p>
          @{existingProfile.handle} belongs to this account. Open the workspace to
          manage links, appearance, and publishing.
        </p>
        <Link className={styles.primaryButton} href="/dashboard">
          Open your workspace
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={styles.formHeading}>
        <h2>Claim your developer handle</h2>
        <p>
          Start with the essentials. Your profile stays unpublished until you add
          links and choose to publish it from the workspace.
        </p>
      </div>

      {needsVerifiedEmail ? (
        <div className={`${styles.notice} ${styles.noticeInfo}`} role="status">
          <FiInfo aria-hidden="true" />
          <p>
            Verify {user.email ?? "your email"} before reserving a public handle.{" "}
            <Link className={styles.inlineLink} href="/verify-email">
              Open verification
            </Link>
          </p>
        </div>
      ) : null}

      {error ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <FiAlertCircle aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className={styles.onboardingGrid}>
        <form className={styles.onboardingFields} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="handle">
              Profile address
            </label>
            <div className={styles.inputWrap}>
              <span className={styles.prefix}>socialize.you/</span>
              <input
                className={`${styles.input} ${styles.prefixedInput}`}
                id="handle"
                name="handle"
                type="text"
                inputMode="url"
                autoComplete="off"
                minLength={3}
                maxLength={30}
                required
                value={handle}
                placeholder="your-handle"
                aria-invalid={Boolean(handleError) || handleAvailability === "taken"}
                aria-describedby="handle-hint"
                disabled={isSaving}
                onBlur={() => setHandleTouched(true)}
                onChange={(event) => setHandle(normalizeHandle(event.target.value))}
              />
            </div>
            <p
              className={styles.hint}
              data-tone={
                handleError || handleAvailability === "taken"
                  ? "error"
                  : handleAvailability === "available"
                    ? "success"
                    : undefined
              }
              id="handle-hint"
            >
              {handleHint}
            </p>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="onboarding-name">
                Display name
              </label>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  id="onboarding-name"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  maxLength={60}
                  required
                  value={displayName}
                  placeholder="Ada Lovelace"
                  disabled={isSaving}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="role">
                Role or focus
              </label>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  id="role"
                  name="role"
                  type="text"
                  maxLength={100}
                  value={role}
                  placeholder="Frontend engineer"
                  disabled={isSaving}
                  onChange={(event) => setRole(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.labelLine}>
              <label htmlFor="bio">Short bio</label>
              <span className={styles.characterCount}>{bio.length}/240</span>
            </div>
            <div className={styles.inputWrap}>
              <textarea
                className={styles.textArea}
                id="bio"
                name="bio"
                maxLength={240}
                value={bio}
                placeholder="What do you build, maintain, or write about?"
                disabled={isSaving}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Profile photo</span>
            <div className={styles.filePicker}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.filePreview} src={avatarUrl} alt="" />
              ) : (
                <span className={styles.filePreviewFallback} aria-hidden="true">
                  {initials(displayName)}
                </span>
              )}
              <div className={styles.filePickerCopy}>
                <label className={styles.fileButton}>
                  <input
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={isSaving || isUploadingAvatar || needsVerifiedEmail}
                    type="file"
                    onChange={(event) => {
                      void handleAvatarChange(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <FiImage aria-hidden="true" />
                  {isUploadingAvatar
                    ? "Uploading…"
                    : avatarUrl
                      ? "Replace photo"
                      : "Choose photo"}
                </label>
                <p className={styles.hint}>
                  {avatarFileName
                    ? avatarFileName
                    : "Optional. JPEG, PNG, WebP, or GIF up to 5 MB."}
                </p>
              </div>
            </div>
          </div>

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={
              isSaving ||
              isUploadingAvatar ||
              needsVerifiedEmail ||
              !isValidHandle(handle) ||
              handleAvailability === "checking" ||
              handleAvailability === "taken" ||
              handleAvailability === "error"
            }
          >
            {isSaving ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {isSaving ? "Reserving your handle..." : "Create my profile"}
          </button>
        </form>

        <aside className={styles.preview} aria-label="Profile preview">
          <div className={styles.previewTop}>
            <span>Profile preview</span>
            <span className={styles.previewDot} aria-hidden="true" />
          </div>
          <div className={styles.previewBody}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.previewAvatarImage} src={avatarUrl} alt="" />
            ) : (
              <span className={styles.previewAvatar}>{initials(displayName)}</span>
            )}
            <p className={styles.previewHandle}>@{handle || "your-handle"}</p>
            <h3 className={styles.previewName}>{displayName || "Your name"}</h3>
            <p className={styles.previewRole}>{role || "Developer · builder · human"}</p>
            <p className={styles.previewBio}>
              {bio || "A short introduction to the work you want people to find."}
            </p>
            <div className={styles.previewPlaceholder}>
              Your first links will appear here after onboarding.
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
