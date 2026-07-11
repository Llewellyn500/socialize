"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiCopy,
  FiDownload,
  FiEye,
  FiFileText,
  FiLink,
  FiLogOut,
  FiMonitor,
  FiPlus,
  FiSave,
  FiSettings,
  FiSliders,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import { Brand } from "@/components/brand";
import { ProfilePreview } from "@/components/profile-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth, isFirebaseConfigured, storage } from "@/lib/firebase";
import { demoProfile, isSafeExternalUrl, type ProfileConfig, type ProfileTheme } from "@/lib/profile";
import { loadProfile, saveProfile } from "@/lib/profile-store";
import styles from "./dashboard-app.module.css";

type Tab = "overview" | "links" | "profile" | "appearance" | "settings";
type Status = { tone: "neutral" | "success" | "error"; message: string } | null;

const navItems = [
  ["overview", "Overview", FiMonitor],
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
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [host, setHost] = useState("socialize.dev");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    setHost(window.location.host);
    if (!auth) {
      const localProfile = window.localStorage.getItem("socialize-demo-profile");
      if (localProfile) {
        try { setProfile(JSON.parse(localProfile) as ProfileConfig); } catch { /* keep demo */ }
      }
      return;
    }
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        const stored = await loadProfile(nextUser.uid);
        if (stored) setProfile(stored);
      }
    });
  }, []);

  const pageUrl = useMemo(() => {
    return `${host}/${profile.handle}`;
  }, [host, profile.handle]);

  function update<K extends keyof ProfileConfig>(key: K, value: ProfileConfig[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function addLink() {
    update("links", [
      ...profile.links,
      {
        id: `link-${Date.now()}`,
        title: "Untitled link",
        description: "Add a short reason to click.",
        url: "https://example.com",
        enabled: true,
        kind: "link",
      },
    ]);
  }

  function updateLink(index: number, key: "title" | "description" | "url" | "enabled", value: string | boolean) {
    const links = profile.links.map((link, linkIndex) =>
      linkIndex === index ? { ...link, [key]: value } : link,
    );
    update("links", links);
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= profile.links.length) return;
    const links = [...profile.links];
    [links[index], links[target]] = [links[target], links[index]];
    update("links", links);
  }

  function removeLink(index: number) {
    update("links", profile.links.filter((_, linkIndex) => linkIndex !== index));
  }

  async function persistProfile() {
    setSaving(true);
    setStatus(null);
    try {
      const invalidLink = profile.links.find((link) => !isSafeExternalUrl(link.url));
      if (invalidLink) throw new Error(`“${invalidLink.title}” needs an https:// or mailto: URL.`);
      if (auth && user) {
        const saved = await saveProfile(user.uid, profile);
        setProfile(saved);
      } else {
        window.localStorage.setItem("socialize-demo-profile", JSON.stringify(profile));
      }
      setStatus({ tone: "success", message: auth && user ? "Saved to Firebase." : "Saved in this browser demo." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "We could not save your profile." });
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (!storage || !user) {
      setStatus({ tone: "error", message: "Connect Firebase and sign in before uploading an avatar." });
      return;
    }
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      setStatus({ tone: "error", message: "Use a JPEG, PNG, WebP, or GIF image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ tone: "error", message: "Avatar images must be smaller than 5 MB." });
      return;
    }

    setUploadingAvatar(true);
    setStatus(null);
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}/avatar`);
      await uploadBytes(avatarRef, file, { contentType: file.type });
      const avatarUrl = await getDownloadURL(avatarRef);
      update("avatarUrl", avatarUrl);
      setStatus({ tone: "success", message: "Avatar uploaded. Save changes to publish it with your profile." });
    } catch {
      setStatus({ tone: "error", message: "The avatar upload failed. Check Firebase Storage and its deployed rules." });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function copyPageUrl() {
    await navigator.clipboard.writeText(`${window.location.protocol}//${pageUrl}`);
    setStatus({ tone: "success", message: "Profile URL copied." });
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

  if (!authReady) {
    return <div className={styles.emptyAuth}><div><Brand /><h1>Loading your workspace.</h1><p>Connecting to your Socialize account…</p></div></div>;
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
          <button type="button" onClick={copyPageUrl} aria-label="Copy profile URL"><FiCopy /> Copy URL</button>
          <Link href={`/${profile.handle}`} target="_blank"><FiEye /> Preview</Link>
          <button className={styles.publish} type="button" onClick={() => update("published", !profile.published)}>{profile.published ? "Unpublish" : "Publish"}</button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Dashboard navigation">
          <div className={styles.account}>
            <span className={styles.accountAvatar}>{profile.displayName.slice(0, 2).toUpperCase()}</span>
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
              {!isFirebaseConfigured ? <div className={styles.notice}>This is the local demo workspace. Add your Firebase environment values to enable real accounts and cloud saves.</div> : null}
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}><span>Profile status</span><strong>{profile.published ? "Live" : "Draft"}</strong><p>@{profile.handle}</p></div>
                <div className={styles.overviewCard}><span>Active links</span><strong>{profile.links.filter((link) => link.enabled).length}</strong><p>of {profile.links.length} total</p></div>
                <div className={styles.overviewCard}><span>Theme</span><strong>{profile.theme}</strong><p>{profile.accent} accent</p></div>
                <div className={styles.overviewCard}><span>Data mode</span><strong>{user ? "Cloud" : "Local"}</strong><p>{user ? "Firebase" : "browser demo"}</p></div>
              </div>
              <div className={styles.checklist}>
                <div><FiCheck /><span>Claim your handle</span><small>@{profile.handle}</small></div>
                <div><FiCheck /><span>Add your best work</span><small>{profile.links.length} links</small></div>
                <div>{profile.published ? <FiCheck /> : <FiFileText />}<span>Publish your profile</span><small>{profile.published ? "done" : "waiting"}</small></div>
              </div>
            </>
          ) : null}

          {tab === "links" ? (
            <>
              <PanelHeading eyebrow="CONTENT / LINKS" title="Arrange your work." action={<button type="button" onClick={addLink}><FiPlus /> Add link</button>} />
              <div className={styles.linkList}>
                {profile.links.map((link, index) => (
                  <article className={styles.linkRow} key={link.id}>
                    <span className={styles.linkRowNumber}>{String(index + 1).padStart(2,"0")}</span>
                    <div className={styles.linkFields}>
                      <input aria-label={`Title for link ${index + 1}`} value={link.title} onChange={(event) => updateLink(index,"title",event.target.value)} />
                      <input aria-label={`Description for link ${index + 1}`} value={link.description || ""} onChange={(event) => updateLink(index,"description",event.target.value)} />
                      <input aria-label={`URL for link ${index + 1}`} value={link.url} onChange={(event) => updateLink(index,"url",event.target.value)} />
                    </div>
                    <div className={styles.linkActions}>
                      <button type="button" aria-label={`Move ${link.title} up`} onClick={() => moveLink(index,-1)} disabled={index === 0}><FiArrowUp /></button>
                      <button type="button" aria-label={`Move ${link.title} down`} onClick={() => moveLink(index,1)} disabled={index === profile.links.length - 1}><FiArrowDown /></button>
                      <button type="button" aria-label={`${link.enabled ? "Hide" : "Show"} ${link.title}`} onClick={() => updateLink(index,"enabled",!link.enabled)}>{link.enabled ? <FiEye /> : <FiLink />}</button>
                      <button type="button" aria-label={`Delete ${link.title}`} onClick={() => removeLink(index)}><FiTrash2 /></button>
                    </div>
                  </article>
                ))}
              </div>
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
                <Field label="Location"><input value={profile.location || ""} onChange={(event) => update("location",event.target.value)} /></Field>
                <Field label="Availability"><input value={profile.availability || ""} onChange={(event) => update("availability",event.target.value)} /></Field>
                <Field label="Avatar image" wide hint="JPEG, PNG, WebP, or GIF up to 5 MB. Files are stored under your Firebase user path."><input accept="image/jpeg,image/png,image/webp,image/gif" disabled={!user || uploadingAvatar} type="file" onChange={(event) => uploadAvatar(event.target.files?.[0])} /></Field>
                <Field label="Avatar URL" wide hint="You can also use an HTTPS image URL."><input value={profile.avatarUrl || ""} onChange={(event) => update("avatarUrl",event.target.value)} /></Field>
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
              <div className={styles.settingsBlock}><div><h3>Export profile data</h3><p>Download the portable JSON used by the self-hosted edition.</p></div><button type="button" onClick={exportProfile}><FiDownload /> Export</button></div>
              <div className={styles.settingsBlock}><div><h3>Authentication</h3><p>{user ? `Signed in as ${user.email || "a connected provider"}.` : "Local demo mode; no account is connected."}</p></div><button type="button" onClick={logOut}><FiLogOut /> Sign out</button></div>
              <div className={styles.settingsBlock}><div><h3>Self-host this profile</h3><p>Use your export with the stripped edition and your own Firebase project.</p></div><Link href="/self-host">Open guide</Link></div>
            </>
          ) : null}

          <button className={styles.primaryAction} type="button" onClick={persistProfile} disabled={saving}><FiSave /> {saving ? "Saving…" : "Save changes"}</button>
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
