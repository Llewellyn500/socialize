"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { Brand } from "@/components/brand";
import { ProfilePreview } from "@/components/profile-preview";
import { isFirebaseConfigured } from "@/lib/firebase";
import { demoProfile, type ProfileConfig } from "@/lib/profile";
import { loadPublicProfile } from "@/lib/profile-store";
import styles from "./public-profile.module.css";

export function PublicProfileClient({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<ProfileConfig | null>(handle === demoProfile.handle ? demoProfile : null);
  const [loading, setLoading] = useState(handle !== demoProfile.handle && isFirebaseConfigured);
  const [failed, setFailed] = useState(handle !== demoProfile.handle && !isFirebaseConfigured);

  useEffect(() => {
    if (handle === demoProfile.handle || !isFirebaseConfigured) return;
    let active = true;
    loadPublicProfile(handle)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setFailed(!result);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [handle]);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Brand />
        <Link href="/sign-up">Make your own <FiArrowUpRight /></Link>
      </header>
      {loading ? <div className={styles.skeleton} aria-label="Loading profile"><i /><i /><i /><i /><i /><i /></div> : null}
      {!loading && failed ? (
        <div className={styles.state}>
          <span>404 / PROFILE</span>
          <h1>@{handle} is quiet.</h1>
          <p>This profile does not exist, is still a draft, or has been unpublished by its owner.</p>
          <Link href="/">Back to Socialize</Link>
        </div>
      ) : null}
      {!loading && profile ? (
        <>
          <div className={styles.frame}><ProfilePreview profile={profile} interactive /></div>
          <Link className={styles.report} href={`/report/${profile.handle}`}>Report this profile</Link>
        </>
      ) : null}
    </main>
  );
}
