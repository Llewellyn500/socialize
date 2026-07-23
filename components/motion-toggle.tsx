"use client";

import { useEffect, useState } from "react";
import { FiZap, FiZapOff } from "react-icons/fi";
import {
  isMotionReduced,
  readMotionPreference,
  setMotionPreference,
  systemPrefersReducedMotion,
  type MotionPreference,
} from "@/lib/motion";
import styles from "./theme-toggle.module.css";

export function MotionToggle({ compact = false }: { compact?: boolean }) {
  const [preference, setPreference] = useState<MotionPreference>("system");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setPreference(readMotionPreference());
    setReduced(isMotionReduced());

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(isMotionReduced());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggleMotion() {
    const next: MotionPreference = reduced
      ? "full"
      : systemPrefersReducedMotion()
        ? "system"
        : "reduce";
    const nextReduced = setMotionPreference(next);
    setPreference(next);
    setReduced(nextReduced);
    window.dispatchEvent(new Event("socialize:motion-change"));
    if (preference !== next) {
      window.setTimeout(() => window.location.reload(), 50);
    }
  }

  const label = reduced ? "Enable animations" : "Reduce animations";

  return (
    <button
      aria-label={label}
      aria-pressed={!reduced}
      className={`${styles.toggle} ${compact ? styles.compact : ""}`}
      onClick={toggleMotion}
      title={
        preference === "system"
          ? `${label} (following your device setting)`
          : label
      }
      type="button"
    >
      {reduced ? <FiZap aria-hidden="true" /> : <FiZapOff aria-hidden="true" />}
      <span>{reduced ? "Animations off" : "Animations on"}</span>
    </button>
  );
}
