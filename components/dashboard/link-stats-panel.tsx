"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaEnvelope,
  FaGithub,
  FaGitlab,
  FaLinkedinIn,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiBarChart2, FiGlobe, FiMousePointer } from "react-icons/fi";
import type { ProfileConfig, SocialKey } from "@/lib/profile";
import { loadProfileStats, type ProfileStats } from "@/lib/profile-stats";
import styles from "./dashboard-app.module.css";

const socialLabels: Record<SocialKey, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  linkedin: "LinkedIn",
  x: "X",
  email: "Email",
  website: "Website",
};

const socialIcons: Record<SocialKey, React.ReactNode> = {
  github: <FaGithub />,
  gitlab: <FaGitlab />,
  linkedin: <FaLinkedinIn />,
  x: <FaXTwitter />,
  email: <FaEnvelope />,
  website: <FiGlobe />,
};

type LinkStatsPanelProps = {
  uid: string | null;
  profile: ProfileConfig;
  localDemo?: boolean;
};

function formatWhen(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export function LinkStatsPanel({ uid, profile, localDemo = false }: LinkStatsPanelProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localDemo || !uid) {
      setStats({
        handle: profile.handle,
        totalClicks: 0,
        links: {},
        socials: {},
      });
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    loadProfileStats(uid)
      .then((result) => {
        if (!active) return;
        setStats(result);
      })
      .catch(() => {
        if (!active) return;
        setError("Could not load click stats right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uid, localDemo, profile.handle]);

  const linkRows = useMemo(() => {
    const clicks = stats?.links ?? {};
    return profile.links
      .map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        enabled: link.enabled,
        clicks: clicks[link.id]?.clicks ?? 0,
        lastClickAt: clicks[link.id]?.lastClickAt,
      }))
      .sort((a, b) => b.clicks - a.clicks || a.title.localeCompare(b.title));
  }, [profile.links, stats]);

  const socialRows = useMemo(() => {
    const clicks = stats?.socials ?? {};
    return (Object.keys(profile.socials) as SocialKey[])
      .filter((key) => Boolean(profile.socials[key]))
      .map((key) => ({
        key,
        clicks: clicks[key]?.clicks ?? 0,
        lastClickAt: clicks[key]?.lastClickAt,
      }))
      .sort((a, b) => b.clicks - a.clicks || a.key.localeCompare(b.key));
  }, [profile.socials, stats]);

  const totalClicks = stats?.totalClicks ?? 0;
  const topLink = linkRows.find((row) => row.clicks > 0);
  const enabledCount = profile.links.filter((link) => link.enabled).length;

  return (
    <div className={styles.statsPanel}>
      {localDemo ? (
        <div className={styles.notice}>
          Stats sync when your account and cloud backend are connected. Local demo mode
          still shows the layout with empty click counts.
        </div>
      ) : null}

      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.statsSummary}>
        <div className={styles.statsCard}>
          <span>Total clicks</span>
          <strong>{loading ? "…" : totalClicks}</strong>
          <p>Links and social icons on your public page</p>
        </div>
        <div className={styles.statsCard}>
          <span>Top link</span>
          <strong>{loading ? "…" : topLink ? topLink.clicks : 0}</strong>
          <p>{topLink ? topLink.title : "No clicks yet"}</p>
        </div>
        <div className={styles.statsCard}>
          <span>Live links</span>
          <strong>{enabledCount}</strong>
          <p>of {profile.links.length} total</p>
        </div>
      </div>

      <section className={styles.statsSection}>
        <header className={styles.statsSectionHeader}>
          <FiMousePointer aria-hidden="true" />
          <div>
            <h2>Link clicks</h2>
            <p>Which destinations people open from your profile.</p>
          </div>
        </header>

        {loading ? (
          <p className={styles.statsEmpty}>Loading click data…</p>
        ) : linkRows.length === 0 ? (
          <p className={styles.statsEmpty}>Add links to start collecting click stats.</p>
        ) : (
          <ul className={styles.statsList}>
            {linkRows.map((row) => (
              <li key={row.id}>
                <div className={styles.statsRowCopy}>
                  <strong>{row.title}</strong>
                  <small>
                    {row.enabled ? "Visible" : "Hidden"} · last click {formatWhen(row.lastClickAt)}
                  </small>
                </div>
                <div className={styles.statsRowMeta}>
                  <span className={styles.statsCount}>{row.clicks}</span>
                  <span className={styles.statsCountLabel}>clicks</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.statsSection}>
        <header className={styles.statsSectionHeader}>
          <FiBarChart2 aria-hidden="true" />
          <div>
            <h2>Social clicks</h2>
            <p>Icon row under your bio.</p>
          </div>
        </header>

        {loading ? (
          <p className={styles.statsEmpty}>Loading click data…</p>
        ) : socialRows.length === 0 ? (
          <p className={styles.statsEmpty}>Add social profiles to track icon clicks.</p>
        ) : (
          <ul className={styles.statsList}>
            {socialRows.map((row) => (
              <li key={row.key}>
                <div className={styles.statsRowCopy}>
                  <strong>
                    <span className={styles.statsSocialIcon}>{socialIcons[row.key]}</span>
                    {socialLabels[row.key]}
                  </strong>
                  <small>last click {formatWhen(row.lastClickAt)}</small>
                </div>
                <div className={styles.statsRowMeta}>
                  <span className={styles.statsCount}>{row.clicks}</span>
                  <span className={styles.statsCountLabel}>clicks</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
