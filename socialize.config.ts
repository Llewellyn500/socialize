import { demoProfile, type ProfileConfig } from "./lib/profile";

/**
 * The portable Socialize profile format.
 *
 * Hosted accounts store this shape in the cloud. The self-hosted edition uses
 * this file as its seed and supports importing/exporting the same JSON shape.
 */
const profile = {
  ...demoProfile,
  handle: "your-handle",
  displayName: "Your name",
  role: "Developer · builder · human",
  bio: "Tell people what you build and why it matters.",
  developerActivity: {
    enabled: false,
    githubUsername: "",
    placement: "before-links",
    repositories: {
      mode: "recent",
      names: [],
    },
    commits: {
      enabled: true,
      title: "Recent commits",
      limit: 5,
      showRepository: true,
      showDate: true,
    },
    coding: {
      enabled: true,
      title: "Contributions",
      windowDays: 30,
      showContributionCount: true,
      showHeatmap: true,
      showMonthLabels: true,
      showWeekdayLabels: true,
      showLegend: true,
      showYearSelector: true,
      showLanguages: true,
    },
  },
} satisfies ProfileConfig;

export default profile;
