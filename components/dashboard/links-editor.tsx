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
  FiEye,
  FiEyeOff,
  FiFolder,
  FiImage,
  FiMove,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import {
  isAutoLinkDescription,
  type LinkSectionGroup,
  type ProfileConfig,
  type ProfileLink,
  type ProfileMediaType,
  type ProfileSection,
} from "@/lib/profile";
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
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function startLinkDrag(event: DragEvent<HTMLElement>, linkId: string) {
    setDraggedLinkId(linkId);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", linkId);
  }

  function finishLinkDrag() {
    setDraggedLinkId(null);
    setDropTarget(null);
  }

  function dropLink(
    event: DragEvent<HTMLElement>,
    targetLinkId: string | null,
    targetSectionId?: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const linkId = draggedLinkId || event.dataTransfer.getData("text/plain");
    if (linkId) onReorderLink(linkId, targetLinkId, targetSectionId);
    finishLinkDrag();
  }

  return (
    <>
      <p className={styles.linksIntro} id="link-order-help">
        Drag a link by its handle to place it anywhere, including another section.
        Arrow buttons and the section menu provide the same controls from the keyboard.
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
              canUploadMedia={canUploadMedia}
              draggedLinkId={draggedLinkId}
              dropTarget={dropTarget}
              group={group}
              hasSections={hasSections}
              key={group.section?.id ?? "ungrouped"}
              profile={profile}
              onAddLink={onAddLink}
              onDropLink={dropLink}
              onDragTarget={setDropTarget}
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
  draggedLinkId: string | null;
  dropTarget: string | null;
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
  onDragTarget: (target: string | null) => void;
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
  draggedLinkId,
  dropTarget,
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
  onDragTarget,
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
            <input
              aria-label={`Section title for ${section.title}`}
              className={styles.linkSectionTitle}
              maxLength={60}
              placeholder="Section heading"
              value={section.title}
              onChange={(event) => onUpdateSection(section.id, { title: event.target.value })}
            />
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
          <span className={styles.linkSectionTitleStatic}>Other links</span>
        </header>
      ) : null}

      <div className={styles.linkSectionBody} data-dragging={Boolean(draggedLinkId)}>
        {group.links.length === 0 ? (
          <p className={styles.linkSectionEmpty}>No links in this section yet.</p>
        ) : (
          group.links.map((link, index) => (
            <LinkCard
              canMoveDown={index < group.links.length - 1}
              canMoveUp={index > 0}
              canUploadMedia={canUploadMedia}
              dropTarget={dropTarget === `link:${link.id}`}
              dragged={draggedLinkId === link.id}
              hasSections={hasSections}
              key={link.id}
              link={link}
              sections={sections}
              onDrop={(event) => onDropLink(event, link.id, sectionId)}
              onDragOver={(event) => {
                if (!draggedLinkId || draggedLinkId === link.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                onDragTarget(`link:${link.id}`);
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

        {draggedLinkId ? (
          <div
            className={styles.linkDropZone}
            data-active={dropTarget === `end:${sectionKey}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              onDragTarget(`end:${sectionKey}`);
            }}
            onDrop={(event) => onDropLink(event, null, sectionId)}
          >
            Place at end of {section?.title || "other links"}
          </div>
        ) : null}

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
  link: ProfileLink;
  sections: ProfileSection[];
  hasSections: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canUploadMedia: boolean;
  dragged: boolean;
  dropTarget: boolean;
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
  dragged,
  dropTarget,
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

  useEffect(() => {
    if (hasDescription) setShowDescription(true);
  }, [hasDescription]);

  const label = link.title.trim() || "link";

  return (
    <article
      className={`${styles.linkCard}${link.enabled ? "" : ` ${styles.linkCardHidden}`}`}
      data-dragging={dragged}
      data-drop-target={dropTarget}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.linkCardTop}>
        <div className={styles.linkCardIdentity}>
          <button
            aria-describedby="link-order-help"
            aria-label={`Drag ${label} to reorder`}
            className={styles.linkDragHandle}
            draggable
            title="Drag to reorder"
            type="button"
            onDragEnd={onFinishDrag}
            onDragStart={onStartDrag}
          >
            <FiMove aria-hidden="true" />
          </button>
          <span className={styles.linkCardStatus}>{link.enabled ? "Visible" : "Hidden"}</span>
        </div>
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
              onMove={(sectionId) => onUpdate({ sectionId: sectionId || undefined })}
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
            maxLength={100}
            placeholder="What visitors see"
            value={link.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
        </label>
        {showDescription ? (
          <label className={styles.linkField}>
            <span>Description</span>
            <input
              maxLength={160}
              placeholder="Optional, one short line"
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
            + Add description
          </button>
        )}
      </div>

      <MediaControls
        canUpload={canUploadMedia}
        label={`Image for ${label}`}
        mediaType={link.mediaType}
        mediaUrl={link.mediaUrl}
        onPatch={onUpdate}
        onUpload={onUploadMedia}
      />
    </article>
  );
}

function MediaControls({
  label,
  mediaUrl,
  mediaType,
  hideTitle,
  supportsMediaOnly = false,
  canUpload,
  onPatch,
  onUpload,
}: {
  label: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
  supportsMediaOnly?: boolean;
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
    <details className={styles.linkMediaEditor}>
      <summary>
        <span><FiImage aria-hidden="true" /> Icon or thumbnail</span>
        <small>{hasMedia ? "Added" : "Optional"}</small>
      </summary>
      <div className={styles.linkMediaEditorBody}>
        <div className={styles.linkMediaPreview} data-type={mediaType ?? "icon"}>
          {hasMedia ? (
            // User-provided media URLs are rendered as decorative link imagery.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="" />
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
              placeholder="https://... or /image.png"
              value={mediaUrl || ""}
              onChange={(event) => {
                const value = event.target.value;
                onPatch(value ? { mediaUrl: value } : { mediaUrl: undefined, hideTitle: false });
                setMessage("");
              }}
            />
          </label>
          <label className={styles.linkField} htmlFor={`${inputId}-type`}>
            <span>Display</span>
            <select
              id={`${inputId}-type`}
              value={mediaType ?? "icon"}
              onChange={(event) => onPatch({
                mediaType: event.target.value === "thumbnail" ? "thumbnail" : "icon",
              })}
            >
              <option value="icon">Compact icon</option>
              <option value="thumbnail">Wide thumbnail</option>
            </select>
          </label>
        </div>
        <div className={styles.linkMediaActions}>
          <label className={styles.linkMediaUpload}>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
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
