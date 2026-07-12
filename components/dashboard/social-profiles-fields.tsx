"use client";

import { FiPlus, FiTrash2 } from "react-icons/fi";
import { CustomSelect } from "@/components/ui/custom-select";
import { socialIcons } from "@/components/social-icons";
import {
  displaySocialValue,
  listedSocialKeys,
  normalizeSocialValue,
  SOCIAL_CATALOG,
  SOCIAL_KEYS,
  type SocialKey,
} from "@/lib/socials";
import type { ProfileConfig } from "@/lib/profile";
import styles from "./dashboard-app.module.css";

type SocialProfilesFieldsProps = {
  socials: ProfileConfig["socials"];
  onChange: (socials: ProfileConfig["socials"]) => void;
};

export function SocialProfilesFields({ socials, onChange }: SocialProfilesFieldsProps) {
  const activeKeys = listedSocialKeys(socials);
  const availableOptions = SOCIAL_KEYS.filter((key) => !(key in socials)).map((key) => ({
    value: key,
    label: SOCIAL_CATALOG[key].label,
  }));

  function updateSocial(key: SocialKey, rawValue: string) {
    onChange({
      ...socials,
      [key]: normalizeSocialValue(key, rawValue),
    });
  }

  function addSocial(key: string) {
    if (!(SOCIAL_KEYS as readonly string[]).includes(key)) return;
    if (key in socials) return;
    onChange({
      ...socials,
      [key as SocialKey]: "",
    });
  }

  function removeSocial(key: SocialKey) {
    const next = { ...socials };
    delete next[key];
    onChange(next);
  }

  return (
    <div className={styles.socialProfiles}>
      <div className={styles.socialProfilesIntro}>
        <h3>Social profiles</h3>
        <p>Icon links under your bio. Add only the platforms you use.</p>
      </div>

      {activeKeys.length > 0 ? (
        <ul className={styles.socialProfilesList}>
          {activeKeys.map((key) => {
            const meta = SOCIAL_CATALOG[key];
            return (
              <li className={styles.socialProfileRow} key={key}>
                <label className={styles.socialProfileField}>
                  <span className={styles.socialProfileLabel}>
                    {socialIcons[key]}
                    {meta.label}
                  </span>
                  <input
                    placeholder={meta.placeholder}
                    type={meta.inputType}
                    value={displaySocialValue(key, socials[key] ?? "")}
                    onChange={(event) => updateSocial(key, event.target.value)}
                  />
                </label>
                <button
                  aria-label={`Remove ${meta.label}`}
                  className={styles.socialProfileRemove}
                  type="button"
                  onClick={() => removeSocial(key)}
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.socialProfilesEmpty}>No social profiles yet.</p>
      )}

      {availableOptions.length > 0 ? (
        <div className={styles.socialProfilesAdd}>
          <span className={styles.socialProfilesAddIcon} aria-hidden="true">
            <FiPlus />
          </span>
          <CustomSelect
            aria-label="Add a social profile"
            options={availableOptions}
            placeholder="Add a social profile…"
            searchPlaceholder="Search platforms…"
            searchable
            value=""
            onChange={addSocial}
          />
        </div>
      ) : null}
    </div>
  );
}
