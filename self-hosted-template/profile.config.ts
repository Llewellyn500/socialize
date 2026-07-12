import type { SelfHostedConfig } from "@/types/profile";

/**
 * The one file a new owner needs to edit.
 *
 * `profile` is rendered immediately and is also the fallback when the cloud backend is
 * unavailable. Once you save from /manage, the saved profile record takes over.
 */
export const selfHostedConfig: SelfHostedConfig = {
  ownerEmail: "you@example.com",
  firestoreDocumentPath: "profiles/main",
  profile: {
    name: "Avery Mensah",
    handle: "@averycodes",
    role: "Frontend engineer and open-source maintainer",
    bio: "I build fast web interfaces, maintain useful packages, and write about the details that make software feel good.",
    location: "Accra, Ghana",
    availability: "Available for thoughtful frontend work",
    avatarUrl: "",
    accent: "#8a2be2",
    links: [
      {
        id: "github",
        title: "Open-source work",
        description: "Projects, experiments, and packages I maintain.",
        url: "https://github.com/your-handle",
        enabled: true
      },
      {
        id: "writing",
        title: "Latest writing",
        description: "Notes on frontend engineering and product craft.",
        url: "https://dev.to/your-handle",
        enabled: true
      },
      {
        id: "contact",
        title: "Work with me",
        description: "Tell me about the product you are building.",
        url: "mailto:you@example.com",
        enabled: true
      }
    ],
    socials: [
      {
        id: "github-social",
        label: "GitHub",
        url: "https://github.com/your-handle"
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/your-handle"
      }
    ]
  }
};
