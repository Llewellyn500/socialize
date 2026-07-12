"use client";

import {
  FaEnvelope,
  FaGithub,
  FaGitlab,
  FaLinkedinIn,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiGlobe } from "react-icons/fi";
import { normalizeLinkUrl } from "@/lib/email-link";
import type { ProfileConfig, SocialKey } from "@/lib/profile";
import styles from "./dashboard-app.module.css";

const socialFields: {
  key: SocialKey;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
}[] = [
  { key: "github", label: "GitHub", placeholder: "https://github.com/you", icon: <FaGithub aria-hidden="true" /> },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/you", icon: <FaLinkedinIn aria-hidden="true" /> },
  { key: "x", label: "X", placeholder: "https://x.com/you", icon: <FaXTwitter aria-hidden="true" /> },
  { key: "gitlab", label: "GitLab", placeholder: "https://gitlab.com/you", icon: <FaGitlab aria-hidden="true" /> },
  { key: "email", label: "Email", placeholder: "you@example.com", icon: <FaEnvelope aria-hidden="true" /> },
  { key: "website", label: "Website", placeholder: "https://yoursite.com", icon: <FiGlobe aria-hidden="true" /> },
];

type SocialProfilesFieldsProps = {
  socials: ProfileConfig["socials"];
  onChange: (socials: ProfileConfig["socials"]) => void;
};

export function SocialProfilesFields({ socials, onChange }: SocialProfilesFieldsProps) {
  function updateSocial(key: SocialKey, rawValue: string) {
    const trimmed = rawValue.trim();
    const next = { ...socials };

    if (!trimmed) {
      delete next[key];
      onChange(next);
      return;
    }

    next[key] = key === "email" ? normalizeLinkUrl(trimmed) : trimmed;
    onChange(next);
  }

  function displayValue(key: SocialKey) {
    const value = socials[key] ?? "";
    if (key === "email" && value.startsWith("mailto:")) {
      return value.slice("mailto:".length);
    }
    return value;
  }

  return (
    <div className={styles.socialProfiles}>
      <div className={styles.socialProfilesIntro}>
        <h3>Social profiles</h3>
        <p>Icon links shown under your bio. Leave blank to hide.</p>
      </div>
      <div className={styles.socialProfilesGrid}>
        {socialFields.map(({ key, label, placeholder, icon }) => (
          <label className={styles.socialProfileField} key={key}>
            <span className={styles.socialProfileLabel}>
              {icon}
              {label}
            </span>
            <input
              placeholder={placeholder}
              type={key === "email" ? "email" : "url"}
              value={displayValue(key)}
              onChange={(event) => updateSocial(key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
