"use client";

import { useEffect, useState } from "react";
import { FiZap } from "react-icons/fi";
import {
  isMotionReduced,
  setMotionPreference,
  systemPrefersReducedMotion,
} from "@/lib/motion";
import styles from "./motion-notice.module.css";

/**
 * Shown when the OS asks for reduced motion so users (e.g. Windows Animation
 * effects off on Snapdragon devices) can re-enable site animations.
 */
export function MotionNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!systemPrefersReducedMotion()) return;
    if (!isMotionReduced()) return;
    try {
      if (window.sessionStorage.getItem("socialize-motion-notice") === "dismissed") {
        return;
      }
    } catch {
      // Ignore sessionStorage failures.
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  function enableAnimations() {
    setMotionPreference("full");
    setVisible(false);
    window.dispatchEvent(new Event("socialize:motion-change"));
    // Reload so hero CSS entrance animations can run with motion enabled.
    window.setTimeout(() => window.location.reload(), 50);
  }

  function dismiss() {
    try {
      window.sessionStorage.setItem("socialize-motion-notice", "dismissed");
    } catch {
      // Ignore sessionStorage failures.
    }
    setVisible(false);
  }

  return (
    <div className={styles.notice} role="status">
      <p>
        Animations are off because your device has reduced-motion enabled
        (Windows: Accessibility → Visual effects → Animation effects).
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} type="button" onClick={enableAnimations}>
          <FiZap aria-hidden="true" /> Play animations on this site
        </button>
        <button className={styles.ghost} type="button" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
