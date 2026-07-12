import type { CSSProperties } from "react";
import {
  FaEnvelope,
  FaGithub,
  FaGitlab,
  FaLinkedinIn,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiArrowUpRight, FiGlobe } from "react-icons/fi";
import {
  groupLinksBySection,
  isSafeExternalUrl,
  type ProfileConfig,
  type SocialKey,
} from "@/lib/profile";
import { recordProfileClick } from "@/lib/profile-stats";

const socialIcons: Record<SocialKey, React.ReactNode> = {
  github: <FaGithub />,
  gitlab: <FaGitlab />,
  linkedin: <FaLinkedinIn />,
  x: <FaXTwitter />,
  email: <FaEnvelope />,
  website: <FiGlobe />,
};

type ProfilePreviewProps = {
  profile: ProfileConfig;
  className?: string;
  interactive?: boolean;
  branded?: boolean;
  /** Record link/social clicks for the profile owner dashboard. */
  trackClicks?: boolean;
};

function trackClick(
  enabled: boolean,
  handle: string,
  targetId: string,
  kind: "link" | "social",
) {
  if (!enabled) return;
  void recordProfileClick({ handle, targetId, kind }).catch(() => {
    // Tracking must never block navigation.
  });
}

export function ProfilePreview({
  profile,
  className = "",
  interactive = false,
  branded = true,
  trackClicks = false,
}: ProfilePreviewProps) {
  const style = {
    "--profile-accent": profile.accent,
  } as CSSProperties;
  const initials = profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const avatarUrl =
    profile.avatarUrl?.startsWith("/") || profile.avatarUrl?.startsWith("https://")
      ? profile.avatarUrl
      : undefined;

  return (
    <article
      className={`profile-preview profile-preview--${profile.theme} ${className}`}
      style={style}
    >
      <div className="profile-preview__topline">
        <span>@{profile.handle}</span>
        <span className="profile-preview__status">
          <i aria-hidden="true" /> {profile.availability || "Available to build"}
        </span>
      </div>

      <header className="profile-preview__identity">
        <div className="profile-preview__avatar">
          {avatarUrl ? (
            // User-provided avatar URLs cannot be known at build time.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={`${profile.displayName} portrait`} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div>
          <h1>{profile.displayName}</h1>
          <p className="profile-preview__role">{profile.role}</p>
        </div>
      </header>

      <p className="profile-preview__bio">{profile.bio}</p>

      <div className="profile-preview__socials" aria-label="Social profiles">
        {(Object.entries(profile.socials) as [SocialKey, string][])
          .filter(([, url]) => isSafeExternalUrl(url))
          .map(([key, url]) => (
            <a
              key={key}
              href={url}
              target={url.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              aria-label={key}
              tabIndex={interactive ? undefined : -1}
              onClick={() => trackClick(trackClicks, profile.handle, key, "social")}
            >
              {socialIcons[key]}
            </a>
          ))}
      </div>

      <div className="profile-preview__links">
        {groupLinksBySection(profile).map((group) => {
          const visibleLinks = group.links.filter(
            (link) => link.enabled && isSafeExternalUrl(link.url),
          );
          if (visibleLinks.length === 0) return null;

          return (
            <section
              className="profile-link-section"
              key={group.section?.id ?? "ungrouped"}
            >
              {group.section ? (
                <h2 className="profile-link-section__title">{group.section.title}</h2>
              ) : null}
              {visibleLinks.map((link, index) => (
                <a
                  href={link.url}
                  key={link.id}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={interactive ? undefined : -1}
                  className="profile-link"
                  onClick={() => trackClick(trackClicks, profile.handle, link.id, "link")}
                >
                  <span className="profile-link__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="profile-link__copy">
                    <strong>{link.title}</strong>
                    {link.description ? <small>{link.description}</small> : null}
                  </span>
                  <FiArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </section>
          );
        })}
      </div>

      {branded ? (
        <a className="profile-preview__credit" href="/" tabIndex={interactive ? undefined : -1}>
          made with <strong>socialize</strong>
        </a>
      ) : null}
    </article>
  );
}
