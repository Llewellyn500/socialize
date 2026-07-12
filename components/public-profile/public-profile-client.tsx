"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { Brand } from "@/components/brand";
import { ProfilePreview } from "@/components/profile-preview";
import { isFirebaseConfigured } from "@/lib/firebase";
import { demoProfile, type ProfileConfig, type ProfileTheme } from "@/lib/profile";
import { loadPublicProfile } from "@/lib/profile-store";
import { ProfileLoadingState } from "./profile-loading-state";
import { TerminalTyping } from "./terminal-typing";
import styles from "./public-profile.module.css";

const darkThemes = new Set<ProfileTheme>(["terminal", "midnight"]);
const MIN_LOADING_MS = 1200;

type LoadPhase = "loading" | "ready";

function initialPhase(handle: string): LoadPhase {
  if (handle === demoProfile.handle) return "ready";
  return isFirebaseConfigured ? "loading" : "ready";
}

export function PublicProfileClient({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<ProfileConfig | null>(
    handle === demoProfile.handle ? demoProfile : null,
  );
  const [phase, setPhase] = useState<LoadPhase>(() => initialPhase(handle));
  const [failed, setFailed] = useState(handle !== demoProfile.handle && !isFirebaseConfigured);

  useEffect(() => {
    if (handle === demoProfile.handle || !isFirebaseConfigured) return;

    let active = true;
    const startedAt = Date.now();

    loadPublicProfile(handle)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setFailed(!result);
      })
      .catch(() => active && setFailed(true))
      .finally(() => {
        if (!active) return;
        const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt));
        window.setTimeout(() => {
          if (active) setPhase("ready");
        }, remaining);
      });

    return () => {
      active = false;
    };
  }, [handle]);

  const theme: ProfileTheme = profile?.theme ?? "paper";
  const shellStyle = {
    "--page-accent": profile?.accent ?? "#8a2be2",
  } as CSSProperties;

  return (
    <main
      className={`${styles.shell} ${phase === "loading" ? styles.shellLoading : ""}`}
      data-theme={theme}
      style={shellStyle}
    >
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.atmosphereGlow} />
        <span className={styles.atmosphereTexture} />
        <span className={styles.atmosphereDetail} />
        <span className={styles.atmosphereVignette} />
        {theme === "terminal" && phase !== "loading" ? (
          <TerminalTyping handle={profile?.handle ?? handle} />
        ) : null}
      </div>

      {phase !== "loading" ? (
        <header className={styles.topbar}>
          <Brand inverse={darkThemes.has(theme)} />
          <Link href="/sign-up">Make your own <FiArrowUpRight /></Link>
        </header>
      ) : null}

      {phase === "loading" ? <ProfileLoadingState handle={handle} /> : null}

      {phase === "ready" && failed ? (
        <div className={`${styles.state} ${styles.stateEnter}`}>
          <span>404 / PROFILE</span>
          <h1>@{handle} is quiet.</h1>
          <p>This profile does not exist, is still a draft, or has been unpublished by its owner.</p>
          <Link href="/">Back to Socialize</Link>
        </div>
      ) : null}

      {phase === "ready" && profile ? (
        <>
          <div className={`${styles.frame} ${styles.frameEnter}`}>
            <ProfilePreview profile={profile} interactive />
          </div>
          <Link className={`${styles.report} ${styles.reportEnter}`} href={`/report/${profile.handle}`}>
            Report this profile
          </Link>
        </>
      ) : null}
    </main>
  );
}
