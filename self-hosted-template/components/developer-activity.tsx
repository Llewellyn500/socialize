"use client";

import {
  ArrowUpRight,
  ChartBar,
  GitCommit,
  GithubLogo,
  WarningCircle
} from "@phosphor-icons/react";
import { useEffect, useState, type CSSProperties } from "react";
import type { DeveloperActivity as DeveloperActivitySettings } from "@/types/profile";
import type {
  GitHubActivityData,
  GitHubActivityErrorBody,
  GitHubContributionCalendar
} from "@/types/github-activity";

type LoadState = "loading" | "ready" | "error";

type DeveloperActivityProps = {
  activity: DeveloperActivitySettings;
};

const commitDate = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric"
});

function formatDate(value: string): string {
  return commitDate.format(new Date(value));
}

function ActivityHeader({ username }: { username: string }) {
  return (
    <header className="developer-activity-header">
      <span className="developer-activity-mark" aria-hidden="true">
        <GithubLogo size={22} weight="fill" />
      </span>
      <div>
        <strong>GitHub activity</strong>
        <a href={`https://github.com/${encodeURIComponent(username)}`} rel="noreferrer" target="_blank">
          @{username}
          <ArrowUpRight aria-hidden="true" size={14} weight="bold" />
        </a>
      </div>
    </header>
  );
}

function ActivityLoading({ username }: { username: string }) {
  return (
    <section
      className="developer-activity"
      aria-busy="true"
      aria-labelledby="developer-activity-loading-title"
    >
      <ActivityHeader username={username} />
      <h2 className="sr-only" id="developer-activity-loading-title">Loading GitHub activity</h2>
      <div className="activity-loading" aria-hidden="true">
        <span className="activity-skeleton activity-skeleton-title" />
        <span className="activity-skeleton activity-skeleton-chart" />
        <span className="activity-skeleton" />
        <span className="activity-skeleton activity-skeleton-short" />
      </div>
      <p className="sr-only" role="status">Loading public GitHub activity.</p>
    </section>
  );
}

function ActivityError({ error, username }: { error: string; username: string }) {
  return (
    <section className="developer-activity" aria-labelledby="developer-activity-error-title">
      <ActivityHeader username={username} />
      <div className="activity-state activity-state-error">
        <WarningCircle aria-hidden="true" size={24} weight="duotone" />
        <div>
          <h2 id="developer-activity-error-title">Activity is unavailable</h2>
          <p>{error}</p>
        </div>
      </div>
    </section>
  );
}

