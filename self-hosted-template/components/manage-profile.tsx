"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  FloppyDisk,
  LinkSimple,
  Plus,
  SignOut,
  Trash,
  UserCircle
} from "@phosphor-icons/react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { cloneProfile, isSafeImageUrl, isSafePublicUrl } from "@/lib/profile-utils";
import { saveProfile, subscribeToProfile } from "@/lib/profile-store";
import { selfHostedConfig } from "@/profile.config";
import type { Profile, ProfileLink, SocialLink } from "@/types/profile";

type SaveState = "idle" | "saving" | "saved" | "error";

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function reorder<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const destination = index + offset;
  if (destination < 0 || destination >= items.length) return items;

  const next = [...items];
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

function validateProfile(profile: Profile): string {
  if (!profile.name.trim()) return "Add a display name before saving.";
  if (!profile.handle.trim()) return "Add a handle before saving.";
  if (profile.avatarUrl.trim() && !isSafeImageUrl(profile.avatarUrl)) {
    return "The avatar must use a local path or an http or https URL.";
  }

  const invalidLink = profile.links.find(
    (link) => !link.title.trim() || !isSafePublicUrl(link.url)
  );
  if (invalidLink) return "Every primary link needs a title and a valid URL.";

  const invalidSocial = profile.socials.find(
    (social) => !social.label.trim() || !isSafePublicUrl(social.url, false)
  );
  if (invalidSocial) return "Every social link needs a label and an http or https URL.";

  return "";
}

