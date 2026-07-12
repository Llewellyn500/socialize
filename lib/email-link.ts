const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;

  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return EMAIL_PATTERN.test(trimmed.slice(7).trim());
  }

  return EMAIL_PATTERN.test(trimmed);
}

export function normalizeLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (isEmailAddress(trimmed) && !trimmed.toLowerCase().startsWith("mailto:")) {
    return `mailto:${trimmed}`;
  }
  return trimmed;
}

export function emailFromLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return trimmed.slice(7).trim();
  }
  return isEmailAddress(trimmed) ? trimmed : "";
}
