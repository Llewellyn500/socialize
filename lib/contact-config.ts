const configuredContacts = {
  support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim(),
  security: process.env.NEXT_PUBLIC_SECURITY_EMAIL?.trim(),
  privacy: process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim(),
  safety: process.env.NEXT_PUBLIC_SAFETY_EMAIL?.trim(),
  legal: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim(),
  sponsors: process.env.NEXT_PUBLIC_SPONSORS_EMAIL?.trim(),
};

export const contactConfig = {
  support: configuredContacts.support || "support@socialize.you",
  security: configuredContacts.security || "security@socialize.you",
  privacy: configuredContacts.privacy || "privacy@socialize.you",
  safety: configuredContacts.safety || "safety@socialize.you",
  legal: configuredContacts.legal || "legal@socialize.you",
  sponsors: configuredContacts.sponsors || "sponsors@socialize.you",
  isConfigured: Object.values(configuredContacts).every(Boolean),
};

export function mailto(email: string, subject?: string) {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
