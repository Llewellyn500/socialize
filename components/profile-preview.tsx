import type { CSSProperties } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import {
  groupLinksBySection,
  isSafeExternalUrl,
  coerceProfileMediaUrl,
  isSafeProfileMediaUrl,
  isSocialKey,
  resolveDeveloperActivity,
  socialLabel,
  type ProfileConfig,
} from "@/lib/profile";
import { recordProfileClick } from "@/lib/profile-stats";
import { DeveloperActivity } from "@/components/developer-activity";
import { MediaIcon } from "@/components/media-icon";
import { socialIcons } from "@/components/social-icons";
import { isMediaIconId } from "@/lib/media-icons";

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
  const developerActivity = resolveDeveloperActivity(profile.developerActivity);
  const activityBlock = developerActivity.enabled ? (
    <DeveloperActivity config={developerActivity} interactive={interactive} />
  ) : null;

  return (
    <article
      className={`profile-preview profile-preview--${profile.theme} ${className}`}
      data-interactive={interactive}
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
        {Object.entries(profile.socials)
          .filter((entry): entry is [keyof typeof socialIcons, string] =>
            isSocialKey(entry[0]) && isSafeExternalUrl(entry[1]),
          )
          .map(([key, url]) => (
            <a
              key={key}
              href={url}
              target={url.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              aria-label={socialLabel(key)}
              tabIndex={interactive ? undefined : -1}
              onClick={() => trackClick(trackClicks, profile.handle, key, "social")}
            >
              {socialIcons[key]}
            </a>
          ))}
      </div>

      {developerActivity.placement === "before-links" ? activityBlock : null}

      <div className="profile-preview__links">
        {groupLinksBySection(profile).flatMap((group) => {
          const visibleLinks = group.links.filter(
            (link) => link.enabled && isSafeExternalUrl(link.url),
          );
          if (visibleLinks.length === 0) return [];

          const sectionMediaUrl = isSafeProfileMediaUrl(group.section?.mediaUrl)
            ? coerceProfileMediaUrl(group.section!.mediaUrl!)
            : undefined;
          const sectionMediaIcon =
            group.section?.mediaIcon && isMediaIconId(group.section.mediaIcon)
              ? group.section.mediaIcon
              : undefined;
          const sectionHasMedia = Boolean(sectionMediaUrl || sectionMediaIcon);
          const sectionMediaType = sectionMediaIcon
            ? "icon"
            : group.section?.mediaType === "thumbnail"
              ? "thumbnail"
              : "icon";
          const mediaOnlyHeading = Boolean(
            sectionHasMedia && group.section?.hideTitle,
          );

          return [
            <section
              className="profile-link-section"
              key={group.section?.id ?? "ungrouped"}
            >
              {group.section ? (
                <h2
                  className="profile-link-section__title"
                  data-media={sectionHasMedia ? sectionMediaType : undefined}
                  data-media-only={mediaOnlyHeading ? "true" : undefined}
                >
                  {sectionMediaIcon ? (
                    <MediaIcon id={sectionMediaIcon} />
                  ) : sectionMediaUrl ? (
                    // User-provided heading media is decorative; the text remains the accessible name.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sectionMediaUrl} alt="" />
                  ) : null}
                  <span className={mediaOnlyHeading ? "sr-only" : undefined}>
                    {group.section.title}
                  </span>
                </h2>
              ) : null}
              <div className="profile-link-section__links">
                {visibleLinks.map((link, index) => {
                  const mediaUrl = isSafeProfileMediaUrl(link.mediaUrl)
                    ? coerceProfileMediaUrl(link.mediaUrl!)
                    : undefined;
                  const mediaIcon =
                    link.mediaIcon && isMediaIconId(link.mediaIcon) ? link.mediaIcon : undefined;
                  const hasMedia = Boolean(mediaUrl || mediaIcon);
                  const mediaType = mediaIcon
                    ? "icon"
                    : link.mediaType === "thumbnail"
                      ? "thumbnail"
                      : "icon";
                  return (
                    <a
                      href={link.url}
                      key={link.id}
                      target="_blank"
                      rel="noreferrer"
                      tabIndex={interactive ? undefined : -1}
                      className="profile-link"
                      data-media={hasMedia ? mediaType : undefined}
                      onClick={() => trackClick(trackClicks, profile.handle, link.id, "link")}
                    >
                      {mediaIcon ? (
                        <span className="profile-link__media" aria-hidden="true">
                          <MediaIcon id={mediaIcon} />
                        </span>
                      ) : mediaUrl ? (
                        <span className="profile-link__media" aria-hidden="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl} alt="" />
                        </span>
                      ) : (
                        <span className="profile-link__number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      )}
                      <span className="profile-link__copy">
                        <strong>{link.title}</strong>
                        {link.description ? <small>{link.description}</small> : null}
                      </span>
                      <FiArrowUpRight aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </section>,
          ];
        })}
      </div>

      {developerActivity.placement === "after-links" ? activityBlock : null}

      {branded ? (
        <a className="profile-preview__credit" href="/" tabIndex={interactive ? undefined : -1}>
          made with <strong>socialize</strong>
        </a>
      ) : null}
    </article>
  );
}
