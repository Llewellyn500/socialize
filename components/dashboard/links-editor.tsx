"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiFolder,
  FiImage,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import {
  coerceProfileMediaUrl,
  isAutoLinkDescription,
  isSafeProfileMediaUrl,
  type LinkSectionGroup,
  type ProfileConfig,
  type ProfileLink,
  type ProfileMediaType,
  type ProfileSection,
} from "@/lib/profile";
import { CustomSelect } from "@/components/ui/custom-select";
import styles from "./dashboard-app.module.css";

type MediaPatch = {
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
};

type LinksEditorProps = {
  profile: ProfileConfig;
  linkGroups: LinkSectionGroup[];
  canUploadMedia: boolean;
  onAddSection: () => void;
  onAddLink: (sectionId?: string) => void;
  onUpdateSection: (sectionId: string, patch: Partial<ProfileSection>) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateLink: (linkId: string, patch: Partial<ProfileLink>) => void;
  onLinkUrlChange: (linkId: string, url: string) => void | Promise<void>;
  onMoveLink: (linkId: string, direction: -1 | 1) => void;
  onReorderLink: (
    linkId: string,
    targetLinkId: string | null,
    targetSectionId?: string,
  ) => void;
  onRemoveLink: (linkId: string) => void;
  onUploadLinkMedia: (linkId: string, file: File) => Promise<void>;
  onUploadSectionMedia: (sectionId: string, file: File) => Promise<void>;
};

function linkHostLabel(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "";
  }
}

