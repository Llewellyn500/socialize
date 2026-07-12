export type GitHubActivityCommit = {
  sha: string;
  message: string;
  url: string;
  repository: string;
  repositoryUrl: string;
  date: string;
};

export type GitHubActivityDay = {
  date: string;
  count: number;
};

export type GitHubActivityLanguage = {
  name: string;
  repositoryCount: number;
};

export type GitHubContributionLevel = 0 | 1 | 2 | 3 | 4;

export type GitHubContributionDay = {
  date: string;
  weekday: number;
  count: number;
  level: GitHubContributionLevel;
};

export type GitHubContributionWeek = {
  firstDay: string;
  days: GitHubContributionDay[];
};

export type GitHubContributionMonth = {
  firstDay: string;
  name: string;
  totalWeeks: number;
};

export type GitHubContributionCalendar = {
  year: number;
  totalContributions: number;
  availableYears: number[];
  months: GitHubContributionMonth[];
  weeks: GitHubContributionWeek[];
  source: "github" | "events";
  partial: boolean;
};

export type GitHubActivityData = {
  username: string;
  profileUrl: string;
  repositories: string[];
  windowDays: 7 | 14 | 30;
  commits: GitHubActivityCommit[];
  daily: GitHubActivityDay[];
  languages: GitHubActivityLanguage[];
  contributions: GitHubContributionCalendar | null;
  totalCommits: number;
  sampledCommitCount: number;
  activeDays: number;
  truncated: boolean;
  generatedAt: string;
};

export type GitHubActivityErrorBody = {
  error: string;
};
