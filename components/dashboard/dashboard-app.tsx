"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  FiBarChart2,
  FiCheck,
  FiCopy,
  FiDownload,
  FiEye,
  FiFileText,
  FiImage,
  FiLink,
  FiLogOut,
  FiMonitor,
  FiSave,
  FiSettings,
  FiSliders,
  FiUser,
} from "react-icons/fi";
import { Brand } from "@/components/brand";
import { AppLoadingState } from "@/components/app-loading-state";
import { ProfilePreview } from "@/components/profile-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { MotionToggle } from "@/components/motion-toggle";
import { uploadUserAvatar } from "@/lib/avatar-upload";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  demoProfile,
  groupLinksBySection,
  isAutoLinkDescription,
  isAutoLinkTitle,
  isSafeExternalUrl,
  titleFromUrl,
  type ProfileConfig,
  type ProfileTheme,
} from "@/lib/profile";
import { loadProfile, saveProfile } from "@/lib/profile-store";
import { loadProfileStats, type ProfileStats } from "@/lib/profile-stats";
import { normalizeLinkUrl } from "@/lib/email-link";
import {
  fetchEnrichedLinkMetadata,
  isEnrichableLinkUrl,
} from "@/lib/link-metadata";
import { isLinkedInUrl } from "@/lib/linkedin-url";
import { LINKEDIN_LINK_TITLE } from "@/lib/linkedin-headline";
import { LinksEditor } from "./links-editor";
import { LinkStatsPanel } from "./link-stats-panel";
import { LinkedSignInMethods } from "./linked-sign-in-methods";
import { SocialProfilesFields } from "./social-profiles-fields";
import styles from "./dashboard-app.module.css";

type Tab = "overview" | "stats" | "links" | "profile" | "appearance" | "settings";
type Status = { tone: "neutral" | "success" | "error"; message: string } | null;

const navItems = [
  ["overview", "Overview", FiMonitor],
  ["stats", "Stats", FiBarChart2],
  ["links", "Links", FiLink],
  ["profile", "Profile", FiUser],
  ["appearance", "Appearance", FiSliders],
  ["settings", "Settings", FiSettings],
] as const;

const themeOptions: { id: ProfileTheme; label: string; className: string }[] = [
  { id: "paper", label: "Paper", className: styles.themePaper },
  { id: "terminal", label: "Terminal", className: styles.themeTerminal },
  { id: "midnight", label: "Midnight", className: styles.themeMidnight },
  { id: "mono", label: "Mono", className: styles.themeMono },
];

