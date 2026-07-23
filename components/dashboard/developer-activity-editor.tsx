"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FiActivity, FiCheckCircle, FiGitCommit, FiGithub, FiLink } from "react-icons/fi";
import {
  isValidGitHubUsername,
  isValidGitHubRepository,
  normalizeGitHubRepositories,
  normalizeGitHubUsername,
  type DeveloperActivityConfig,
  type RepositoryMode,
} from "@/lib/profile";
import type { GitHubActivityResponse } from "@/lib/github-activity";
import {
  captureGitHubLoginFromCredential,
  hasLinkedGitHub,
  resolveGitHubLogin,
} from "@/lib/auth-providers";
import { linkGithub } from "@/lib/auth-linking";
import { auth } from "@/lib/firebase";
import { getFirebaseAuthError } from "@/components/auth/firebase-errors";
import { CustomSelect } from "@/components/ui/custom-select";
import styles from "./developer-activity-editor.module.css";

type ConnectionState =
  | { tone: "idle"; message: string }
  | { tone: "loading"; message: string }
  | { tone: "success"; message: string }
  | { tone: "error"; message: string };

type DeveloperActivityEditorProps = {
  value: DeveloperActivityConfig;
  onChange: (value: DeveloperActivityConfig) => void;
};

export function DeveloperActivityEditor({
  value,
  onChange,
}: DeveloperActivityEditorProps) {
  const [authUser, setAuthUser] = useState<User | null>(auth?.currentUser ?? null);
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [resolvingLogin, setResolvingLogin] = useState(false);
  const [linkingGitHub, setLinkingGitHub] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [connection, setConnection] = useState<ConnectionState>({
    tone: "idle",
    message: "Only public GitHub activity is displayed.",
  });
  const [repositoryInput, setRepositoryInput] = useState(
    value.repositories.names.join("\n"),
  );
  const connectionController = useRef<AbortController | null>(null);

  const githubLinked = hasLinkedGitHub(authUser);
  const normalizedLinkedUsername = linkedUsername
    ? normalizeGitHubUsername(linkedUsername)
    : "";
  const normalizedUsername = normalizeGitHubUsername(
    linkedUsername ? normalizedLinkedUsername : value.githubUsername,
  );
  const usernameIsValid = isValidGitHubUsername(normalizedUsername);
  const repositoryEntries = repositoryInput.split(/[\s,]+/).filter(Boolean);
  const normalizedRepositories = normalizeGitHubRepositories(repositoryEntries);
  const repositoriesAreValid =
    repositoryEntries.length <= 5 && repositoryEntries.every(isValidGitHubRepository);
  const repositorySelectionIsValid =
    value.repositories.mode !== "include" || normalizedRepositories.length > 0;
  const calendarVisible =
    value.coding.showContributionCount ||
    value.coding.showHeatmap ||
    value.coding.showYearSelector;
  const codingHasVisiblePart =
    value.coding.enabled && (calendarVisible || value.coding.showLanguages);
  const hasVisibleModule = value.commits.enabled || codingHasVisiblePart;

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => setAuthUser(nextUser));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!authUser || !hasLinkedGitHub(authUser)) {
      setLinkedUsername(null);
      setResolvingLogin(false);
      return;
    }
    setResolvingLogin(true);
    void resolveGitHubLogin(authUser).then((login) => {
      if (cancelled) return;
      setLinkedUsername(login);
      setResolvingLogin(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => () => connectionController.current?.abort(), []);

  // Keep activity username locked to the linked GitHub account login.
  useEffect(() => {
    if (!normalizedLinkedUsername) return;
    if (
      normalizeGitHubUsername(value.githubUsername).toLowerCase() ===
      normalizedLinkedUsername.toLowerCase()
    ) {
      return;
    }
    onChange({ ...value, githubUsername: normalizedLinkedUsername });
    // Only re-sync when the resolved login changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedLinkedUsername]);

  function resetConnection() {
    connectionController.current?.abort();
    connectionController.current = null;
    setConnection({ tone: "idle", message: "Save changes when the preview looks right." });
  }

  function patch(patchValue: Partial<DeveloperActivityConfig>) {
    onChange({ ...value, ...patchValue });
    resetConnection();
  }

  function patchCommits(patchValue: Partial<DeveloperActivityConfig["commits"]>) {
    onChange({ ...value, commits: { ...value.commits, ...patchValue } });
    resetConnection();
  }

  function patchCoding(patchValue: Partial<DeveloperActivityConfig["coding"]>) {
    onChange({ ...value, coding: { ...value.coding, ...patchValue } });
    resetConnection();
  }

  function patchRepositories(mode: RepositoryMode, names = normalizedRepositories) {
    onChange({ ...value, repositories: { mode, names } });
    resetConnection();
  }

  function toggleEnabled(enabled: boolean) {
    patch({
      enabled,
      githubUsername:
        enabled && normalizedLinkedUsername
          ? normalizedLinkedUsername
          : value.githubUsername,
    });
  }

  async function handleLinkGitHub() {
    if (!authUser) {
      setLinkError("Sign in before linking GitHub.");
      return;
    }
    setLinkError("");
    setLinkingGitHub(true);
    try {
      const result = await linkGithub(authUser);
      setAuthUser(result.user);
      const nextUsername =
        (await captureGitHubLoginFromCredential(result)) ??
        (await resolveGitHubLogin(result.user));
      setLinkedUsername(nextUsername);
      if (nextUsername) {
        patch({ githubUsername: normalizeGitHubUsername(nextUsername) });
      }
    } catch (error) {
      setLinkError(getFirebaseAuthError(error));
    } finally {
      setLinkingGitHub(false);
    }
  }

  async function testConnection() {
    if (!githubLinked) {
      setConnection({
        tone: "error",
        message: "Link your GitHub account before testing the connection.",
      });
      return;
    }
    if (!linkedUsername) {
      setConnection({
        tone: "error",
        message: resolvingLogin
          ? "Still resolving your GitHub username…"
          : "Could not resolve your GitHub username. Try unlinking and linking GitHub again.",
      });
      return;
    }
    if (!usernameIsValid) {
      setConnection({ tone: "error", message: "Your linked GitHub username is invalid." });
      return;
    }
    if (!hasVisibleModule) {
      setConnection({ tone: "error", message: "Enable commits or coding activity first." });
      return;
    }
    if (!repositorySelectionIsValid || !repositoriesAreValid) {
      setConnection({ tone: "error", message: "Check the repository selection first." });
      return;
    }

    connectionController.current?.abort();
    const controller = new AbortController();
    connectionController.current = controller;
    setConnection({ tone: "loading", message: "Checking public GitHub activity…" });
    try {
      const params = new URLSearchParams({
        username: normalizedUsername,
        commits: String(value.commits.enabled),
        coding: String(codingHasVisiblePart),
        calendar: String(value.coding.enabled && calendarVisible),
        languages: String(codingHasVisiblePart && value.coding.showLanguages),
        limit: String(value.commits.limit),
        repoMode: value.repositories.mode,
      });
      normalizedRepositories.forEach((repository) => params.append("repo", repository));
      const response = await fetch(`/api/github-activity?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await response.json()) as GitHubActivityResponse | { error?: string };
      if (!response.ok || !("summary" in data)) {
        throw new Error("error" in data ? data.error : "GitHub activity is unavailable.");
      }
      setConnection({
        tone: "success",
        message: `@${data.username} · ${data.contributions?.totalContributions.toLocaleString() ?? data.summary.commits.toLocaleString()} contributions · ${data.repositories.length} ${data.repositories.length === 1 ? "repository" : "repositories"} checked.`,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setConnection({
        tone: "error",
        message: error instanceof Error ? error.message : "GitHub activity is unavailable.",
      });
    } finally {
      if (connectionController.current === controller) connectionController.current = null;
    }
  }

  return (
    <div className={styles.editor}>
      <section className={styles.integration} aria-labelledby="github-integration-title">
        <div className={styles.integrationHeading}>
          <span className={styles.integrationIcon}><FiGithub aria-hidden="true" /></span>
          <div>
            <h2 id="github-integration-title">GitHub activity</h2>
            <p>
              Show a contribution calendar that matches GitHub&apos;s profile graph
              (including private activity they&apos;ve chosen to share), plus public
              commits and repository languages.
            </p>
          </div>
          <label className={styles.masterToggle}>
            <input
              checked={value.enabled}
              disabled={!githubLinked && !value.enabled}
              onChange={(event) => toggleEnabled(event.target.checked)}
              type="checkbox"
            />
            <span>{value.enabled ? "Shown" : "Hidden"}</span>
          </label>
        </div>

        <div className={styles.connectionGrid}>
          <div className={styles.field}>
            <span>GitHub account</span>
            {linkedUsername ? (
              <div className={styles.linkedAccount}>
                <FiGithub aria-hidden="true" />
                <strong>@{normalizedLinkedUsername}</strong>
                <em>Linked</em>
              </div>
            ) : githubLinked ? (
              <div className={styles.linkedAccount}>
                <FiGithub aria-hidden="true" />
                <strong>{resolvingLogin ? "Resolving username…" : "GitHub linked"}</strong>
                <em>Linked</em>
              </div>
            ) : (
              <div className={styles.linkAccountPrompt}>
                <p>Link your GitHub account to show coding activity. Your username is taken from that connection.</p>
                <button
                  disabled={linkingGitHub || !authUser}
                  onClick={() => void handleLinkGitHub()}
                  type="button"
                >
                  <FiLink aria-hidden="true" />
                  {linkingGitHub ? "Linking…" : "Link GitHub"}
                </button>
                {linkError ? <small data-tone="error">{linkError}</small> : null}
              </div>
            )}
            <small id="github-username-hint">
              {linkedUsername
                ? "Activity always uses the GitHub account linked to your Socialize sign-in."
                : githubLinked
                  ? resolvingLogin
                    ? "Looking up your GitHub username from the linked account…"
                    : "Could not resolve your GitHub username. Unlink and link GitHub again under Settings."
                  : "You can also link GitHub later under Settings → Sign-in methods."}
            </small>
          </div>
          <div className={styles.field}>
            <span>Profile placement</span>
            <CustomSelect
              aria-label="Profile placement"
              disabled={!githubLinked}
              options={[
                { value: "before-links", label: "Before links" },
                { value: "after-links", label: "After links" },
              ]}
              value={value.placement}
              onChange={(next) =>
                patch({
                  placement: next === "after-links" ? "after-links" : "before-links",
                })
              }
            />
            <small>Choose where the complete activity section appears.</small>
          </div>
        </div>

        <div className={styles.repositoryControls}>
          <div className={styles.field}>
            <span>Repository selection</span>
            <CustomSelect
              aria-label="Repository selection"
              disabled={!githubLinked}
              options={[
                { value: "recent", label: "Automatic · recent repositories" },
                { value: "include", label: "Only selected repositories" },
                { value: "exclude", label: "All recent except selected" },
              ]}
              value={value.repositories.mode}
              onChange={(next) => patchRepositories(next as RepositoryMode)}
            />
            <small>Automatic mode samples up to three recently pushed public repositories.</small>
          </div>
          {value.repositories.mode !== "recent" ? (
            <label className={styles.field}>
              <span>{value.repositories.mode === "include" ? "Repositories to show" : "Repositories to hide"}</span>
              <textarea
                aria-invalid={!repositoriesAreValid || !repositorySelectionIsValid}
                disabled={!githubLinked}
                maxLength={600}
                onBlur={() => {
                  setRepositoryInput(normalizedRepositories.join("\n"));
                  patchRepositories(value.repositories.mode, normalizedRepositories);
                }}
                onChange={(event) => {
                  setRepositoryInput(event.target.value);
                  resetConnection();
                }}
                placeholder={"owner/project\norganization/tooling"}
                rows={3}
                spellCheck={false}
                value={repositoryInput}
              />
              <small>
                Add up to five public <code>owner/repository</code> names, separated by a new line or comma.
                {!repositoriesAreValid ? " Check the format and keep the list to five entries." : ""}
              </small>
            </label>
          ) : null}
        </div>

        <div className={styles.connectionActions}>
          <button
            disabled={
              !linkedUsername ||
              !usernameIsValid ||
              !hasVisibleModule ||
              !repositorySelectionIsValid ||
              !repositoriesAreValid ||
              connection.tone === "loading"
            }
            onClick={() => void testConnection()}
            type="button"
          >
            {connection.tone === "loading" ? "Checking GitHub…" : "Test connection"}
          </button>
          <p aria-live="polite" data-tone={connection.tone}>
            {connection.tone === "success" ? <FiCheckCircle aria-hidden="true" /> : null}
            {connection.message}
          </p>
        </div>
      </section>

      <section className={styles.featureSection} aria-labelledby="commit-history-title">
        <div className={styles.featureHeading}>
          <FiGitCommit aria-hidden="true" />
          <div>
            <h2 id="commit-history-title">Commit history</h2>
            <p>Show author-matched commits from recently active public repositories.</p>
          </div>
          <label className={styles.inlineToggle}>
            <input
              checked={value.commits.enabled}
              disabled={!githubLinked}
              onChange={(event) => patchCommits({ enabled: event.target.checked })}
              type="checkbox"
            />
            Display
          </label>
        </div>
        <div className={styles.featureControls} data-disabled={!value.commits.enabled}>
          <label className={styles.field}>
            <span>Section title</span>
            <input
              disabled={!value.commits.enabled}
              maxLength={60}
              onChange={(event) => patchCommits({ title: event.target.value })}
              value={value.commits.title}
            />
          </label>
          <div className={styles.field}>
            <span>Commits displayed</span>
            <CustomSelect
              aria-label="Commits displayed"
              disabled={!value.commits.enabled}
              options={Array.from({ length: 10 }, (_, index) => {
                const limit = index + 1;
                return { value: String(limit), label: String(limit) };
              })}
              value={String(value.commits.limit)}
              onChange={(next) => patchCommits({ limit: Number(next) })}
            />
          </div>
          <ToggleField
            checked={value.commits.showRepository}
            disabled={!value.commits.enabled}
            label="Show repository names"
            onChange={(checked) => patchCommits({ showRepository: checked })}
          />
          <ToggleField
            checked={value.commits.showDate}
            disabled={!value.commits.enabled}
            label="Show commit dates"
            onChange={(checked) => patchCommits({ showDate: checked })}
          />
        </div>
      </section>

      <section className={styles.featureSection} aria-labelledby="coding-activity-title">
        <div className={styles.featureHeading}>
          <FiActivity aria-hidden="true" />
          <div>
            <h2 id="coding-activity-title">Coding activity</h2>
            <p>Choose exactly which parts of the yearly contribution view appear on the profile.</p>
          </div>
          <label className={styles.inlineToggle}>
            <input
              checked={value.coding.enabled}
              disabled={!githubLinked}
              onChange={(event) => patchCoding({ enabled: event.target.checked })}
              type="checkbox"
            />
            Display
          </label>
        </div>
        <div className={styles.featureControls} data-disabled={!value.coding.enabled}>
          <label className={styles.field}>
            <span>Section title</span>
            <input
              disabled={!value.coding.enabled}
              maxLength={60}
              onChange={(event) => patchCoding({ title: event.target.value })}
              value={value.coding.title}
            />
          </label>
          <ToggleField
            checked={value.coding.showContributionCount}
            disabled={!value.coding.enabled}
            label="Show contribution total"
            onChange={(checked) => patchCoding({ showContributionCount: checked })}
          />
          <ToggleField
            checked={value.coding.showHeatmap}
            disabled={!value.coding.enabled}
            label="Show contribution calendar"
            onChange={(checked) => patchCoding({ showHeatmap: checked })}
          />
          <ToggleField
            checked={value.coding.showMonthLabels}
            disabled={!value.coding.enabled || !value.coding.showHeatmap}
            label="Show month labels"
            onChange={(checked) => patchCoding({ showMonthLabels: checked })}
          />
          <ToggleField
            checked={value.coding.showWeekdayLabels}
            disabled={!value.coding.enabled || !value.coding.showHeatmap}
            label="Show weekday labels"
            onChange={(checked) => patchCoding({ showWeekdayLabels: checked })}
          />
          <ToggleField
            checked={value.coding.showLegend}
            disabled={!value.coding.enabled || !value.coding.showHeatmap}
            label="Show intensity legend"
            onChange={(checked) => patchCoding({ showLegend: checked })}
          />
          <ToggleField
            checked={value.coding.showYearSelector}
            disabled={!value.coding.enabled}
            label="Show year selector"
            onChange={(checked) => patchCoding({ showYearSelector: checked })}
          />
          <ToggleField
            checked={value.coding.showLanguages}
            disabled={!value.coding.enabled}
            label="Show language mix"
            onChange={(checked) => patchCoding({ showLanguages: checked })}
          />
        </div>
        <p className={styles.featureNote}>
          The contribution calendar matches GitHub&apos;s profile graph for the
          whole account, including anonymized private contributions when that
          option is enabled on GitHub. Visitors never get private repo names or
          contents. Repository filters apply only to commits and languages.
        </p>
      </section>
    </div>
  );
}

function ToggleField({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.toggleField}>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
