export const MOTION_STORAGE_KEY = "socialize-motion";

export type MotionPreference = "system" | "full" | "reduce";

export function readMotionPreference(): MotionPreference {
  try {
    const value = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (value === "full" || value === "reduce" || value === "system") return value;
  } catch {
    // Ignore storage failures and fall back to system preference.
  }
  return "system";
}

export function systemPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Apply html[data-motion] and html[data-reduce-motion] from preference + OS. */
export function syncMotionPreference(preference: MotionPreference = readMotionPreference()) {
  const root = document.documentElement;
  root.dataset.motion = preference;
  const reduce =
    preference === "reduce" ||
    (preference === "system" && systemPrefersReducedMotion());

  if (reduce) root.setAttribute("data-reduce-motion", "");
  else root.removeAttribute("data-reduce-motion");

  return reduce;
}

export function setMotionPreference(preference: MotionPreference) {
  window.localStorage.setItem(MOTION_STORAGE_KEY, preference);
  return syncMotionPreference(preference);
}

export function isMotionReduced() {
  return document.documentElement.hasAttribute("data-reduce-motion");
}