export function ManageProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(() => cloneProfile(selfHostedConfig.profile));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(
    () => subscribeToProfile((storedProfile) => setProfile(cloneProfile(storedProfile))),
    []
  );

  function patchProfile(patch: Partial<Profile>) {
    setProfile((current) => ({ ...current, ...patch }));
    setSaveState("idle");
    setMessage("");
  }

  function patchLink(index: number, patch: Partial<ProfileLink>) {
    patchProfile({
      links: profile.links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...patch } : link
      )
    });
  }

  function patchSocial(index: number, patch: Partial<SocialLink>) {
    patchProfile({
      socials: profile.socials.map((social, socialIndex) =>
        socialIndex === index ? { ...social, ...patch } : social
      )
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateProfile(profile);

    if (validationError) {
      setSaveState("error");
      setMessage(validationError);
      return;
    }

    setSaveState("saving");
    setMessage("");

    try {
      await saveProfile(profile);
      setSaveState("saved");
      setMessage("Profile published.");
    } catch {
      setSaveState("error");
      setMessage("Could not save the profile. Check the owner document and database rules.");
    }
  }

  async function handleSignOut() {
    const services = getFirebaseServices();
    if (services) await signOut(services.auth);
    router.replace("/login");
  }

  return (
    <main className="manage-page">
      <header className="manage-header">
        <Link className="manage-brand" href="/">
          Socialize <span>self-hosted</span>
        </Link>
        <nav aria-label="Workspace navigation">
          <Link className="text-button" href="/" rel="noreferrer" target="_blank">
            View profile
            <ArrowUpRight aria-hidden="true" size={17} weight="bold" />
          </Link>
          <button className="text-button" onClick={handleSignOut} type="button">
            <SignOut aria-hidden="true" size={17} weight="bold" />
            Sign out
          </button>
        </nav>
      </header>

      <form className="manage-form" onSubmit={handleSave}>
        <div className="manage-title">
          <div>
            <p className="eyebrow">Private workspace</p>
            <h1>Manage your profile</h1>
            <p>Edits publish to the public page as soon as the save is confirmed.</p>
          </div>
          <button className="primary-button save-button" disabled={saveState === "saving"} type="submit">
            <FloppyDisk aria-hidden="true" size={19} weight="bold" />
            {saveState === "saving" ? "Publishing" : "Publish changes"}
          </button>
        </div>

        {message ? (
          <p className={`save-message ${saveState === "error" ? "is-error" : "is-success"}`} role="status">
            {message}
          </p>
        ) : null}

        <section className="editor-section" aria-labelledby="identity-heading">
          <div className="section-heading">
            <UserCircle aria-hidden="true" size={25} weight="duotone" />
            <div>
              <h2 id="identity-heading">Identity</h2>
              <p>The short introduction visitors see first.</p>
            </div>
          </div>

          <div className="field-grid">
            <div className="field-block">
              <label htmlFor="name">Display name</label>
              <input
                id="name"
                onChange={(event) => patchProfile({ name: event.target.value })}
                required
                value={profile.name}
              />
            </div>
            <div className="field-block">
              <label htmlFor="handle">Handle</label>
              <input
                id="handle"
                onChange={(event) => patchProfile({ handle: event.target.value })}
                required
                value={profile.handle}
              />
            </div>
            <div className="field-block field-span">
              <label htmlFor="role">Role</label>
              <input
                id="role"
                onChange={(event) => patchProfile({ role: event.target.value })}
                value={profile.role}
              />
            </div>
            <div className="field-block field-span">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                maxLength={240}
                onChange={(event) => patchProfile({ bio: event.target.value })}
                rows={4}
                value={profile.bio}
              />
              <small>{profile.bio.length}/240 characters</small>
            </div>
            <div className="field-block">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                onChange={(event) => patchProfile({ location: event.target.value })}
                value={profile.location}
              />
            </div>
            <div className="field-block">
              <label htmlFor="availability">Availability</label>
              <input
                id="availability"
                onChange={(event) => patchProfile({ availability: event.target.value })}
                value={profile.availability}
              />
            </div>
            <div className="field-block field-span">
              <label htmlFor="avatar">Avatar URL</label>
              <input
                id="avatar"
                inputMode="url"
                onChange={(event) => patchProfile({ avatarUrl: event.target.value })}
                placeholder="/avatar.jpg"
                type="text"
                value={profile.avatarUrl}
              />
              <small>Prefer a square image in public/, such as /avatar.jpg.</small>
            </div>
            <div className="field-block color-field">
              <label htmlFor="accent">Accent color</label>
              <div>
                <input
                  id="accent"
                  onChange={(event) => patchProfile({ accent: event.target.value })}
                  type="color"
                  value={profile.accent}
                />
                <code>{profile.accent}</code>
              </div>
            </div>
          </div>
        </section>

        <section className="editor-section" aria-labelledby="links-heading">
          <div className="section-heading section-heading-action">
            <div className="heading-copy">
              <LinkSimple aria-hidden="true" size={25} weight="duotone" />
              <div>
                <h2 id="links-heading">Primary links</h2>
                <p>Reorder, hide, or update the links on your public profile.</p>
              </div>
            </div>
            <button
              className="secondary-button"
              onClick={() => patchProfile({
                links: [
                  ...profile.links,
                  { id: createId("link"), title: "", description: "", url: "https://", enabled: true }
                ]
              })}
              type="button"
            >
              <Plus aria-hidden="true" size={17} weight="bold" />
              Add link
            </button>
          </div>

          <div className="editor-list">
            {profile.links.length ? profile.links.map((link, index) => (
              <article className="link-editor" key={link.id}>
                <div className="editor-row-top">
                  <span className="editor-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="editor-actions">
                    <label className="toggle-label">
                      <input
                        checked={link.enabled}
                        onChange={(event) => patchLink(index, { enabled: event.target.checked })}
                        type="checkbox"
                      />
                      Published
                    </label>
                    <button
                      aria-label={`Move ${link.title || "link"} up`}
                      className="icon-button"
                      disabled={index === 0}
                      onClick={() => patchProfile({ links: reorder(profile.links, index, -1) })}
                      title="Move up"
                      type="button"
                    >
                      <ArrowUp aria-hidden="true" size={17} weight="bold" />
                    </button>
                    <button
                      aria-label={`Move ${link.title || "link"} down`}
                      className="icon-button"
                      disabled={index === profile.links.length - 1}
                      onClick={() => patchProfile({ links: reorder(profile.links, index, 1) })}
                      title="Move down"
                      type="button"
                    >
                      <ArrowDown aria-hidden="true" size={17} weight="bold" />
                    </button>
                    <button
                      aria-label={`Remove ${link.title || "link"}`}
                      className="icon-button danger-button"
                      onClick={() => patchProfile({ links: profile.links.filter((_, itemIndex) => itemIndex !== index) })}
                      title="Remove"
                      type="button"
                    >
                      <Trash aria-hidden="true" size={17} weight="bold" />
                    </button>
                  </div>
                </div>
                <div className="field-grid link-fields">
                  <div className="field-block">
                    <label htmlFor={`link-title-${link.id}`}>Title</label>
                    <input
                      id={`link-title-${link.id}`}
                      onChange={(event) => patchLink(index, { title: event.target.value })}
                      required
                      value={link.title}
                    />
                  </div>
                  <div className="field-block">
                    <label htmlFor={`link-url-${link.id}`}>URL</label>
                    <input
                      id={`link-url-${link.id}`}
                      inputMode="url"
                      onChange={(event) => patchLink(index, { url: event.target.value })}
                      required
                      value={link.url}
                    />
                  </div>
                  <div className="field-block field-span">
                    <label htmlFor={`link-description-${link.id}`}>Description</label>
                    <input
                      id={`link-description-${link.id}`}
                      onChange={(event) => patchLink(index, { description: event.target.value })}
                      value={link.description}
                    />
                  </div>
                </div>
              </article>
            )) : (
              <div className="editor-empty">
                <LinkSimple aria-hidden="true" size={28} weight="duotone" />
                <h3>Your link list is empty</h3>
                <p>Add a link when you are ready to publish something.</p>
              </div>
            )}
          </div>
        </section>

        <section className="editor-section" aria-labelledby="social-heading">
          <div className="section-heading section-heading-action">
            <div>
              <h2 id="social-heading">Social profiles</h2>
              <p>Compact links shown below your introduction.</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => patchProfile({
                socials: [...profile.socials, { id: createId("social"), label: "", url: "https://" }]
              })}
              type="button"
            >
              <Plus aria-hidden="true" size={17} weight="bold" />
              Add social
            </button>
          </div>

          <div className="social-editors">
            {profile.socials.map((social, index) => (
              <div className="social-editor" key={social.id}>
                <div className="field-block">
                  <label htmlFor={`social-label-${social.id}`}>Label</label>
                  <input
                    id={`social-label-${social.id}`}
                    onChange={(event) => patchSocial(index, { label: event.target.value })}
                    required
                    value={social.label}
                  />
                </div>
                <div className="field-block social-url-field">
                  <label htmlFor={`social-url-${social.id}`}>URL</label>
                  <input
                    id={`social-url-${social.id}`}
                    inputMode="url"
                    onChange={(event) => patchSocial(index, { url: event.target.value })}
                    required
                    value={social.url}
                  />
                </div>
                <button
                  aria-label={`Remove ${social.label || "social link"}`}
                  className="icon-button danger-button social-remove"
                  onClick={() => patchProfile({ socials: profile.socials.filter((_, itemIndex) => itemIndex !== index) })}
                  title="Remove"
                  type="button"
                >
                  <Trash aria-hidden="true" size={17} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mobile-save-bar">
          <button className="primary-button" disabled={saveState === "saving"} type="submit">
            <FloppyDisk aria-hidden="true" size={19} weight="bold" />
            {saveState === "saving" ? "Publishing" : "Publish changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