function ContributionActivity({
  data,
  onYearChange,
  settings
}: {
  data: GitHubActivityData;
  onYearChange: (year: number) => void;
  settings: DeveloperActivitySettings["coding"];
}) {
  const calendar = data.contributions;
  const contributionPartsVisible = settings.showContributionCount ||
    settings.showHeatmap || settings.showYearSelector;

  return (
    <section className="activity-module contribution-module" aria-labelledby="coding-activity-title">
      <div className="activity-module-heading">
        <ChartBar aria-hidden="true" size={19} weight="duotone" />
        <h2 id="coding-activity-title">{settings.title}</h2>
        {calendar ? <span>{calendar.year}</span> : null}
      </div>

      {calendar && contributionPartsVisible ? (
        <ContributionCalendar
          calendar={calendar}
          onYearChange={onYearChange}
          settings={settings}
        />
      ) : contributionPartsVisible ? (
        <p className="activity-module-empty">A contribution calendar is unavailable for this account.</p>
      ) : null}

      {settings.showLanguages ? (
        data.languages.length ? (
          <div className="activity-languages">
            <h3>Languages in recently pushed repositories</h3>
            <ul>
              {data.languages.map((language) => (
                <li key={language.name}>
                  <span>{language.name}</span>
                  <span>{language.repositoryCount} {language.repositoryCount === 1 ? "repo" : "repos"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="activity-module-empty">No language data was found for recently pushed public repositories.</p>
        )
      ) : null}
    </section>
  );
}

function ContributionCalendar({
  calendar,
  onYearChange,
  settings
}: {
  calendar: GitHubContributionCalendar;
  onYearChange: (year: number) => void;
  settings: DeveloperActivitySettings["coding"];
}) {
  const currentYear = new Date().getUTCFullYear();
  const positionedMonths = calendar.months
    .map((month) => ({ ...month, weekIndex: findMonthWeek(calendar, month.firstDay) }))
    .filter((month) => month.weekIndex >= 0);
  const monthLabels = positionedMonths.map((month, index) => ({
    ...month,
    span: Math.max(
      1,
      (positionedMonths[index + 1]?.weekIndex ?? calendar.weeks.length) - month.weekIndex
    )
  }));
  const years = calendar.availableYears.slice(0, 7);
  const showYears = settings.showYearSelector && years.length > 1;

  return (
    <div className="contribution-layout" data-years={showYears}>
      <div className="contribution-main">
        {settings.showContributionCount ? (
          <p className="contribution-total">
            <strong>{calendar.totalContributions.toLocaleString()}</strong>{" "}
            {calendar.source === "github"
              ? `contributions ${calendar.year === currentYear ? "in the last year" : `in ${calendar.year}`}`
              : "recent public commits"}
          </p>
        ) : null}

        {settings.showHeatmap ? (
          <div className="contribution-frame">
            <div className="contribution-scroll">
              <div
                className="contribution-chart"
                data-weekdays={settings.showWeekdayLabels}
                role="img"
                aria-label={`${calendar.totalContributions.toLocaleString()} ${calendar.source === "github" ? "GitHub contributions" : "sampled public commits"}`}
                style={{ "--contribution-weeks": calendar.weeks.length } as CSSProperties}
              >
                {settings.showMonthLabels ? (
                  <div className="contribution-months" aria-hidden="true">
                    {monthLabels.map((month) => (
                      <span
                        key={`${month.firstDay}-${month.name}`}
                        style={{
                          gridColumn: `${month.weekIndex + 1} / span ${month.span}`,
                          gridRow: 1
                        }}
                      >
                        {month.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="contribution-body">
                  {settings.showWeekdayLabels ? (
                    <div className="contribution-weekdays" aria-hidden="true">
                      <span style={{ gridRow: 2 }}>Mon</span>
                      <span style={{ gridRow: 4 }}>Wed</span>
                      <span style={{ gridRow: 6 }}>Fri</span>
                    </div>
                  ) : null}
                  <div className="contribution-weeks" aria-hidden="true">
                    {calendar.weeks.map((week) => (
                      <div className="contribution-week" key={week.firstDay}>
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
              <div className="contribution-legend" aria-label="Contribution intensity legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => <i data-level={level} key={level} />)}
                <span>More</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showYears ? (
        <div className="contribution-years" aria-label="Contribution year" role="group">
          {years.map((year) => (
            <button
              aria-pressed={year === calendar.year}
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

function RecentCommits({
  data,
  settings
}: {
  data: GitHubActivityData;
  settings: DeveloperActivitySettings["commits"];
}) {
  return (
    <section className="activity-module" aria-labelledby="recent-commits-title">
      <div className="activity-module-heading">
        <GitCommit aria-hidden="true" size={19} weight="duotone" />
        <h2 id="recent-commits-title">{settings.title}</h2>
      </div>

      {data.commits.length ? (
        <ul className="commit-list">
          {data.commits.map((commit) => (
            <li key={`${commit.repository}:${commit.sha}`}>
              <a href={commit.url} rel="noreferrer" target="_blank">
                <span className="commit-message">{commit.message}</span>
                <span className="commit-details">
                  <code>{commit.sha.slice(0, 7)}</code>
                  {settings.showRepository ? <span>{commit.repository}</span> : null}
                  {settings.showDate ? <time dateTime={commit.date}>{formatDate(commit.date)}</time> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="activity-module-empty">No recent public commits were found in the selected repositories.</p>
      )}
    </section>
  );
}

export function DeveloperActivity({ activity }: DeveloperActivityProps) {
  const contributionPartsVisible = activity.coding.showContributionCount ||
    activity.coding.showHeatmap || activity.coding.showYearSelector;
  const codingHasVisiblePart = activity.coding.enabled &&
    (contributionPartsVisible || activity.coding.showLanguages);
  const hasVisibleModule = activity.commits.enabled || codingHasVisiblePart;
  const [selectedYear, setSelectedYear] = useState(new Date().getUTCFullYear());
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<GitHubActivityData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setSelectedYear(new Date().getUTCFullYear()), [activity.githubUsername]);

  useEffect(() => {
    if (!hasVisibleModule) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      username: activity.githubUsername,
      days: String(activity.coding.windowDays),
      limit: String(activity.commits.limit),
      commits: String(activity.commits.enabled),
      coding: String(codingHasVisiblePart),
      calendar: String(codingHasVisiblePart && contributionPartsVisible),
      languages: String(codingHasVisiblePart && activity.coding.showLanguages),
      repoMode: activity.repositories.mode,
      year: String(selectedYear)
    });
    activity.repositories.names.forEach((repository) => params.append("repo", repository));

    setState("loading");
    setData(null);
    setError("");

    fetch(`/api/github-activity?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as GitHubActivityData | GitHubActivityErrorBody;
        if (!response.ok) {
          throw new Error("error" in body ? body.error : "GitHub activity is unavailable.");
        }
        return body as GitHubActivityData;
      })
      .then((activityData) => {
        setData(activityData);
        setState("ready");
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "GitHub activity is unavailable.");
        setState("error");
      });

    return () => controller.abort();
  }, [
    activity.coding.showLanguages,
    activity.commits.enabled,
    activity.commits.limit,
    activity.githubUsername,
    activity.repositories.mode,
    activity.repositories.names.join(","),
    codingHasVisiblePart,
    contributionPartsVisible,
    hasVisibleModule,
    selectedYear
  ]);

  if (!hasVisibleModule) return null;
  if (state === "loading") return <ActivityLoading username={activity.githubUsername} />;
  if (state === "error" || !data) return <ActivityError error={error} username={activity.githubUsername} />;

  return (
    <section className="developer-activity" aria-labelledby="developer-activity-title">
      <ActivityHeader username={data.username} />
      <h2 className="sr-only" id="developer-activity-title">Public GitHub activity</h2>

      <div className="activity-modules">
        {codingHasVisiblePart ? (
          <ContributionActivity data={data} onYearChange={setSelectedYear} settings={activity.coding} />
        ) : null}
        {activity.commits.enabled ? <RecentCommits data={data} settings={activity.commits} /> : null}
      </div>

      <p className="activity-source">
        {data.contributions?.partial
          ? "Recent public sample"
          : data.contributions
            ? "GitHub public contributions"
            : "Public GitHub data"}
        {data.repositories.length
          ? ` \u00b7 ${data.repositories.length} ${data.repositories.length === 1 ? "repository" : "repositories"}`
          : ""}
        {data.truncated ? " \u00b7 commit list sampled" : " \u00b7 refreshed about every 15 minutes"}
      </p>
    </section>
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
    timeZone: "UTC"
  }).format(date);
}
