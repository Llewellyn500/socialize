"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, SignIn } from "@phosphor-icons/react";
import { useEffect, useState, type CSSProperties } from "react";
import { DeveloperActivity } from "@/components/developer-activity";
import {
  cloneProfile,
  developerActivityHasVisibleModules,
  groupLinksBySection,
  isSafeImageUrl,
  profileInitials
} from "@/lib/profile-utils";
import { subscribeToProfile } from "@/lib/profile-store";
import type { Profile } from "@/types/profile";

function newTabProps(url: string) {
  return url.startsWith("http")
    ? { target: "_blank" as const, rel: "noreferrer" }
    : {};
}

export function ProfileView({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState<Profile>(() => cloneProfile(initialProfile));

  useEffect(() => subscribeToProfile(setProfile), []);

  const linkGroups = groupLinksBySection(profile).map((group) => ({
    ...group,
    links: group.links.filter((link) => link.enabled)
  }));
  const hasActiveLinks = linkGroups.some((group) => group.links.length > 0);
  const developerActivity = profile.developerActivity;
  const showDeveloperActivity = Boolean(
    developerActivity?.enabled &&
    developerActivity.githubUsername &&
    developerActivityHasVisibleModules(developerActivity)
  );
  const style = { "--profile-accent": profile.accent } as CSSProperties;

  return (
    <main className="profile-page" style={style}>
      <div className="profile-shell">
        <div className="profile-layout">
          <section className="profile-intro" aria-labelledby="profile-name">
            {profile.avatarUrl ? (
              <img
                className="profile-avatar"
                src={profile.avatarUrl}
                alt={`${profile.name}'s portrait`}
                width={112}
                height={112}
              />
            ) : (
              <div className="profile-avatar profile-monogram" aria-hidden="true">
                {profileInitials(profile.name)}
              </div>
            )}

            <div className="profile-heading">
              <p className="profile-handle">{profile.handle}</p>
              <h1 id="profile-name">{profile.name}</h1>
              <p className="profile-role">{profile.role}</p>
            </div>

            <p className="profile-bio">{profile.bio}</p>

            <div className="profile-facts">
              {profile.location ? (
                <span>
                  <MapPin aria-hidden="true" size={17} weight="fill" />
                  {profile.location}
                </span>
              ) : null}
              {profile.availability ? <span className="availability">{profile.availability}</span> : null}
            </div>

            {profile.socials.length ? (
              <nav className="social-nav" aria-label="Social profiles">
                {profile.socials.map((social) => (
                  <a key={social.id} href={social.url} {...newTabProps(social.url)}>
                    {social.label}
                  </a>
                ))}
              </nav>
            ) : null}
          </section>

          <div className="profile-content">
            {showDeveloperActivity && developerActivity?.placement === "before-links" ? (
              <DeveloperActivity activity={developerActivity} />
            ) : null}

            <section className="profile-links" aria-label="Featured links">
              {hasActiveLinks ? (
                linkGroups.map((group) => {
                  if (!group.links.length) return null;
                  const sectionMediaUrl = group.section?.mediaUrl &&
                    isSafeImageUrl(group.section.mediaUrl)
                    ? group.section.mediaUrl
                    : undefined;
                  const sectionMediaType = group.section?.mediaType === "thumbnail"
                    ? "thumbnail"
                    : "icon";
                  const mediaOnly = Boolean(sectionMediaUrl && group.section?.hideTitle);
                  return (
                    <section className="profile-link-section" key={group.section?.id ?? "ungrouped"}>
                      {group.section ? (
                        <h2
                          className="profile-links-heading"
                          data-media={sectionMediaUrl ? sectionMediaType : undefined}
                          data-media-only={mediaOnly}
                        >
                          {sectionMediaUrl ? <img src={sectionMediaUrl} alt="" /> : null}
                          <span className={mediaOnly ? "sr-only" : undefined}>{group.section.title}</span>
                        </h2>
                      ) : null}
                      <div className="profile-link-group">
                        {group.links.map((link, index) => {
                          const linkMediaUrl = link.mediaUrl && isSafeImageUrl(link.mediaUrl)
                            ? link.mediaUrl
                            : undefined;
                          const linkMediaType = link.mediaType === "thumbnail" ? "thumbnail" : "icon";
                          return (
                            <a
                              className="profile-link-card"
                              data-media={linkMediaUrl ? linkMediaType : undefined}
                              href={link.url}
                              key={link.id}
                              style={{ "--item-delay": `${90 + index * 65}ms` } as CSSProperties}
                              {...newTabProps(link.url)}
                            >
                              {linkMediaUrl ? (
                                <span className="profile-link-media" aria-hidden="true">
                                  <img src={linkMediaUrl} alt="" />
                                </span>
                              ) : null}
                              <span className="profile-link-copy">
                                <strong>{link.title}</strong>
                                {link.description ? <small>{link.description}</small> : null}
                              </span>
                              <ArrowUpRight aria-hidden="true" size={22} weight="bold" />
                            </a>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="profile-empty">
                  <h2>No links published yet</h2>
                  <p>The owner can add the first one from the private workspace.</p>
                </div>
              )}
            </section>

            {showDeveloperActivity && developerActivity?.placement === "after-links" ? (
              <DeveloperActivity activity={developerActivity} />
            ) : null}
          </div>
        </div>

        <footer className="profile-footer">
          <span>Powered by Socialize</span>
          <Link href="/login">
            <SignIn aria-hidden="true" size={16} weight="bold" />
            Owner
          </Link>
        </footer>
      </div>
    </main>
  );
}
