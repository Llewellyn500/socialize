"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiEye,
  FiEyeOff,
  FiFolder,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import type { LinkSectionGroup, ProfileConfig, ProfileSection } from "@/lib/profile";
import { isAutoLinkDescription } from "@/lib/profile";
import styles from "./dashboard-app.module.css";

type LinksEditorProps = {
  profile: ProfileConfig;
  linkGroups: LinkSectionGroup[];
  onAddSection: () => void;
  onAddLink: (sectionId?: string) => void;
  onUpdateSectionTitle: (sectionId: string, title: string) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateLink: (
    linkId: string,
    key: "title" | "description" | "url" | "enabled" | "sectionId",
    value: string | boolean,
  ) => void;
  onLinkUrlChange: (linkId: string, url: string) => void | Promise<void>;
  onMoveLink: (linkId: string, direction: -1 | 1) => void;
  onRemoveLink: (linkId: string) => void;
};

export function LinksEditor({
  profile,
  linkGroups,
  onAddSection,
  onAddLink,
  onUpdateSectionTitle,
  onMoveSection,
  onRemoveSection,
  onUpdateLink,
  onLinkUrlChange,
  onMoveLink,
  onRemoveLink,
}: LinksEditorProps) {
  const hasSections = (profile.sections?.length ?? 0) > 0;
  const showEmptyState = profile.links.length === 0 && !hasSections;

  return (
    <>
      <p className={styles.linksIntro}>
        Paste a URL to autofill. Group links into sections if you want headings on your profile.
      </p>

      <div className={styles.linksToolbar}>
        <button className={styles.linksPrimaryAction} type="button" onClick={() => onAddLink()}>
          <FiPlus aria-hidden="true" />
          Add link
        </button>
        <button className={styles.linksSecondaryAction} type="button" onClick={onAddSection}>
          <FiFolder aria-hidden="true" />
          New section
        </button>
      </div>

      {showEmptyState ? (
        <div className={styles.linksEmpty}>
          <p>No links yet.</p>
          <button className={styles.linksPrimaryAction} type="button" onClick={() => onAddLink()}>
            <FiPlus aria-hidden="true" />
            Add your first link
          </button>
        </div>
      ) : (
        <div className={styles.linkList}>
          {linkGroups.map((group) => (
            <LinkSectionBlock
              group={group}
              hasSections={hasSections}
              key={group.section?.id ?? "ungrouped"}
              profile={profile}
              onAddLink={onAddLink}
              onLinkUrlChange={onLinkUrlChange}
              onMoveLink={onMoveLink}
              onMoveSection={onMoveSection}
              onRemoveLink={onRemoveLink}
              onRemoveSection={onRemoveSection}
              onUpdateLink={onUpdateLink}
              onUpdateSectionTitle={onUpdateSectionTitle}
            />
          ))}
        </div>
      )}
    </>
  );
}

type LinkSectionBlockProps = {
  group: LinkSectionGroup;
  hasSections: boolean;
  profile: ProfileConfig;
  onAddLink: (sectionId?: string) => void;
  onUpdateSectionTitle: (sectionId: string, title: string) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateLink: LinksEditorProps["onUpdateLink"];
  onLinkUrlChange: LinksEditorProps["onLinkUrlChange"];
  onMoveLink: LinksEditorProps["onMoveLink"];
  onRemoveLink: LinksEditorProps["onRemoveLink"];
};

function LinkSectionBlock({
  group,
  hasSections,
  profile,
  onAddLink,
  onUpdateSectionTitle,
  onMoveSection,
  onRemoveSection,
  onUpdateLink,
  onLinkUrlChange,
  onMoveLink,
  onRemoveLink,
}: LinkSectionBlockProps) {
  const section = group.section;
  const sectionId = section?.id;
  const sections = profile.sections ?? [];
  const sectionIndex = section ? sections.findIndex((item) => item.id === section.id) : -1;
  const showUngroupedHeader = !section && hasSections;

  if (!section && !hasSections && group.links.length === 0) return null;

  return (
    <section className={styles.linkSectionCard}>
      {section ? (
        <header className={styles.linkSectionHeader}>
          <input
            aria-label={`Section title for ${section.title}`}
            className={styles.linkSectionTitle}
            placeholder="Section name"
            value={section.title}
            onChange={(event) => onUpdateSectionTitle(section.id, event.target.value)}
          />
          <SectionIconActions
            canMoveDown={sectionIndex < sections.length - 1}
            canMoveUp={sectionIndex > 0}
            onDelete={() => onRemoveSection(section.id)}
            onMoveDown={() => onMoveSection(section.id, 1)}
            onMoveUp={() => onMoveSection(section.id, -1)}
          />
        </header>
      ) : showUngroupedHeader ? (
        <header className={styles.linkSectionHeader}>
          <span className={styles.linkSectionTitleStatic}>Other links</span>
        </header>
      ) : null}

      <div className={styles.linkSectionBody}>
        {group.links.length === 0 ? (
          <p className={styles.linkSectionEmpty}>No links in this section yet.</p>
        ) : (
          group.links.map((link, index) => (
            <LinkCard
              canMoveDown={index < group.links.length - 1}
              canMoveUp={index > 0}
              hasSections={hasSections}
              key={link.id}
              link={link}
              sections={sections}
              onLinkUrlChange={onLinkUrlChange}
              onMoveDown={() => onMoveLink(link.id, 1)}
              onMoveUp={() => onMoveLink(link.id, -1)}
              onRemove={() => onRemoveLink(link.id)}
              onToggleEnabled={() => onUpdateLink(link.id, "enabled", !link.enabled)}
              onUpdate={(key, value) => onUpdateLink(link.id, key, value)}
            />
          ))
        )}

        <button
          className={styles.linkSectionAdd}
          type="button"
          onClick={() => onAddLink(sectionId)}
        >
          <FiPlus aria-hidden="true" />
          {section ? `Add link to ${section.title || "section"}` : "Add link"}
        </button>
      </div>
    </section>
  );
}

