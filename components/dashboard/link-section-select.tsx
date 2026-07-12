"use client";

import type { ProfileSection } from "@/lib/profile";
import { CustomSelect } from "@/components/ui/custom-select";
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
  const options = [
    { value: "", label: "Ungrouped" },
    ...sections.map((section) => ({
      value: section.id,
      label: section.title || "Untitled section",
    })),
  ];

  return (
    <div className={styles.linkSectionSelect}>
      <span className={styles.linkSectionLabel}>{label}</span>
      <CustomSelect
        aria-label={label}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
