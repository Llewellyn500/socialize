"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { ProfileSection } from "@/lib/profile";
import styles from "./dashboard-app.module.css";

type LinkSectionSelectProps = {
  sections: ProfileSection[];
  value?: string;
  label: string;
  onChange: (sectionId: string) => void;
};

export function LinkSectionSelect({
  sections,
  value = "",
  label,
  onChange,
}: LinkSectionSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedTitle =
    sections.find((section) => section.id === value)?.title ?? "Ungrouped";

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function pick(sectionId: string) {
    onChange(sectionId);
    setOpen(false);
  }

  const options = [{ id: "", title: "Ungrouped" }, ...sections];

  return (
    <div className={styles.linkSectionSelect} ref={rootRef}>
      <span className={styles.linkSectionLabel}>{label}</span>
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${selectedTitle}`}
        className={styles.linkSectionTrigger}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedTitle}</span>
        <FiChevronDown aria-hidden="true" className={open ? styles.linkSectionChevronOpen : ""} />
      </button>
      {open ? (
        <ul className={styles.linkSectionMenu} id={listboxId} role="listbox">
          {options.map((option) => (
            <li key={option.id || "ungrouped"} role="presentation">
              <button
                aria-selected={value === option.id}
                className={styles.linkSectionOption}
                role="option"
                type="button"
                onClick={() => pick(option.id)}
              >
                {option.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