function SectionIconActions({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.linkIconActions}>
      <button aria-label="Move section up" disabled={!canMoveUp} type="button" onClick={onMoveUp}>
        <FiArrowUp aria-hidden="true" />
      </button>
      <button
        aria-label="Move section down"
        disabled={!canMoveDown}
        type="button"
        onClick={onMoveDown}
      >
        <FiArrowDown aria-hidden="true" />
      </button>
      <button aria-label="Delete section" type="button" onClick={onDelete}>
        <FiTrash2 aria-hidden="true" />
      </button>
    </div>
  );
}

type LinkCardProps = {
  link: ProfileConfig["links"][number];
  sections: ProfileSection[];
  hasSections: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (
    key: "title" | "description" | "url" | "enabled" | "sectionId",
    value: string | boolean,
  ) => void;
  onLinkUrlChange: (linkId: string, url: string) => void | Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
};

function LinkCard({
  link,
  sections,
  hasSections,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onLinkUrlChange,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onRemove,
}: LinkCardProps) {
  const hasDescription =
    Boolean(link.description?.trim()) && !isAutoLinkDescription(link.description);
  const [showDescription, setShowDescription] = useState(hasDescription);

  useEffect(() => {
    if (hasDescription) setShowDescription(true);
  }, [hasDescription]);

  const label = link.title.trim() || "link";

  return (
    <article
      className={`${styles.linkCard}${link.enabled ? "" : ` ${styles.linkCardHidden}`}`}
    >
      <div className={styles.linkCardTop}>
        <span className={styles.linkCardStatus}>{link.enabled ? "Visible" : "Hidden"}</span>
        <div className={styles.linkIconActions}>
          <button aria-label={`Move ${label} up`} disabled={!canMoveUp} type="button" onClick={onMoveUp}>
            <FiArrowUp aria-hidden="true" />
          </button>
          <button
            aria-label={`Move ${label} down`}
            disabled={!canMoveDown}
            type="button"
            onClick={onMoveDown}
          >
            <FiArrowDown aria-hidden="true" />
          </button>
          {hasSections ? (
            <LinkMoveMenu
              currentSectionId={link.sectionId}
              label={label}
              sections={sections}
              onMove={(sectionId) => onUpdate("sectionId", sectionId)}
            />
          ) : null}
          <button
            aria-label={link.enabled ? `Hide ${label}` : `Show ${label}`}
            type="button"
            onClick={onToggleEnabled}
          >
            {link.enabled ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
          </button>
          <button aria-label={`Delete ${label}`} type="button" onClick={onRemove}>
            <FiTrash2 aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.linkCardFields}>
        <label className={styles.linkField}>
          <span>URL</span>
          <input
            placeholder="https:// or email@example.com"
            value={link.url}
            onChange={(event) => void onLinkUrlChange(link.id, event.target.value)}
          />
        </label>
        <label className={styles.linkField}>
          <span>Title</span>
          <input
            placeholder="What visitors see"
            value={link.title}
            onChange={(event) => onUpdate("title", event.target.value)}
          />
        </label>
        {showDescription ? (
          <label className={styles.linkField}>
            <span>Description</span>
            <input
              placeholder="Optional — one short line"
              value={link.description || ""}
              onChange={(event) => onUpdate("description", event.target.value)}
            />
          </label>
        ) : (
          <button
            className={styles.linkAddDescription}
            type="button"
            onClick={() => setShowDescription(true)}
          >
            + Add description
          </button>
        )}
      </div>
    </article>
  );
}

function LinkMoveMenu({
  sections,
  currentSectionId,
  label,
  onMove,
}: {
  sections: ProfileSection[];
  currentSectionId?: string;
  label: string;
  onMove: (sectionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const options = [{ id: "", title: "Other links" }, ...sections];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <div className={styles.linkMoveMenu} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Move ${label} to section`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <FiMoreHorizontal aria-hidden="true" />
      </button>
      {open ? (
        <ul className={styles.linkMoveMenuList} id={menuId} role="menu">
          {options.map((option) => (
            <li key={option.id || "ungrouped"} role="none">
              <button
                aria-current={(currentSectionId ?? "") === option.id ? "true" : undefined}
                role="menuitem"
                type="button"
                onClick={() => {
                  onMove(option.id);
                  setOpen(false);
                }}
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
