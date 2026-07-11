export type ProfileLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  enabled: boolean;
};

export type SocialLink = {
  id: string;
  label: string;
  url: string;
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
  links: ProfileLink[];
  socials: SocialLink[];
};

export type SelfHostedConfig = {
  ownerEmail: string;
  firestoreDocumentPath: string;
  profile: Profile;
};
