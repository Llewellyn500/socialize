const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;

  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return EMAIL_PATTERN.test(trimmed.slice(7).trim());
  }

  return EMAIL_PATTERN.test(trimmed);
}

/** Live-edit helper: emails become mailto:, other values stay as typed. */
export function normalizeLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (isEmailAddress(trimmed) && !trimmed.toLowerCase().startsWith("mailto:")) {
    return `mailto:${trimmed}`;
  }
  return trimmed;
}

/**
 * Save-time helper: emails → mailto:, bare domains/paths → https://,
 * http:// → https://. Leaves other schemes unchanged.
 */
export function coerceExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (isEmailAddress(trimmed)) {
    return trimmed.toLowerCase().startsWith("mailto:")
      ? trimmed
      : `mailto:${trimmed}`;
  }

  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

export function emailFromLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith("mailto:")) {
    return trimmed.slice(7).trim();
  }
  return isEmailAddress(trimmed) ? trimmed : "";
}
