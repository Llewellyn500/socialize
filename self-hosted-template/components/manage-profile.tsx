"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ChartBar,
  FloppyDisk,
  GitCommit,
  GithubLogo,
  LinkSimple,
  Plus,
  SignOut,
  Trash,
  UploadSimple,
  UserCircle
} from "@phosphor-icons/react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getFirebaseServices } from "@/lib/firebase";
import { parseHostedProfileExport } from "@/lib/hosted-profile-import";
import {
  cloneProfile,
  developerActivityHasVisibleModules,
  isSafeImageUrl,
  isSafePublicUrl,
  isValidRepositoryFullName,
  normalizeRepositoryNames,
  repositoryNameTokens,
} from "@/lib/profile-utils";
import {
  ProfileRevisionConflictError,
  saveProfile,
  subscribeToProfile
} from "@/lib/profile-store";
import { ManageLinks } from "@/components/manage-links";
import { selfHostedConfig } from "@/profile.config";
import type {
  DeveloperActivity,
  Profile,
  SocialLink,
} from "@/types/profile";

type SaveState = "idle" | "saving" | "saved" | "error";

const GITHUB_USERNAME = /^(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function validateProfile(profile: Profile): string {
  if (!profile.name.trim()) return "Add a display name before saving.";
  if (!profile.handle.trim()) return "Add a handle before saving.";
  if (profile.avatarUrl.trim() && !isSafeImageUrl(profile.avatarUrl)) {
    return "The avatar must use a local path or an https URL.";
  }

  const invalidLink = profile.links.find(
    (link) => !link.title.trim() || !isSafePublicUrl(link.url)
  );
  if (invalidLink) return "Every primary link needs a title and a valid URL.";
  const invalidLinkMedia = profile.links.find(
    (link) => link.mediaUrl && !isSafeImageUrl(link.mediaUrl)
  );
  if (invalidLinkMedia) return "Link images must use a local path or an https URL.";

  const invalidSection = profile.sections.find(
    (section) => !section.title.trim() || (section.mediaUrl && !isSafeImageUrl(section.mediaUrl))
  );
  if (invalidSection) return "Every section needs a heading and a valid local path or https image URL.";

  const invalidSocial = profile.socials.find(
    (social) => !social.label.trim() || !isSafePublicUrl(social.url, false)
  );
  if (invalidSocial) return "Every social link needs a label and an http or https URL.";

  const activity = profile.developerActivity;
  if (activity?.enabled) {
    if (!GITHUB_USERNAME.test(activity.githubUsername)) {
      return "Add a valid GitHub username before publishing developer activity.";
    }
    if (!developerActivityHasVisibleModules(activity)) {
      return "Choose at least one contribution, language, or commit item to show.";
    }
    if (
      activity.repositories.mode === "include" &&
      activity.repositories.names.length === 0
    ) {
      return "Add a repository or switch repository selection to Recent.";
    }
    if (activity.repositories.names.some((name) => !isValidRepositoryFullName(name))) {
      return "Repository filters must use the owner/repository format.";
    }
    if (activity.commits.enabled && !activity.commits.title.trim()) {
      return "Add a heading for recent commits.";
    }
    if (activity.coding.enabled && !activity.coding.title.trim()) {
      return "Add a heading for coding activity.";
    }
  }

  return "";
}

export function ManageProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(() => cloneProfile(selfHostedConfig.profile));
  const [persistedProfile, setPersistedProfile] = useState<Profile>(
    () => cloneProfile(selfHostedConfig.profile)
  );
  const [persistedRevision, setPersistedRevision] = useState("");
  const [persistedReady, setPersistedReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [mediaUploading, setMediaUploading] = useState(false);
  const developerActivity = profile.developerActivity ?? selfHostedConfig.profile.developerActivity!;
  const repositoryKey = developerActivity.repositories.names.join("\n");
  const [repositoryDraft, setRepositoryDraft] = useState(repositoryKey);

  useEffect(
    () => subscribeToProfile((storedProfile, revision) => {
      const next = cloneProfile(storedProfile);
      setProfile(next);
      setPersistedProfile(cloneProfile(storedProfile));
      setPersistedRevision(revision);
      setPersistedReady(true);
    }),
    []
  );

  useEffect(() => setRepositoryDraft(repositoryKey), [repositoryKey]);

  function patchProfile(patch: Partial<Profile>) {
    setProfile((current) => ({ ...current, ...patch }));
    setSaveState("idle");
    setMessage("");
  }

  function patchSocial(index: number, patch: Partial<SocialLink>) {
    patchProfile({
      socials: profile.socials.map((social, socialIndex) =>
        socialIndex === index ? { ...social, ...patch } : social
      )
    });
  }

  function patchDeveloperActivity(patch: Partial<DeveloperActivity>) {
    patchProfile({ developerActivity: { ...developerActivity, ...patch } });
  }

  function patchCommitActivity(patch: Partial<DeveloperActivity["commits"]>) {
    patchDeveloperActivity({ commits: { ...developerActivity.commits, ...patch } });
  }

  function patchCodingActivity(patch: Partial<DeveloperActivity["coding"]>) {
    patchDeveloperActivity({ coding: { ...developerActivity.coding, ...patch } });
  }

  function patchRepositories(patch: Partial<DeveloperActivity["repositories"]>) {
    patchDeveloperActivity({
      repositories: { ...developerActivity.repositories, ...patch }
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mediaUploading) {
      setSaveState("error");
      setMessage("Wait for image uploads to finish before publishing.");
      return;
    }
    const validationError = validateProfile(profile);

    if (validationError) {
      setSaveState("error");
      setMessage(validationError);
      return;
    }

    setSaveState("saving");
    setMessage("");

    try {
      const saved = await saveProfile(profile, persistedRevision);
      setProfile(cloneProfile(saved.profile));
      setPersistedProfile(cloneProfile(saved.profile));
      setPersistedRevision(saved.revision);
      setSaveState("saved");
      setMessage("Profile published.");
    } catch (error) {
      setSaveState("error");
      setMessage(
        error instanceof ProfileRevisionConflictError
          ? error.message
          : "Could not save the profile. Check the owner document and database rules."
      );
    }
  }

  async function handleSignOut() {
    if (mediaUploading) {
      setSaveState("error");
      setMessage("Wait for image uploads to finish before signing out.");
      return;
    }
    const services = getFirebaseServices();
    if (services) await signOut(services.auth);
    router.replace("/login");
  }

  async function handleHostedImport(file?: File) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setSaveState("error");
      setMessage("The profile export must be 1 MB or smaller.");
      return;
    }

    try {
      const result = parseHostedProfileExport(
        await file.text(),
        selfHostedConfig.profile
      );
      setProfile(cloneProfile(result.profile));
      setSaveState("idle");
      setMessage(
        result.warnings.length
          ? `Imported for review. ${result.warnings.join(" ")}`
          : "Imported for review. Publish changes when everything looks right."
      );
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "The profile export could not be imported.");
    }
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
          <button className="text-button" disabled={mediaUploading} onClick={handleSignOut} type="button">
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
          <button className="primary-button save-button" disabled={saveState === "saving" || mediaUploading} type="submit">
            <FloppyDisk aria-hidden="true" size={19} weight="bold" />
            {saveState === "saving" ? "Publishing" : mediaUploading ? "Uploading image" : "Publish changes"}
          </button>
        </div>

        {message ? (
          <p className={`save-message ${saveState === "error" ? "is-error" : "is-success"}`} role="status">
            {message}
          </p>
        ) : null}

        <section className="editor-section import-section" aria-labelledby="import-heading">
          <div className="section-heading section-heading-action">
            <div className="heading-copy">
              <UploadSimple aria-hidden="true" size={25} weight="duotone" />
              <div>
                <h2 id="import-heading">Moving from hosted Socialize?</h2>
                <p>Choose the JSON from the hosted dashboard. Nothing is published until you review and save.</p>
              </div>
            </div>
            <label className="secondary-button import-button">
              <input
                accept="application/json,.json"
                disabled={mediaUploading}
                type="file"
                onChange={(event) => {
                  void handleHostedImport(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <UploadSimple aria-hidden="true" size={17} weight="bold" />
              Import hosted JSON
            </label>
          </div>
        </section>

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
                <p>Drag links into any order, group them, and add optional imagery.</p>
              </div>
            </div>
          </div>
          <ManageLinks
            profile={profile}
            persistedProfile={persistedProfile}
            persistedReady={persistedReady}
            onChange={patchProfile}
            onUploadActivityChange={setMediaUploading}
          />
        </section>

        <section className="editor-section" aria-labelledby="developer-activity-heading">
          <div className="section-heading section-heading-action">
            <div className="heading-copy">
              <GithubLogo aria-hidden="true" size={25} weight="duotone" />
              <div>
                <h2 id="developer-activity-heading">Developer activity</h2>
                <p>Show public GitHub commits and recent coding patterns on your profile.</p>
              </div>
            </div>
            <label className="activity-visibility-toggle">
              <input
                checked={developerActivity.enabled}
                onChange={(event) => patchDeveloperActivity({ enabled: event.target.checked })}
                type="checkbox"
              />
              <span>{developerActivity.enabled ? "Visible on profile" : "Hidden from profile"}</span>
            </label>
          </div>

          <div className="field-grid activity-source-fields">
            <div className="field-block">
              <label htmlFor="github-username">GitHub username</label>
              <input
                autoComplete="off"
                id="github-username"
                maxLength={39}
                onChange={(event) => patchDeveloperActivity({
                  githubUsername: event.target.value.trimStart().replace(/^@/, "")
                })}
                placeholder="octocat"
                required={developerActivity.enabled}
                spellCheck={false}
                value={developerActivity.githubUsername}
              />
              <small>Public GitHub data only. Enter the account name without @.</small>
            </div>
            <div className="field-block">
              <label htmlFor="activity-placement">Profile placement</label>
              <select
                id="activity-placement"
                onChange={(event) => patchDeveloperActivity({
                  placement: event.target.value as DeveloperActivity["placement"]
                })}
                value={developerActivity.placement}
              >
                <option value="before-links">Before primary links</option>
                <option value="after-links">After primary links</option>
              </select>
              <small>Choose where the activity section appears in the profile column.</small>
            </div>
          </div>

          <div className="field-grid activity-repository-fields">
            <div className="field-block">
              <label htmlFor="repository-mode">Repository selection</label>
              <select
                id="repository-mode"
                onChange={(event) => patchRepositories({
                  mode: event.target.value as DeveloperActivity["repositories"]["mode"]
                })}
                value={developerActivity.repositories.mode}
              >
                <option value="recent">Automatic · recent repositories</option>
                <option value="include">Only selected repositories</option>
                <option value="exclude">Recent except selected</option>
              </select>
              <small>Automatic mode samples up to three recent public repositories.</small>
            </div>
            {developerActivity.repositories.mode !== "recent" ? (
              <div className="field-block">
                <label htmlFor="repository-names">
                  {developerActivity.repositories.mode === "include"
                    ? "Repositories to show"
                    : "Repositories to hide"}
                </label>
                <textarea
                  aria-invalid={
                    repositoryNameTokens(repositoryDraft).length > 5 ||
                    repositoryNameTokens(repositoryDraft).some(
                      (repository) => !isValidRepositoryFullName(repository)
                    )
                  }
                  id="repository-names"
                  onBlur={() => {
                    const repositories = normalizeRepositoryNames(repositoryDraft);
                    setRepositoryDraft(repositories.join("\n"));
                    patchRepositories({ names: repositories });
                  }}
                  onChange={(event) => setRepositoryDraft(event.target.value)}
                  placeholder={"owner/project\norganization/tooling"}
                  rows={3}
                  spellCheck={false}
                  value={repositoryDraft}
                />
                <small>Use up to five owner/repository names, one per line or comma-separated.</small>
              </div>
            ) : null}
          </div>

          <div className="activity-editor-modules">
            <article className="activity-editor-module">
              <div className="activity-editor-module-heading">
                <div>
                  <GitCommit aria-hidden="true" size={21} weight="duotone" />
                  <div>
                    <h3>Recent commits</h3>
                    <p>Link directly to recent public commit pages.</p>
                  </div>
                </div>
                <label className="toggle-label">
                  <input
                    checked={developerActivity.commits.enabled}
                    onChange={(event) => patchCommitActivity({ enabled: event.target.checked })}
                    type="checkbox"
                  />
                  Enabled
                </label>
              </div>

              <fieldset disabled={!developerActivity.commits.enabled}>
                <legend className="sr-only">Recent commit display settings</legend>
                <div className="field-grid activity-module-fields">
                  <div className="field-block field-span">
                    <label htmlFor="commits-title">Section title</label>
                    <input
                      id="commits-title"
                      maxLength={60}
                      onChange={(event) => patchCommitActivity({ title: event.target.value })}
                      required={developerActivity.enabled && developerActivity.commits.enabled}
                      value={developerActivity.commits.title}
                    />
                  </div>
                  <div className="field-block field-span">
                    <label htmlFor="commits-limit">Commits to show</label>
                    <input
                      id="commits-limit"
                      max={10}
                      min={1}
                      onChange={(event) => patchCommitActivity({
                        limit: Math.min(10, Math.max(1, Number(event.target.value) || 1))
                      })}
                      type="number"
                      value={developerActivity.commits.limit}
                    />
                    <small>Choose between 1 and 10 commits.</small>
                  </div>
                </div>
                <div className="activity-option-row">
                  <label className="check-option">
                    <input
                      checked={developerActivity.commits.showRepository}
                      onChange={(event) => patchCommitActivity({ showRepository: event.target.checked })}
                      type="checkbox"
                    />
                    Show repository
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.commits.showDate}
                      onChange={(event) => patchCommitActivity({ showDate: event.target.checked })}
                      type="checkbox"
                    />
                    Show date
                  </label>
                </div>
              </fieldset>
            </article>

            <article className="activity-editor-module">
              <div className="activity-editor-module-heading">
                <div>
                  <ChartBar aria-hidden="true" size={21} weight="duotone" />
                  <div>
                    <h3>Coding activity</h3>
                    <p>Choose which parts of the yearly contribution view appear.</p>
                  </div>
                </div>
                <label className="toggle-label">
                  <input
                    checked={developerActivity.coding.enabled}
                    onChange={(event) => patchCodingActivity({ enabled: event.target.checked })}
                    type="checkbox"
                  />
                  Enabled
                </label>
              </div>

              <fieldset disabled={!developerActivity.coding.enabled}>
                <legend className="sr-only">Coding activity display settings</legend>
                <div className="field-grid activity-module-fields">
                  <div className="field-block field-span">
                    <label htmlFor="coding-title">Section title</label>
                    <input
                      id="coding-title"
                      maxLength={60}
                      onChange={(event) => patchCodingActivity({ title: event.target.value })}
                      required={developerActivity.enabled && developerActivity.coding.enabled}
                      value={developerActivity.coding.title}
                    />
                  </div>
                </div>
                <div className="activity-option-row activity-option-grid">
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showContributionCount}
                      onChange={(event) => patchCodingActivity({ showContributionCount: event.target.checked })}
                      type="checkbox"
                    />
                    Show contribution total
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showHeatmap}
                      onChange={(event) => patchCodingActivity({ showHeatmap: event.target.checked })}
                      type="checkbox"
                    />
                    Show contribution calendar
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showMonthLabels}
                      disabled={!developerActivity.coding.showHeatmap}
                      onChange={(event) => patchCodingActivity({ showMonthLabels: event.target.checked })}
                      type="checkbox"
                    />
                    Show month labels
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showWeekdayLabels}
                      disabled={!developerActivity.coding.showHeatmap}
                      onChange={(event) => patchCodingActivity({ showWeekdayLabels: event.target.checked })}
                      type="checkbox"
                    />
                    Show weekday labels
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showLegend}
                      disabled={!developerActivity.coding.showHeatmap}
                      onChange={(event) => patchCodingActivity({ showLegend: event.target.checked })}
                      type="checkbox"
                    />
                    Show intensity legend
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showYearSelector}
                      onChange={(event) => patchCodingActivity({ showYearSelector: event.target.checked })}
                      type="checkbox"
                    />
                    Show year selector
                  </label>
                  <label className="check-option">
                    <input
                      checked={developerActivity.coding.showLanguages}
                      onChange={(event) => patchCodingActivity({ showLanguages: event.target.checked })}
                      type="checkbox"
                    />
                    Show active languages
                  </label>
                </div>
                <p className="activity-module-note">
                  The contribution calendar is account-wide. Repository filters apply to commits and languages.
                </p>
              </fieldset>
            </article>
          </div>

          <p className="activity-editor-note">
            Calendar data is cached for about one hour; commit data for about 15 minutes. Keep the server-only GITHUB_TOKEN limited to public data.
          </p>
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
          <button className="primary-button" disabled={saveState === "saving" || mediaUploading} type="submit">
            <FloppyDisk aria-hidden="true" size={19} weight="bold" />
            {saveState === "saving" ? "Publishing" : mediaUploading ? "Uploading image" : "Publish changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