export function LinksEditor({
  profile,
  linkGroups,
  canUploadMedia,
  onAddSection,
  onAddLink,
  onUpdateSection,
  onMoveSection,
  onRemoveSection,
  onUpdateLink,
  onLinkUrlChange,
  onMoveLink,
  onReorderLink,
  onRemoveLink,
  onUploadLinkMedia,
  onUploadSectionMedia,
}: LinksEditorProps) {
  const hasSections = (profile.sections?.length ?? 0) > 0;
  const showEmptyState = profile.links.length === 0 && !hasSections;
  const listRef = useRef<HTMLDivElement>(null);
  const draggedLinkIdRef = useRef<string | null>(null);
  const dropTargetKeyRef = useRef<string | null>(null);

  function clearDropTargetHighlight() {
    const root = listRef.current;
    if (!root) return;
    root.querySelectorAll("[data-drop-key]").forEach((node) => {
      node.setAttribute("data-active", "false");
    });
    dropTargetKeyRef.current = null;
  }

  function setDropTargetHighlight(targetKey: string | null) {
    if (dropTargetKeyRef.current === targetKey) return;
    const root = listRef.current;
    if (!root) return;
    dropTargetKeyRef.current = targetKey;
    root.querySelectorAll("[data-drop-key]").forEach((node) => {
      const key = node.getAttribute("data-drop-key");
      node.setAttribute("data-active", key === targetKey ? "true" : "false");
    });
  }

  function setDraggingUi(linkId: string | null) {
    const root = listRef.current;
    if (!root) return;
    if (linkId) {
      root.setAttribute("data-dragging", "true");
      root.querySelectorAll("[data-link-id]").forEach((node) => {
        node.setAttribute(
          "data-dragging",
          node.getAttribute("data-link-id") === linkId ? "true" : "false",
        );
      });
    } else {
      root.removeAttribute("data-dragging");
      root.querySelectorAll("[data-link-id]").forEach((node) => {
        node.setAttribute("data-dragging", "false");
      });
      clearDropTargetHighlight();
    }
  }

  function startLinkDrag(event: DragEvent<HTMLElement>, linkId: string) {
    draggedLinkIdRef.current = linkId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", linkId);
    // Keep the drag gesture alive: no React state updates here (they shift
    // layout under later sections and cancel HTML5 drag).
    setDraggingUi(linkId);
  }

  function finishLinkDrag() {
    draggedLinkIdRef.current = null;
    setDraggingUi(null);
  }

  function dropLink(
    event: DragEvent<HTMLElement>,
    targetLinkId: string | null,
    targetSectionId?: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const linkId =
      draggedLinkIdRef.current || event.dataTransfer.getData("text/plain");
    finishLinkDrag();
    if (linkId) onReorderLink(linkId, targetLinkId, targetSectionId);
  }

  function allowLinkDragOver(
    event: DragEvent<HTMLElement>,
    options: { targetKey: string; ignoreLinkId?: string },
  ) {
    const draggingId = draggedLinkIdRef.current;
    if (!draggingId) return;
    if (options.ignoreLinkId && draggingId === options.ignoreLinkId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetHighlight(options.targetKey);
  }

  return (
    <>
      <p className={styles.linksIntro} id="link-order-help">
        Drag the handle to reorder. Use the menu for keyboard-friendly move controls.
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
        {!showEmptyState ? (
          <span className={styles.linksCount}>
            {profile.links.length} {profile.links.length === 1 ? "link" : "links"}
          </span>
        ) : null}
      </div>

      {showEmptyState ? (
        <div className={styles.linksEmpty}>
          <strong>Start with a link visitors should open first.</strong>
          <p>Add a project, docs, or social profile. Group later with sections if you need them.</p>
          <button className={styles.linksPrimaryAction} type="button" onClick={() => onAddLink()}>
            <FiPlus aria-hidden="true" />
            Add your first link
          </button>
        </div>
      ) : (
        <div className={styles.linkList} ref={listRef}>
          {linkGroups.map((group) => (
            <LinkSectionBlock
              canUploadMedia={canUploadMedia}
              group={group}
              hasSections={hasSections}
              key={group.section?.id ?? "ungrouped"}
              profile={profile}
              onAddLink={onAddLink}
              onDropLink={dropLink}
              onDragOverLink={allowLinkDragOver}
              onLinkUrlChange={onLinkUrlChange}
              onMoveLink={onMoveLink}
              onMoveSection={onMoveSection}
              onRemoveLink={onRemoveLink}
              onRemoveSection={onRemoveSection}
              onStartLinkDrag={startLinkDrag}
              onFinishLinkDrag={finishLinkDrag}
              onUpdateLink={onUpdateLink}
              onUpdateSection={onUpdateSection}
              onUploadLinkMedia={onUploadLinkMedia}
              onUploadSectionMedia={onUploadSectionMedia}
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
  canUploadMedia: boolean;
  onAddLink: (sectionId?: string) => void;
  onUpdateSection: LinksEditorProps["onUpdateSection"];
  onMoveSection: LinksEditorProps["onMoveSection"];
  onRemoveSection: LinksEditorProps["onRemoveSection"];
  onUpdateLink: LinksEditorProps["onUpdateLink"];
  onLinkUrlChange: LinksEditorProps["onLinkUrlChange"];
  onMoveLink: LinksEditorProps["onMoveLink"];
  onRemoveLink: LinksEditorProps["onRemoveLink"];
  onUploadLinkMedia: LinksEditorProps["onUploadLinkMedia"];
  onUploadSectionMedia: LinksEditorProps["onUploadSectionMedia"];
  onStartLinkDrag: (event: DragEvent<HTMLElement>, linkId: string) => void;
  onFinishLinkDrag: () => void;
  onDragOverLink: (
    event: DragEvent<HTMLElement>,
    options: { targetKey: string; ignoreLinkId?: string },
  ) => void;
  onDropLink: (
    event: DragEvent<HTMLElement>,
    targetLinkId: string | null,
    targetSectionId?: string,
  ) => void;
};

function LinkSectionBlock({
  group,
  hasSections,
  profile,
  canUploadMedia,
  onAddLink,
  onUpdateSection,
  onMoveSection,
  onRemoveSection,
  onUpdateLink,
  onLinkUrlChange,
  onMoveLink,
  onRemoveLink,
  onUploadLinkMedia,
  onUploadSectionMedia,
  onStartLinkDrag,
  onFinishLinkDrag,
  onDragOverLink,
  onDropLink,
}: LinkSectionBlockProps) {
  const section = group.section;
  const sectionId = section?.id;
  const sectionKey = sectionId ?? "ungrouped";
  const sections = profile.sections ?? [];
  const sectionIndex = section ? sections.findIndex((item) => item.id === section.id) : -1;
  const showUngroupedHeader = !section && hasSections;

  if (!section && !hasSections && group.links.length === 0) return null;

  return (
    <section className={styles.linkSectionCard}>
      {section ? (
        <>
          <header className={styles.linkSectionHeader}>
            <div className={styles.linkSectionHeading}>
              <input
                aria-label={`Section title for ${section.title}`}
                className={styles.linkSectionTitle}
                maxLength={60}
                placeholder="Section heading"
                value={section.title}
                onChange={(event) => onUpdateSection(section.id, { title: event.target.value })}
              />
              <span className={styles.linkSectionMeta}>
                {group.links.length} {group.links.length === 1 ? "link" : "links"}
              </span>
            </div>
            <SectionIconActions
              canMoveDown={sectionIndex < sections.length - 1}
              canMoveUp={sectionIndex > 0}
              onDelete={() => onRemoveSection(section.id)}
              onMoveDown={() => onMoveSection(section.id, 1)}
              onMoveUp={() => onMoveSection(section.id, -1)}
            />
          </header>
          <div className={styles.linkSectionCustomization}>
            <MediaControls
              canUpload={canUploadMedia}
              compact
              hideTitle={section.hideTitle}
              label={`Heading image for ${section.title || "section"}`}
              mediaType={section.mediaType}
              mediaUrl={section.mediaUrl}
              onPatch={(patch) => onUpdateSection(section.id, patch)}
              onUpload={(file) => onUploadSectionMedia(section.id, file)}
              supportsMediaOnly
            />
          </div>
        </>
      ) : showUngroupedHeader ? (
        <header className={styles.linkSectionHeader}>
          <div className={styles.linkSectionHeading}>
            <span className={styles.linkSectionTitleStatic}>Other links</span>
            <span className={styles.linkSectionMeta}>
              {group.links.length} {group.links.length === 1 ? "link" : "links"}
            </span>
          </div>
        </header>
      ) : null}

      <div
        className={styles.linkSectionBody}
        data-drop-key={`end:${sectionKey}`}
        data-active="false"
        onDragOver={(event) =>
          onDragOverLink(event, { targetKey: `end:${sectionKey}` })
        }
        onDrop={(event) => onDropLink(event, null, sectionId)}
      >
        {group.links.length === 0 ? (
          <p className={styles.linkSectionEmpty}>No links in this section yet.</p>
        ) : (
          group.links.map((link, index) => (
            <LinkCard
              canMoveDown={index < group.links.length - 1}
              canMoveUp={index > 0}
              canUploadMedia={canUploadMedia}
              hasSections={hasSections}
              key={link.id}
              link={link}
              sections={sections}
              onDrop={(event) => onDropLink(event, link.id, sectionId)}
              onDragOver={(event) => {
                onDragOverLink(event, {
                  targetKey: `link:${link.id}`,
                  ignoreLinkId: link.id,
                });
                event.stopPropagation();
              }}
              onLinkUrlChange={onLinkUrlChange}
              onMoveDown={() => onMoveLink(link.id, 1)}
              onMoveUp={() => onMoveLink(link.id, -1)}
              onRemove={() => onRemoveLink(link.id)}
              onStartDrag={(event) => onStartLinkDrag(event, link.id)}
              onFinishDrag={onFinishLinkDrag}
              onToggleEnabled={() => onUpdateLink(link.id, { enabled: !link.enabled })}
              onUpdate={(patch) => onUpdateLink(link.id, patch)}
              onUploadMedia={(file) => onUploadLinkMedia(link.id, file)}
            />
          ))
        )}

        <button
          className={styles.linkSectionAdd}
          type="button"
          onClick={() => onAddLink(sectionId)}
        >
          <FiPlus aria-hidden="true" />
          {section ? "Add link to section" : "Add link"}
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
  link: ProfileLink;
  sections: ProfileSection[];
  hasSections: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canUploadMedia: boolean;
  onUpdate: (patch: Partial<ProfileLink>) => void;
  onLinkUrlChange: (linkId: string, url: string) => void | Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  onUploadMedia: (file: File) => Promise<void>;
  onStartDrag: (event: DragEvent<HTMLElement>) => void;
  onFinishDrag: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
};

function LinkCard({
  link,
  sections,
  hasSections,
  canMoveUp,
  canMoveDown,
  canUploadMedia,
  onUpdate,
  onLinkUrlChange,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onRemove,
  onUploadMedia,
  onStartDrag,
  onFinishDrag,
  onDragOver,
  onDrop,
}: LinkCardProps) {
  const hasDescription =
    Boolean(link.description?.trim()) && !isAutoLinkDescription(link.description);
  const [showDescription, setShowDescription] = useState(hasDescription);
  const host = linkHostLabel(link.url);

  useEffect(() => {
    if (hasDescription) setShowDescription(true);
  }, [hasDescription]);

  const label = link.title.trim() || "link";

  return (
    <article
      className={`${styles.linkCard}${link.enabled ? "" : ` ${styles.linkCardHidden}`}`}
      data-drop-key={`link:${link.id}`}
      data-link-id={link.id}
      data-dragging="false"
      data-active="false"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.linkCardTop}>
        <div
          aria-describedby="link-order-help"
          aria-label={`Drag ${label} to reorder`}
          className={styles.linkDragHandle}
          draggable
          role="button"
          tabIndex={0}
          title="Drag to reorder"
          onDragEnd={onFinishDrag}
          onDragStart={onStartDrag}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
            }
          }}
        >
          <span aria-hidden="true" className={styles.linkDragGrip} />
        </div>

        <div className={styles.linkCardMain}>
          <div className={styles.linkCardTitleRow}>
            <input
              aria-label={`Title for ${label}`}
              className={styles.linkTitleInput}
              maxLength={100}
              placeholder="Link title"
              value={link.title}
              onChange={(event) => onUpdate({ title: event.target.value })}
            />
            <span
              className={styles.linkCardStatus}
              data-state={link.enabled ? "visible" : "hidden"}
            >
              {link.enabled ? "Shown" : "Hidden"}
            </span>
          </div>

          <label className={styles.linkUrlField}>
            <span className="sr-only">URL</span>
            <input
              placeholder="https:// or email@example.com"
              value={link.url}
              onChange={(event) => void onLinkUrlChange(link.id, event.target.value)}
            />
            {host ? <small>{host}</small> : null}
          </label>

          {showDescription ? (
            <label className={styles.linkDescriptionField}>
              <span className="sr-only">Description</span>
              <input
                maxLength={160}
                placeholder="Short description (optional)"
                value={link.description || ""}
                onChange={(event) => onUpdate({ description: event.target.value })}
              />
            </label>
          ) : (
            <button
              className={styles.linkAddDescription}
              type="button"
              onClick={() => setShowDescription(true)}
            >
              Add description
            </button>
          )}

          <MediaControls
            canUpload={canUploadMedia}
            compact
            label={`Image for ${label}`}
            mediaType={link.mediaType}
            mediaUrl={link.mediaUrl}
            onPatch={onUpdate}
            onUpload={onUploadMedia}
          />
        </div>

        <div className={styles.linkCardActions}>
          <button
            aria-label={link.enabled ? `Hide ${label}` : `Show ${label}`}
            title={link.enabled ? "Hide on profile" : "Show on profile"}
            type="button"
            onClick={onToggleEnabled}
          >
            {link.enabled ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
          </button>
          <LinkOverflowMenu
            canMoveDown={canMoveDown}
            canMoveUp={canMoveUp}
            currentSectionId={link.sectionId}
            hasSections={hasSections}
            label={label}
            sections={sections}
            onMoveDown={onMoveDown}
            onMoveSection={(sectionId) => onUpdate({ sectionId: sectionId || undefined })}
            onMoveUp={onMoveUp}
            onRemove={onRemove}
          />
        </div>
      </div>
    </article>
  );
}

function MediaControls({
  label,
  mediaUrl,
  mediaType,
  hideTitle,
  supportsMediaOnly = false,
  compact = false,
  canUpload,
  onPatch,
  onUpload,
}: {
  label: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
  supportsMediaOnly?: boolean;
  compact?: boolean;
  canUpload: boolean;
  onPatch: (patch: MediaPatch) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const hasMedia = Boolean(mediaUrl?.trim());

  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      await onUpload(file);
      setMessage("Image uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <details className={styles.linkMediaEditor} data-compact={compact ? "true" : undefined}>
      <summary>
        <span><FiImage aria-hidden="true" /> {hasMedia ? "Custom image" : "Add image"}</span>
        <small>{hasMedia ? "On" : "Optional"}</small>
      </summary>
      <div className={styles.linkMediaEditorBody}>
        <div className={styles.linkMediaPreview} data-type={mediaType ?? "icon"}>
          {hasMedia && isSafeProfileMediaUrl(mediaUrl) ? (
            // User-provided media URLs are rendered as decorative link imagery.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coerceProfileMediaUrl(mediaUrl!)} alt="" />
          ) : (
            <FiImage aria-hidden="true" />
          )}
        </div>
        <div className={styles.linkMediaFields}>
          <label className={styles.linkField} htmlFor={`${inputId}-url`}>
            <span>Image URL</span>
            <input
              id={`${inputId}-url`}
              inputMode="url"
              placeholder="https://…/image.svg or /image.png"
              value={mediaUrl || ""}
              onChange={(event) => {
                const value = event.target.value;
                onPatch(value ? { mediaUrl: value } : { mediaUrl: undefined, hideTitle: false });
                setMessage("");
              }}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (!value) return;
                const coerced = value.startsWith("/")
                  ? value
                  : value.match(/^https?:\/\//i)
                    ? value.replace(/^http:\/\//i, "https://")
                    : /^[a-z][a-z0-9+.-]*:/i.test(value)
                      ? value
                      : `https://${value}`;
                if (coerced !== mediaUrl) {
                  onPatch({ mediaUrl: coerced });
                }
              }}
            />
          </label>
          <div className={styles.linkField}>
            <span id={`${inputId}-type-label`}>Display</span>
            <CustomSelect
              aria-label="Display"
              id={`${inputId}-type`}
              options={[
                { value: "icon", label: "Compact icon" },
                { value: "thumbnail", label: "Wide thumbnail" },
              ]}
              value={mediaType ?? "icon"}
              onChange={(next) =>
                onPatch({
                  mediaType: next === "thumbnail" ? "thumbnail" : "icon",
                })
              }
            />
          </div>
        </div>
        <div className={styles.linkMediaActions}>
          <label className={styles.linkMediaUpload}>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.svg"
              disabled={!canUpload || uploading}
              id={inputId}
              type="file"
              onChange={(event) => {
                void handleUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <FiUpload aria-hidden="true" />
            {uploading ? "Uploading" : "Upload image"}
          </label>
          {hasMedia ? (
            <button
              className={styles.linkMediaClear}
              type="button"
              onClick={() => {
                onPatch({ mediaUrl: undefined, hideTitle: false });
                setMessage("");
              }}
            >
              <FiX aria-hidden="true" /> Clear
            </button>
          ) : null}
        </div>
        {!canUpload ? (
          <p className={styles.linkMediaHint}>Sign in to upload, or paste an image URL.</p>
        ) : null}
        {supportsMediaOnly ? (
          <label className={styles.linkMediaToggle}>
            <input
              checked={Boolean(hideTitle && hasMedia)}
              disabled={!hasMedia}
              type="checkbox"
              onChange={(event) => onPatch({ hideTitle: event.target.checked })}
            />
            Use the image as the visible heading
          </label>
        ) : null}
        {message ? <p className={styles.linkMediaMessage} role="status">{message}</p> : null}
        <span className="sr-only">{label}</span>
      </div>
    </details>
  );
}

function LinkOverflowMenu({
  label,
  canMoveUp,
  canMoveDown,
  hasSections,
  sections,
  currentSectionId,
  onMoveUp,
  onMoveDown,
  onMoveSection,
  onRemove,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  hasSections: boolean;
  sections: ProfileSection[];
  currentSectionId?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveSection: (sectionId: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const sectionOptions = [{ id: "", title: "Other links" }, ...sections];
  const currentId = currentSectionId ?? "";

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
        aria-label={`More actions for ${label}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <FiMoreHorizontal aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.linkMoveMenuList} id={menuId} role="menu">
          <div className={styles.linkMenuGroup} role="group" aria-label="Reorder">
            <button
              disabled={!canMoveUp}
              role="menuitem"
              type="button"
              onClick={() => {
                onMoveUp();
                setOpen(false);
              }}
            >
              <FiArrowUp aria-hidden="true" />
              <span>Move up</span>
            </button>
            <button
              disabled={!canMoveDown}
              role="menuitem"
              type="button"
              onClick={() => {
                onMoveDown();
                setOpen(false);
              }}
            >
              <FiArrowDown aria-hidden="true" />
              <span>Move down</span>
            </button>
          </div>

          {hasSections ? (
            <div className={styles.linkMenuGroup} role="group" aria-label="Move to section">
              <p className={styles.linkMenuLabel}>Move to section</p>
              {sectionOptions.map((option) => {
                const isCurrent = currentId === option.id;
                return (
                  <button
                    aria-current={isCurrent ? "true" : undefined}
                    disabled={isCurrent}
                    key={option.id || "ungrouped"}
                    role="menuitem"
                    title={option.title}
                    type="button"
                    onClick={() => {
                      onMoveSection(option.id);
                      setOpen(false);
                    }}
                  >
                    <FiFolder aria-hidden="true" />
                    <span>{option.title}</span>
                    {isCurrent ? <FiCheck aria-hidden="true" className={styles.linkMenuCheck} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className={styles.linkMenuGroup} role="group" aria-label="Danger zone">
            <button
              className={styles.linkMenuDanger}
              role="menuitem"
              type="button"
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
            >
              <FiTrash2 aria-hidden="true" />
              <span>Delete link</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
