"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import styles from "./theme-toggle.module.css";

type AppTheme = "dark" | "light";

const STORAGE_KEY = "socialize-app-theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<AppTheme>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.appTheme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const nextTheme: AppTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.appTheme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const nextLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      aria-label={nextLabel}
      aria-pressed={theme === "light"}
      className={`${styles.toggle} ${compact ? styles.compact : ""}`}
      onClick={toggleTheme}
      title={nextLabel}
      type="button"
    >
      {theme === "dark" ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
      <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}
