"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FiAlertCircle, FiArrowUpRight, FiGithub } from "react-icons/fi";
import type {
  GitHubActivityResponse,
  GitHubContributionCalendar,
} from "@/lib/github-activity";
import {
  isValidGitHubUsername,
  normalizeGitHubUsername,
  type DeveloperActivityConfig,
} from "@/lib/profile";

type ActivityState =
  | { status: "idle" | "loading"; data: null; message: string }
  | { status: "ready"; data: GitHubActivityResponse; message: string }
  | { status: "error"; data: null; message: string };

export function DeveloperActivity({
  config,
  interactive,
}: {
  config: DeveloperActivityConfig;
  interactive: boolean;
}) {
  const username = normalizeGitHubUsername(config.githubUsername);
  const contributionPartsVisible =
    config.coding.showContributionCount ||
    config.coding.showHeatmap ||
    config.coding.showYearSelector;
  const codingHasVisiblePart =
    config.coding.enabled &&
    (contributionPartsVisible || config.coding.showLanguages);
  const hasVisibleModule = config.commits.enabled || codingHasVisiblePart;
  const repositorySelectionIsValid =
    config.repositories.mode !== "include" || config.repositories.names.length > 0;
  const repositoryKey = config.repositories.names.join(",");
  const [selectedYear, setSelectedYear] = useState(new Date().getUTCFullYear());
  const [state, setState] = useState<ActivityState>({
    status: "idle",
    data: null,
    message: "",
  });

  useEffect(() => {
    setSelectedYear(new Date().getUTCFullYear());
  }, [username]);

  useEffect(() => {
    if (
      !config.enabled ||
      !hasVisibleModule ||
      !repositorySelectionIsValid ||
      !isValidGitHubUsername(username)
    ) {
      setState({ status: "idle", data: null, message: "" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading", data: null, message: "Loading GitHub activity…" });
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        username,
        commits: String(config.commits.enabled),
        coding: String(codingHasVisiblePart),
        calendar: String(codingHasVisiblePart && contributionPartsVisible),
        languages: String(codingHasVisiblePart && config.coding.showLanguages),
        limit: String(config.commits.limit),
        repoMode: config.repositories.mode,
        year: String(selectedYear),
      });
      config.repositories.names.forEach((repository) =>
        params.append("repo", repository),
      );
      void fetch(`/api/github-activity?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = (await response.json()) as
            | GitHubActivityResponse
            | { error?: string };
          if (!response.ok || !("commits" in result)) {
            throw new Error(
              "error" in result
                ? result.error
                : "GitHub activity is unavailable.",
            );
          }
          setState({ status: "ready", data: result, message: "" });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: "error",
            data: null,
            message:
              error instanceof Error
                ? error.message
                : "GitHub activity is unavailable.",
          });
        });
    }, 320);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    codingHasVisiblePart,
    config.coding.showLanguages,
    config.commits.enabled,
    config.commits.limit,
    config.enabled,
    config.repositories.mode,
    contributionPartsVisible,
    hasVisibleModule,
    repositoryKey,
    repositorySelectionIsValid,
    selectedYear,
    username,
  ]);

  if (!config.enabled || !hasVisibleModule) return null;

  if (!isValidGitHubUsername(username)) {
    return (
      <section className="profile-activity" aria-label="Developer activity">
        <ActivityNotice message="Add a valid GitHub username to preview developer activity." />
      </section>
    );
  }

  if (!repositorySelectionIsValid) {
    return (
      <section className="profile-activity" aria-label="Developer activity">
        <ActivityNotice message="Add at least one repository to preview include-only activity." />
      </section>
    );
  }

  return (
    <section className="profile-activity" aria-label={`GitHub activity for ${username}`}>
      <header className="profile-activity__header">
        <div>
          <FiGithub aria-hidden="true" />
          <strong>@{username}</strong>
        </div>
        <a
          href={`https://github.com/${encodeURIComponent(username)}`}
          rel="noreferrer"
          tabIndex={interactive ? undefined : -1}
          target="_blank"
        >
          View GitHub <FiArrowUpRight aria-hidden="true" />
        </a>
      </header>

      {state.status === "idle" || state.status === "loading" ? (
        <div
          className="profile-activity__loading"
          aria-live="polite"
          aria-label={state.message || "Loading GitHub activity"}
        >
          <i /><i /><i /><i />
        </div>
      ) : null}

      {state.status === "error" ? <ActivityNotice message={state.message} /> : null}

      {state.status === "ready" && codingHasVisiblePart ? (
        <ContributionActivity
          data={state.data}
          interactive={interactive}
          onYearChange={setSelectedYear}
          selectedYear={selectedYear}
          settings={config.coding}
        />
      ) : null}

      {state.status === "ready" && config.commits.enabled ? (
        <CommitHistory
          commits={state.data.commits.slice(0, config.commits.limit)}
          interactive={interactive}
          showDate={config.commits.showDate}
          showRepository={config.commits.showRepository}
          title={config.commits.title}
        />
      ) : null}

    </section>
  );
}

function ContributionActivity({
  data,
  interactive,
  onYearChange,
  selectedYear,
  settings,
}: {
  data: GitHubActivityResponse;
  interactive: boolean;
  onYearChange: (year: number) => void;
  selectedYear: number;
  settings: DeveloperActivityConfig["coding"];
}) {
  const calendar = data.contributions;
  const contributionPartsVisible =
    settings.showContributionCount ||
    settings.showHeatmap ||
    settings.showYearSelector;

  return (
    <div className="profile-contributions">
      <div className="profile-activity__section-title">
        <h2>{settings.title}</h2>
        {calendar ? <span>{calendar.year}</span> : null}
      </div>

      {calendar && contributionPartsVisible ? (
        <ContributionCalendar
          calendar={calendar}
          interactive={interactive}
          onYearChange={onYearChange}
          selectedYear={selectedYear}
          settings={settings}
        />
      ) : contributionPartsVisible ? (
        <p className="profile-activity__empty">
          A contribution calendar is unavailable for this account.
        </p>
      ) : null}

      {settings.showLanguages && data.languages.length > 0 ? (
        <LanguageMix languages={data.languages} year={selectedYear} />
      ) : null}
    </div>
  );
}

function ContributionCalendar({
  calendar,
  interactive,
  onYearChange,
  selectedYear,
  settings,
}: {
  calendar: GitHubContributionCalendar;
  interactive: boolean;
  onYearChange: (year: number) => void;
  selectedYear: number;
  settings: DeveloperActivityConfig["coding"];
}) {
  const yearPrefix = String(calendar.year);
  const weeks = calendar.weeks
    .map((week) => ({
      ...week,
      days: week.days.filter((day) => day.date.startsWith(yearPrefix)),
    }))
    .filter((week) => week.days.length > 0);
  const months = calendar.months.filter((month) =>
    month.firstDay.startsWith(yearPrefix),
  );
  const positionedMonths = months
    .map((month) => ({
      ...month,
      weekIndex: findMonthWeek({ ...calendar, weeks }, month.firstDay),
    }))
    .filter((month) => month.weekIndex >= 0);
  const monthLabels = positionedMonths.map((month, index) => ({
    ...month,
    span: Math.max(
      1,
      (positionedMonths[index + 1]?.weekIndex ?? weeks.length) - month.weekIndex,
    ),
  }));
  const years = calendar.availableYears.slice(0, 7);
  const showYears = settings.showYearSelector && years.length > 1;

  return (
    <div className="profile-contribution-layout" data-years={showYears}>
      <div className="profile-contribution-main">
        {settings.showContributionCount ? (
          <p className="profile-contribution-total">
            <strong>{calendar.totalContributions.toLocaleString()}</strong>{" "}
            {calendar.source === "github"
              ? `contributions in ${calendar.year}`
              : "recent public pushes"}
          </p>
        ) : null}

        {settings.showHeatmap ? (
          <div className="profile-contribution-frame">
            <div className="profile-contribution-scroll">
              <div
                className="profile-contribution-chart"
                data-weekdays={settings.showWeekdayLabels}
                role="img"
                aria-label={`${calendar.totalContributions.toLocaleString()} ${calendar.source === "github" ? "GitHub contributions" : "sampled public pushes"}`}
                style={{
                  "--contribution-weeks": weeks.length,
                } as CSSProperties}
              >
                {settings.showMonthLabels ? (
                  <div className="profile-contribution-months" aria-hidden="true">
                    {monthLabels.map((month) => (
                      <span
                        key={`${month.firstDay}-${month.name}`}
                        style={{
                          gridColumn: `${month.weekIndex + 1} / span ${month.span}`,
                          gridRow: 1,
                        }}
                      >
                        {month.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="profile-contribution-body">
                  {settings.showWeekdayLabels ? (
                    <div className="profile-contribution-weekdays" aria-hidden="true">
                      <span style={{ gridRow: 2 }}>Mon</span>
                      <span style={{ gridRow: 4 }}>Wed</span>
                      <span style={{ gridRow: 6 }}>Fri</span>
                    </div>
                  ) : null}
                  <div className="profile-contribution-weeks" aria-hidden="true">
                    {weeks.map((week) => (
                      <div className="profile-contribution-week" key={week.firstDay}>
                        {week.days.map((day) => (
                          <i
                            data-level={day.level}
                            key={day.date}
                            style={{ gridRow: day.weekday + 1 }}
                            title={`${day.count} ${day.count === 1 ? "contribution" : "contributions"} on ${formatContributionDate(day.date)}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {settings.showLegend ? (
              <div className="profile-contribution-legend" aria-label="Contribution intensity legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <i data-level={level} key={level} />
                ))}
                <span>More</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showYears ? (
        <div className="profile-contribution-years" aria-label="Contribution year" role="group">
          {years.map((year) => (
            <button
              aria-pressed={year === selectedYear}
              disabled={!interactive}
              key={year}
              onClick={() => onYearChange(year)}
              type="button"
            >
              {year}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LanguageMix({
  languages,
  year,
}: {
  languages: GitHubActivityResponse["languages"];
  year: number;
}) {
  return (
    <div className="profile-coding-activity__languages">
      <div className="profile-coding-activity__language-bar" aria-hidden="true">
        {languages.map((language) => (
          <i key={language.name} style={{ width: `${language.percentage}%` }} />
        ))}
      </div>
      <ul aria-label={`Languages used in ${year}`}>
        {languages.map((language) => (
          <li key={language.name}>
            <i aria-hidden="true" />
            {language.name} <span>{language.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommitHistory({
  commits,
  interactive,
  showDate,
  showRepository,
  title,
}: {
  commits: GitHubActivityResponse["commits"];
  interactive: boolean;
  showDate: boolean;
  showRepository: boolean;
  title: string;
}) {
  return (
    <div className="profile-commit-history">
      <div className="profile-activity__section-title">
        <h2>{title}</h2>
        <span>{commits.length} shown</span>
      </div>
      {commits.length > 0 ? (
        <ol>
          {commits.map((commit) => (
            <li key={`${commit.repository}-${commit.sha}`}>
              <a
                href={commit.url}
                rel="noreferrer"
                tabIndex={interactive ? undefined : -1}
                target="_blank"
              >
                <span className="profile-commit-history__sha">
                  {commit.sha.slice(0, 7)}
                </span>
                <span className="profile-commit-history__copy">
                  <strong>{commit.message}</strong>
                  {showRepository || showDate ? (
                    <small>
                      {showRepository ? commit.repository : null}
                      {showRepository && showDate ? " · " : null}
                      {showDate ? formatCommitDate(commit.createdAt) : null}
                    </small>
                  ) : null}
                </span>
                <FiArrowUpRight aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="profile-activity__empty">
          No recent public commits were found in the selected repositories.
        </p>
      )}
    </div>
  );
}

function ActivityNotice({ message }: { message: string }) {
  return (
    <div className="profile-activity__notice" role="status">
      <FiAlertCircle aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function findMonthWeek(calendar: GitHubContributionCalendar, firstDay: string) {
  const timestamp = Date.parse(`${firstDay}T00:00:00.000Z`);
  return calendar.weeks.findIndex((week) => {
    const start = Date.parse(`${week.firstDay}T00:00:00.000Z`);
    return timestamp >= start && timestamp < start + 7 * 86_400_000;
  });
}

function formatContributionDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCommitDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}