export function DashboardApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<ProfileConfig>(demoProfile);
  const [user, setUser] = useState<User | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [host, setHost] = useState("socialize.you");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [overviewStats, setOverviewStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    setHost(window.location.host);

    if (!auth) {
      const localProfile = window.localStorage.getItem("socialize-demo-profile");
      if (localProfile) {
        try {
          setProfile(JSON.parse(localProfile) as ProfileConfig);
        } catch {
          setProfile(demoProfile);
        }
      } else {
        setProfile(demoProfile);
      }
      setWorkspaceReady(true);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setLoadingProfile(false);
        setWorkspaceReady(true);
        return;
      }

      setWorkspaceReady(false);
      setLoadingProfile(true);

      void loadProfile(nextUser.uid)
        .then((stored) => {
          if (!stored) {
            router.replace("/onboarding");
            return;
          }
          setProfile(stored);
          setWorkspaceReady(true);
        })
        .catch(() => {
          router.replace("/onboarding");
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    });
  }, [router]);

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured) {
      setOverviewStats(null);
      return;
    }

    let active = true;
    void loadProfileStats(user.uid)
      .then((stats) => {
        if (active) setOverviewStats(stats);
      })
      .catch(() => {
        if (active) setOverviewStats(null);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, tab]);

  const pageUrl = useMemo(() => {
    return `${host}/${profile.handle}`;
  }, [host, profile.handle]);

  const overviewClickSummary = useMemo(() => {
    const totalClicks = overviewStats?.totalClicks ?? 0;
    const linkEntries = Object.entries(overviewStats?.links ?? {});
    const topEntry = linkEntries.sort((a, b) => (b[1].clicks ?? 0) - (a[1].clicks ?? 0))[0];
    const topLink = topEntry
      ? profile.links.find((link) => link.id === topEntry[0])
      : undefined;
    const socialClicks = Object.values(overviewStats?.socials ?? {}).reduce(
      (sum, entry) => sum + (entry.clicks ?? 0),
      0,
    );

    return {
      totalClicks,
      topLinkTitle: topLink?.title,
      topLinkClicks: topEntry?.[1].clicks ?? 0,
      socialClicks,
    };
  }, [overviewStats, profile.links]);
  function update<K extends keyof ProfileConfig>(key: K, value: ProfileConfig[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function addSection() {
    const sections = [
      ...(profile.sections ?? []),
      { id: `section-${Date.now()}`, title: "New section" },
    ];
    update("sections", sections);
  }

  function updateSectionTitle(sectionId: string, title: string) {
    update(
      "sections",
      (profile.sections ?? []).map((section) =>
        section.id === sectionId ? { ...section, title } : section,
      ),
    );
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const sections = [...(profile.sections ?? [])];
    const index = sections.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    update("sections", sections);
  }

  function removeSection(sectionId: string) {
    setProfile((current) => ({
      ...current,
      sections: (current.sections ?? []).filter((section) => section.id !== sectionId),
      links: current.links.map((link) =>
        link.sectionId === sectionId ? { ...link, sectionId: undefined } : link,
      ),
    }));
    setStatus(null);
  }

  function addLink(sectionId?: string) {
    update("links", [
      ...profile.links,
      {
        id: `link-${Date.now()}`,
        title: "",
        description: "",
        url: "",
        enabled: true,
        kind: "link",
        ...(sectionId ? { sectionId } : {}),
      },
    ]);
  }

  function updateLink(
    linkId: string,
    key: "title" | "description" | "url" | "enabled" | "sectionId",
    value: string | boolean,
  ) {
    const links = profile.links.map((link) => {
      if (link.id !== linkId) return link;

      if (key === "sectionId") {
        const sectionId = typeof value === "string" && value ? value : undefined;
        return { ...link, sectionId };
      }

      return { ...link, [key]: value };
    });
    update("links", links);
  }

  async function handleLinkUrlChange(linkId: string, rawUrl: string) {
    const currentLink = profile.links.find((link) => link.id === linkId);
    if (!currentLink) return;

    const url = normalizeLinkUrl(rawUrl);
    const shouldAutofillTitle = isAutoLinkTitle(currentLink.title, currentLink.url);
    const shouldAutofillDescription = isAutoLinkDescription(currentLink.description);
    const derived = isLinkedInUrl(url)
      ? LINKEDIN_LINK_TITLE
      : isEnrichableLinkUrl(url)
        ? ""
        : titleFromUrl(url);

    setProfile((current) => ({
      ...current,
      links: current.links.map((link) => {
        if (link.id !== linkId) return link;
        return {
          ...link,
          url,
          ...(shouldAutofillTitle && derived ? { title: derived } : {}),
        };
      }),
    }));
    setStatus(null);

    if (!isEnrichableLinkUrl(url)) return;

    const metadata = await fetchEnrichedLinkMetadata(url);
    if (!metadata) return;

    setProfile((current) => {
      const link = current.links.find((item) => item.id === linkId);
      if (!link || link.url.trim() !== url.trim()) return current;

      const autofillTitle = isAutoLinkTitle(link.title, url);
      const autofillDescription = isAutoLinkDescription(link.description);

      return {
        ...current,
        links: current.links.map((item) => {
          if (item.id !== linkId) return item;
          return {
            ...item,
            ...(autofillTitle && metadata.title ? { title: metadata.title } : {}),
            ...(autofillDescription && metadata.description
              ? { description: metadata.description }
              : {}),
          };
        }),
      };
    });
  }

  function moveLink(linkId: string, direction: -1 | 1) {
    const links = [...profile.links];
    const index = links.findIndex((link) => link.id === linkId);
    if (index < 0) return;

    const sectionKey = links[index].sectionId ?? "";
    const sectionIndices = links
      .map((link, linkIndex) =>
        (link.sectionId ?? "") === sectionKey ? linkIndex : -1,
      )
      .filter((linkIndex) => linkIndex >= 0);
    const position = sectionIndices.indexOf(index);
    const targetPosition = position + direction;
    if (targetPosition < 0 || targetPosition >= sectionIndices.length) return;

    const targetIndex = sectionIndices[targetPosition];
    [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
    update("links", links);
  }

  function removeLink(linkId: string) {
    update("links", profile.links.filter((link) => link.id !== linkId));
  }

  const linkGroups = useMemo(() => groupLinksBySection(profile), [profile]);

  async function persistProfile(
    nextProfile: ProfileConfig = profile,
    successMessage?: string,
  ) {
    setSaving(true);
    setStatus(null);
    try {
      const invalidLink = nextProfile.links.find((link) => !isSafeExternalUrl(link.url));
      if (invalidLink) throw new Error(`“${invalidLink.title}” needs an https:// or mailto: URL.`);
      if (auth && user) {
        const saved = await saveProfile(user.uid, nextProfile);
        setProfile(saved);
      } else {
        window.localStorage.setItem("socialize-demo-profile", JSON.stringify(nextProfile));
        setProfile(nextProfile);
      }
      setStatus({
        tone: "success",
        message:
          successMessage ?? "Saved",
      });
      return true;
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "We could not save your profile." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    const previous = profile;
    const nextProfile = { ...profile, published: !profile.published };
    setProfile(nextProfile);
    const saved = await persistProfile(
      nextProfile,
      nextProfile.published ? "Your profile is live." : "Your profile is unpublished.",
    );
    if (!saved) setProfile(previous);
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (!user) {
      setStatus({ tone: "error", message: "Sign in to your account before uploading an avatar." });
      return;
    }

    setUploadingAvatar(true);
    setStatus(null);
    try {
      const avatarUrl = await uploadUserAvatar(user.uid, file);
      update("avatarUrl", avatarUrl);
      setStatus({ tone: "success", message: "Avatar uploaded. Save changes to keep it on your profile." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "The avatar upload failed. Try again.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function copyPageUrl() {
    await navigator.clipboard.writeText(`${window.location.protocol}//${pageUrl}`);
    setUrlCopied(true);
    setStatus({ tone: "success", message: "Profile URL copied." });
    window.setTimeout(() => setUrlCopied(false), 2000);
  }

  function exportProfile() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.handle}-socialize.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function logOut() {
    if (auth) await signOut(auth);
    router.push("/sign-in");
  }

  if (!workspaceReady) {
    return (
      <AppLoadingState
        description={
          loadingProfile
            ? "Fetching your links, profile, and settings…"
            : "Connecting to your Socialize account…"
        }
        label="Loading workspace"
        title={loadingProfile ? "Loading your profile." : "Loading your workspace."}
      />
    );
  }

  if (isFirebaseConfigured && !user) {
    return (
      <div className={styles.emptyAuth}>
        <div><Brand /><h1>This workspace is private.</h1><p>Sign in to manage your links, profile, and publishing settings.</p><Link href="/sign-in?returnTo=/dashboard">Sign in to continue</Link></div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Brand />
        <div className={styles.topbarCenter}><i /> {profile.published ? "Published" : "Private draft"} · {pageUrl}</div>
        <div className={styles.topbarActions}>
          <ThemeToggle compact />
          <MotionToggle compact />
          <button
            type="button"
            onClick={copyPageUrl}
            className={urlCopied ? styles.actionSuccess : undefined}
            aria-label={urlCopied ? "Profile URL copied" : "Copy profile URL"}
          >
            {urlCopied ? <><FiCheck /> Copied!</> : <><FiCopy /> Copy URL</>}
          </button>
          <Link href={`/${profile.handle}`} target="_blank"><FiEye /> Preview</Link>
          <button className={styles.publish} type="button" onClick={togglePublished} disabled={saving}>
            {profile.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Dashboard navigation">
          <div className={styles.account}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.accountAvatar} src={profile.avatarUrl} alt="" />
            ) : (
              <span className={styles.accountAvatar}>{profile.displayName.slice(0, 2).toUpperCase()}</span>
            )}
            <div><strong>{profile.displayName}</strong><small>{user?.email || "local demo"}</small></div>
          </div>
          <span className={styles.navLabel}>Workspace</span>
          {navItems.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? styles.active : ""} type="button" onClick={() => setTab(id)}><Icon /><span>{label}</span></button>
          ))}
          <div className={styles.sidebarBottom}>
            <button type="button" onClick={logOut}><FiLogOut /><span>Sign out</span></button>
          </div>
        </aside>

        <main className={styles.panel}>
          {tab === "overview" ? (
            <>
              <PanelHeading eyebrow="WORKSPACE / OVERVIEW" title="Good to see you." />
              {!isFirebaseConfigured ? <div className={styles.notice}>This is the local demo workspace. Add your environment values to enable real accounts and cloud saves.</div> : null}
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}><span>Profile status</span><strong>{profile.published ? "Live" : "Draft"}</strong><p>@{profile.handle}</p></div>
                <div className={styles.overviewCard}><span>Active links</span><strong>{profile.links.filter((link) => link.enabled).length}</strong><p>of {profile.links.length} total</p></div>
                <div className={styles.overviewCard}>
                  <span>Total clicks</span>
                  <strong>{overviewClickSummary.totalClicks}</strong>
                  <p>{overviewClickSummary.socialClicks > 0 ? `${overviewClickSummary.socialClicks} from social icons` : "From your public profile"}</p>
                </div>
                <div className={styles.overviewCard}>
                  <span>Top link</span>
                  <strong>{overviewClickSummary.topLinkClicks}</strong>
                  <p>{overviewClickSummary.topLinkTitle || "No clicks yet"}</p>
                </div>
              </div>
              <div className={styles.overviewStatsHint}>
                <p>Click counts update when people open links on your live profile.</p>
                <button type="button" onClick={() => setTab("stats")}>Open full stats</button>
              </div>
              <div className={styles.checklist}>
                <div><FiCheck /><span>Claim your handle</span><small>@{profile.handle}</small></div>
                <div><FiCheck /><span>Add your best work</span><small>{profile.links.length} links</small></div>
                <div>{profile.published ? <FiCheck /> : <FiFileText />}<span>Publish your profile</span><small>{profile.published ? "done" : "waiting"}</small></div>
              </div>
            </>
          ) : null}

          {tab === "stats" ? (
            <>
              <PanelHeading eyebrow="WORKSPACE / STATS" title="What people open." />
              <LinkStatsPanel
                uid={user?.uid ?? null}
                profile={profile}
                localDemo={!isFirebaseConfigured || !user}
              />
            </>
          ) : null}

          {tab === "links" ? (
            <>
              <PanelHeading eyebrow="CONTENT / LINKS" title="Your links." />
              <LinksEditor
                linkGroups={linkGroups}
                profile={profile}
                onAddLink={addLink}
                onAddSection={addSection}
                onLinkUrlChange={handleLinkUrlChange}
                onMoveLink={moveLink}
                onMoveSection={moveSection}
                onRemoveLink={removeLink}
                onRemoveSection={removeSection}
                onUpdateLink={updateLink}
                onUpdateSectionTitle={updateSectionTitle}
              />
            </>
          ) : null}

          {tab === "profile" ? (
            <>
              <PanelHeading eyebrow="IDENTITY / PROFILE" title="Make it yours." />
              <div className={styles.formGrid}>
                <Field label="Display name"><input value={profile.displayName} onChange={(event) => update("displayName",event.target.value)} /></Field>
                <Field label="Handle" hint="3–30 lowercase letters, numbers, or hyphens"><input value={profile.handle} onChange={(event) => update("handle",event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} /></Field>
                <Field label="Role" wide><input value={profile.role} onChange={(event) => update("role",event.target.value)} /></Field>
                <Field label="Bio" wide><textarea maxLength={240} value={profile.bio} onChange={(event) => update("bio",event.target.value)} /></Field>
                <div className={styles.formFieldWide}>
                  <SocialProfilesFields
                    socials={profile.socials}
                    onChange={(socials) => update("socials", socials)}
                  />
                </div>
                <Field label="Location"><input value={profile.location || ""} onChange={(event) => update("location",event.target.value)} /></Field>
                <Field label="Availability"><input value={profile.availability || ""} onChange={(event) => update("availability",event.target.value)} /></Field>
                <Field label="Avatar image" wide hint="JPEG, PNG, WebP, or GIF up to 5 MB.">
                  <div className={styles.filePicker}>
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.filePreview} src={profile.avatarUrl} alt="" />
                    ) : (
                      <span className={styles.filePreviewFallback} aria-hidden="true"><FiImage /></span>
                    )}
                    <div className={styles.filePickerCopy}>
                      <label className={styles.fileButton}>
                        <input
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={!user || uploadingAvatar}
                          type="file"
                          onChange={(event) => {
                            void uploadAvatar(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                        <FiImage aria-hidden="true" />
                        {uploadingAvatar ? "Uploading…" : profile.avatarUrl ? "Replace image" : "Choose image"}
                      </label>
                      <span className={styles.fieldHint}>Stored securely with your account.</span>
                    </div>
                  </div>
                </Field>
                <Field label="Avatar URL" wide hint="You can also paste an HTTPS image URL."><input value={profile.avatarUrl || ""} onChange={(event) => update("avatarUrl",event.target.value)} /></Field>
              </div>
            </>
          ) : null}

          {tab === "appearance" ? (
            <>
              <PanelHeading eyebrow="DESIGN / APPEARANCE" title="Pick a point of view." />
              <div className={styles.themes}>
                {themeOptions.map((theme) => <button key={theme.id} className={`${styles.themeButton} ${theme.className} ${profile.theme === theme.id ? styles.active : ""}`} type="button" onClick={() => update("theme",theme.id)}><strong>{theme.label}</strong>{profile.theme === theme.id ? <FiCheck /> : <span>SELECT</span>}</button>)}
              </div>
              <div className={styles.accentRow}><input type="color" aria-label="Accent color" value={profile.accent} onChange={(event) => update("accent",event.target.value)} /><div><strong>Accent color</strong><br /><code>{profile.accent}</code></div></div>
            </>
          ) : null}

          {tab === "settings" ? (
            <>
              <PanelHeading eyebrow="ACCOUNT / SETTINGS" title="Keep the exits visible." />
              <div className={styles.settingsBlock}>
                <div>
                  <h3>Sign-in methods</h3>
                  <p>Connect email, Google, and GitHub so any of them can open this account.</p>
                </div>
              </div>
              <LinkedSignInMethods />
              <div className={styles.settingsBlock}><div><h3>Export profile data</h3><p>Download the portable JSON used by the self-hosted edition.</p></div><button type="button" onClick={exportProfile}><FiDownload /> Export</button></div>
              <div className={styles.settingsBlock}><div><h3>Session</h3><p>{user ? `Signed in as ${user.email || "a connected provider"}.` : "Local demo mode; no account is connected."}</p></div><button type="button" onClick={logOut}><FiLogOut /> Sign out</button></div>
              <div className={styles.settingsBlock}><div><h3>Self-host this profile</h3><p>Use your export with the stripped edition and run it on your own infrastructure.</p></div><Link href="/self-host">Open guide</Link></div>
            </>
          ) : null}

          <button className={styles.primaryAction} type="button" onClick={() => void persistProfile()} disabled={saving}><FiSave /> {saving ? "Saving…" : "Save changes"}</button>
          {status ? <p className={styles.status} data-tone={status.tone}>{status.message}</p> : null}
        </main>

        <aside className={styles.previewPane} aria-label="Live profile preview">
          <span className={styles.previewLabel}><i /> LIVE PREVIEW</span>
          <div className={styles.phone}><ProfilePreview profile={profile} interactive /></div>
        </aside>
      </div>
    </div>
  );
}

function PanelHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className={styles.panelHeading}><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</header>;
}

function Field({ label, hint, wide = false, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return <div className={`${styles.formField} ${wide ? styles.formFieldWide : ""}`}><label>{label}</label>{children}{hint ? <span className={styles.fieldHint}>{hint}</span> : null}</div>;
}
