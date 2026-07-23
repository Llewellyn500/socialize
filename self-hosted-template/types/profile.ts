export type ProfileMediaType = "icon" | "thumbnail";

export type ProfileSection = {
  id: string;
  title: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
};

export type ProfileLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  enabled: boolean;
  sectionId?: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
};

export type SocialLink = {
  id: string;
  label: string;
  url: string;
};

export type DeveloperActivity = {
  enabled: boolean;
  githubUsername: string;
  placement: "before-links" | "after-links";
  repositories: {
    mode: "recent" | "include" | "exclude";
    names: string[];
  };
  commits: {
    enabled: boolean;
    title: string;
    limit: number;
    showRepository: boolean;
    showDate: boolean;
  };
  coding: {
    enabled: boolean;
    title: string;
    windowDays: 7 | 14 | 30;
    showContributionCount: boolean;
    showHeatmap: boolean;
    showMonthLabels: boolean;
    showWeekdayLabels: boolean;
    showLegend: boolean;
    showYearSelector: boolean;
    showLanguages: boolean;
  };
};

export type Profile = {
  name: string;
  handle: string;
  role: string;
  bio: string;
  location: string;
  availability: string;
  avatarUrl: string;
  accent: string;
  sections: ProfileSection[];
  links: ProfileLink[];
  socials: SocialLink[];
  developerActivity?: DeveloperActivity;
};

export type SelfHostedConfig = {
  firestoreDocumentPath: string;
  profile: Profile;
};
