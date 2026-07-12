"use client";

import { useEffect, useRef, useState } from "react";
import { FiActivity, FiCheckCircle, FiGitCommit, FiGithub } from "react-icons/fi";
import {
  isValidGitHubUsername,
  isValidGitHubRepository,
  normalizeGitHubRepositories,
  normalizeGitHubUsername,
  type DeveloperActivityConfig,
  type RepositoryMode,
} from "@/lib/profile";
import type { GitHubActivityResponse } from "@/lib/github-activity";
import styles from "./developer-activity-editor.module.css";

type ConnectionState =
  | { tone: "idle"; message: string }
  | { tone: "loading"; message: string }
  | { tone: "success"; message: string }
  | { tone: "error"; message: string };

type DeveloperActivityEditorProps = {
  value: DeveloperActivityConfig;
  suggestedUsername?: string;
  onChange: (value: DeveloperActivityConfig) => void;
};

export function DeveloperActivityEditor({
  value,
  suggestedUsername,
  onChange,
}: DeveloperActivityEditorProps) {
  const [connection, setConnection] = useState<ConnectionState>({
    tone: "idle",
    message: "Only public GitHub activity is displayed.",
  });
  const [repositoryInput, setRepositoryInput] = useState(
    value.repositories.names.join("\n"),
  );
  const connectionController = useRef<AbortController | null>(null);

  const normalizedUsername = normalizeGitHubUsername(value.githubUsername);
  const usernameIsValid = isValidGitHubUsername(value.githubUsername);
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

  useEffect(() => () => connectionController.current?.abort(), []);

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
        enabled && !value.githubUsername && suggestedUsername
          ? suggestedUsername
          : value.githubUsername,
    });
  }

  async function testConnection() {
    if (!usernameIsValid) {
      setConnection({ tone: "error", message: "Enter a valid GitHub username first." });
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
      const response = await fetch(
        `/api/github-activity?${params.toString()}`,
        { signal: controller.signal },
      );
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
              onChange={(event) => toggleEnabled(event.target.checked)}
              type="checkbox"
            />
            <span>{value.enabled ? "Shown" : "Hidden"}</span>
          </label>
        </div>

        <div className={styles.connectionGrid}>
          <label className={styles.field}>
            <span>GitHub username</span>
            <input
              aria-describedby="github-username-hint"
              aria-invalid={Boolean(value.githubUsername) && !usernameIsValid}
              autoCapitalize="none"
              autoComplete="off"
              onBlur={() => {
                if (value.githubUsername && normalizedUsername !== value.githubUsername) {
                  patch({ githubUsername: normalizedUsername });
                }
              }}
              onChange={(event) => patch({ githubUsername: event.target.value })}
              placeholder="octocat or github.com/octocat"
              spellCheck={false}
              value={value.githubUsername}
            />
            <small id="github-username-hint">
              {value.githubUsername && !usernameIsValid
                ? "Use a GitHub username such as octocat, without spaces."
                : "Only public activity is rendered. This does not verify ownership of the account."}
            </small>
          </label>
          <label className={styles.field}>
            <span>Profile placement</span>
            <select
              onChange={(event) => patch({
                placement: event.target.value === "after-links" ? "after-links" : "before-links",
              })}
              value={value.placement}
            >
              <option value="before-links">Before links</option>
              <option value="after-links">After links</option>
            </select>
            <small>Choose where the complete activity section appears.</small>
          </label>
        </div>

        <div className={styles.repositoryControls}>
          <label className={styles.field}>
            <span>Repository selection</span>
            <select
              onChange={(event) => patchRepositories(event.target.value as RepositoryMode)}
              value={value.repositories.mode}
            >
              <option value="recent">Automatic · recent repositories</option>
              <option value="include">Only selected repositories</option>
              <option value="exclude">All recent except selected</option>
            </select>
            <small>Automatic mode samples up to three recently pushed public repositories.</small>
          </label>
          {value.repositories.mode !== "recent" ? (
            <label className={styles.field}>
              <span>{value.repositories.mode === "include" ? "Repositories to show" : "Repositories to hide"}</span>
              <textarea
                aria-invalid={!repositoriesAreValid || !repositorySelectionIsValid}
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
          <label className={styles.field}>
            <span>Commits displayed</span>
            <select
              disabled={!value.commits.enabled}
              onChange={(event) => patchCommits({ limit: Number(event.target.value) })}
              value={value.commits.limit}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((limit) => (
                <option key={limit} value={limit}>{limit}</option>
              ))}
            </select>
          </label>
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
