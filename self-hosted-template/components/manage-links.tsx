"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowsOutCardinal,
  FolderPlus,
  ImageSquare,
  Plus,
  Trash,
  UploadSimple,
  X
} from "@phosphor-icons/react";
import { useId, useState, type DragEvent } from "react";
import { uploadProfileMedia } from "@/lib/profile-media-upload";
import { groupLinksBySection } from "@/lib/profile-utils";
import type {
  Profile,
  ProfileLink,
  ProfileMediaType,
  ProfileSection
} from "@/types/profile";

type MediaPatch = {
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
};

type ManageLinksProps = {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function ManageLinks({ profile, onChange }: ManageLinksProps) {
  const groups = groupLinksBySection(profile);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  function patchSection(sectionId: string, patch: Partial<ProfileSection>) {
    onChange({
      sections: profile.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      )
    });
  }

  function removeSection(sectionId: string) {
    onChange({
      sections: profile.sections.filter((section) => section.id !== sectionId),
      links: profile.links.map((link) =>
        link.sectionId === sectionId ? { ...link, sectionId: undefined } : link
      )
    });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const sections = [...profile.sections];
    const index = sections.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    onChange({ sections });
  }

  function patchLink(linkId: string, patch: Partial<ProfileLink>) {
    onChange({
      links: profile.links.map((link) =>
        link.id === linkId ? { ...link, ...patch } : link
      )
    });
  }

  function addLink(sectionId?: string) {
    onChange({
      links: [
        ...profile.links,
        {
          id: createId("link"),
          title: "",
          description: "",
          url: "https://",
          enabled: true,
          ...(sectionId ? { sectionId } : {})
        }
      ]
    });
  }

  function moveLink(linkId: string, direction: -1 | 1) {
    const links = [...profile.links];
    const index = links.findIndex((link) => link.id === linkId);
    if (index < 0) return;
    const sectionId = links[index].sectionId ?? "";
    const indices = links
      .map((link, linkIndex) => (link.sectionId ?? "") === sectionId ? linkIndex : -1)
      .filter((linkIndex) => linkIndex >= 0);
    const position = indices.indexOf(index);
    const targetPosition = position + direction;
    if (targetPosition < 0 || targetPosition >= indices.length) return;
    const targetIndex = indices[targetPosition];
    [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
    onChange({ links });
  }

  function reorderLink(
    linkId: string,
    targetLinkId: string | null,
    targetSectionId?: string
  ) {
    if (linkId === targetLinkId) return;
    const dragged = profile.links.find((link) => link.id === linkId);
    if (!dragged) return;
    const links = profile.links.filter((link) => link.id !== linkId);
    const moved = { ...dragged, sectionId: targetSectionId || undefined };
    if (targetLinkId) {
      const targetIndex = links.findIndex((link) => link.id === targetLinkId);
      links.splice(targetIndex >= 0 ? targetIndex : links.length, 0, moved);
    } else {
      let insertAt = links.length;
      for (let index = links.length - 1; index >= 0; index -= 1) {
        if ((links[index].sectionId ?? "") === (targetSectionId ?? "")) {
          insertAt = index + 1;
          break;
        }
      }
      links.splice(insertAt, 0, moved);
    }
    onChange({ links });
  }

  function startDrag(event: DragEvent<HTMLElement>, linkId: string) {
    setDraggedLinkId(linkId);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", linkId);
  }

  function finishDrag() {
    setDraggedLinkId(null);
    setDropTarget(null);
  }

  function dropLink(
    event: DragEvent<HTMLElement>,
    targetLinkId: string | null,
    targetSectionId?: string
  ) {
    event.preventDefault();
    event.stopPropagation();
    const linkId = draggedLinkId || event.dataTransfer.getData("text/plain");
    if (linkId) reorderLink(linkId, targetLinkId, targetSectionId);
    finishDrag();
  }

  return (
    <div className="manage-links">
      <p className="manage-links-help" id="selfhost-link-order-help">
        Drag a handle to reorder links or move them between sections. Arrow buttons
        and the section selector provide keyboard alternatives.
      </p>
      <div className="manage-links-toolbar">
        <button className="secondary-button" onClick={() => addLink()} type="button">
          <Plus aria-hidden="true" size={17} weight="bold" />
          Add link
        </button>
        <button
          className="secondary-button"
          onClick={() => onChange({
            sections: [...profile.sections, { id: createId("section"), title: "New section" }]
          })}
          type="button"
        >
          <FolderPlus aria-hidden="true" size={17} weight="bold" />
          Add section
        </button>
      </div>

      <div className="managed-link-sections">
        {groups.map((group) => {
          const section = group.section;
          const sectionId = section?.id;
          const sectionKey = sectionId ?? "ungrouped";
          const sectionIndex = section
            ? profile.sections.findIndex((item) => item.id === section.id)
            : -1;
          return (
            <article className="managed-link-section" key={sectionKey}>
              {section ? (
                <>
                  <div className="managed-link-section-heading">
                    <div className="field-block">
                      <label htmlFor={`section-title-${section.id}`}>Section heading</label>
                      <input
                        id={`section-title-${section.id}`}
                        maxLength={60}
                        onChange={(event) => patchSection(section.id, { title: event.target.value })}
                        required
                        value={section.title}
                      />
                    </div>
                    <div className="editor-actions">
                      <button
                        aria-label={`Move ${section.title} up`}
                        className="icon-button"
                        disabled={sectionIndex === 0}
                        onClick={() => moveSection(section.id, -1)}
                        type="button"
                      >
                        <ArrowUp aria-hidden="true" size={17} weight="bold" />
                      </button>
                      <button
                        aria-label={`Move ${section.title} down`}
                        className="icon-button"
                        disabled={sectionIndex === profile.sections.length - 1}
                        onClick={() => moveSection(section.id, 1)}
                        type="button"
                      >
                        <ArrowDown aria-hidden="true" size={17} weight="bold" />
                      </button>
                      <button
                        aria-label={`Remove ${section.title}`}
                        className="icon-button danger-button"
                        onClick={() => removeSection(section.id)}
                        type="button"
                      >
                        <Trash aria-hidden="true" size={17} weight="bold" />
                      </button>
                    </div>
                  </div>
                  <MediaEditor
                    hideTitle={section.hideTitle}
                    label={`Heading image for ${section.title}`}
                    mediaType={section.mediaType}
                    mediaUrl={section.mediaUrl}
                    onPatch={(patch) => patchSection(section.id, patch)}
                    onUpload={async (file) => {
                      const mediaUrl = await uploadProfileMedia("sections", section.id, file);
                      patchSection(section.id, { mediaUrl });
                    }}
                    supportsMediaOnly
                  />
                </>
              ) : profile.sections.length ? (
                <h3 className="managed-link-section-label">Other links</h3>
              ) : null}

              <div className="managed-link-list">
                {group.links.map((link, index) => (
                  <article
                    className="link-editor"
                    data-dragging={draggedLinkId === link.id}
                    data-drop-target={dropTarget === `link:${link.id}`}
                    key={link.id}
                    onDragOver={(event) => {
                      if (!draggedLinkId || draggedLinkId === link.id) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget(`link:${link.id}`);
                    }}
                    onDrop={(event) => dropLink(event, link.id, sectionId)}
                  >
                    <div className="editor-row-top">
                      <div className="managed-link-identity">
                        <button
                          aria-describedby="selfhost-link-order-help"
                          aria-label={`Drag ${link.title || "link"} to reorder`}
                          className="link-drag-handle"
                          draggable
                          onDragEnd={finishDrag}
                          onDragStart={(event) => startDrag(event, link.id)}
                          title="Drag to reorder"
                          type="button"
                        >
                          <ArrowsOutCardinal aria-hidden="true" size={17} weight="bold" />
                        </button>
                        <span className="editor-index">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="editor-actions">
                        <label className="toggle-label">
                          <input
                            checked={link.enabled}
                            onChange={(event) => patchLink(link.id, { enabled: event.target.checked })}
                            type="checkbox"
                          />
                          Published
                        </label>
                        <button
                          aria-label={`Move ${link.title || "link"} up`}
                          className="icon-button"
                          disabled={index === 0}
                          onClick={() => moveLink(link.id, -1)}
                          type="button"
                        >
                          <ArrowUp aria-hidden="true" size={17} weight="bold" />
                        </button>
                        <button
                          aria-label={`Move ${link.title || "link"} down`}
                          className="icon-button"
                          disabled={index === group.links.length - 1}
                          onClick={() => moveLink(link.id, 1)}
                          type="button"
                        >
                          <ArrowDown aria-hidden="true" size={17} weight="bold" />
                        </button>
                        <button
                          aria-label={`Remove ${link.title || "link"}`}
                          className="icon-button danger-button"
                          onClick={() => onChange({
                            links: profile.links.filter((item) => item.id !== link.id)
                          })}
                          type="button"
                        >
                          <Trash aria-hidden="true" size={17} weight="bold" />
                        </button>
                      </div>
                    </div>

                    <div className="field-grid link-fields">
                      <div className="field-block">
                        <label htmlFor={`link-title-${link.id}`}>Title</label>
                        <input
                          id={`link-title-${link.id}`}
                          maxLength={100}
                          onChange={(event) => patchLink(link.id, { title: event.target.value })}
                          required
                          value={link.title}
                        />
                      </div>
                      <div className="field-block">
                        <label htmlFor={`link-url-${link.id}`}>URL</label>
                        <input
                          id={`link-url-${link.id}`}
                          inputMode="url"
                          onChange={(event) => patchLink(link.id, { url: event.target.value })}
                          required
                          value={link.url}
                        />
                      </div>
                      <div className="field-block field-span">
                        <label htmlFor={`link-description-${link.id}`}>Description</label>
                        <input
                          id={`link-description-${link.id}`}
                          maxLength={160}
                          onChange={(event) => patchLink(link.id, { description: event.target.value })}
                          value={link.description}
                        />
                      </div>
                      {profile.sections.length ? (
                        <div className="field-block field-span">
                          <label htmlFor={`link-section-${link.id}`}>Section</label>
                          <select
                            id={`link-section-${link.id}`}
                            onChange={(event) => patchLink(link.id, {
                              sectionId: event.target.value || undefined
                            })}
                            value={link.sectionId ?? ""}
                          >
                            <option value="">Other links</option>
                            {profile.sections.map((option) => (
                              <option key={option.id} value={option.id}>{option.title}</option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>

                    <MediaEditor
                      label={`Image for ${link.title || "link"}`}
                      mediaType={link.mediaType}
                      mediaUrl={link.mediaUrl}
                      onPatch={(patch) => patchLink(link.id, patch)}
                      onUpload={async (file) => {
                        const mediaUrl = await uploadProfileMedia("links", link.id, file);
                        patchLink(link.id, { mediaUrl });
                      }}
                    />
                  </article>
                ))}

                {draggedLinkId ? (
                  <div
                    className="managed-link-drop-zone"
                    data-active={dropTarget === `end:${sectionKey}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget(`end:${sectionKey}`);
                    }}
                    onDrop={(event) => dropLink(event, null, sectionId)}
                  >
                    Place at end of {section?.title || "other links"}
                  </div>
                ) : null}

                {group.links.length === 0 ? (
                  <p className="managed-link-empty">No links in this section yet.</p>
                ) : null}
                <button className="managed-link-add" onClick={() => addLink(sectionId)} type="button">
                  <Plus aria-hidden="true" size={16} weight="bold" />
                  Add link{section ? ` to ${section.title}` : ""}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MediaEditor({
  label,
  mediaUrl,
  mediaType,
  hideTitle,
  supportsMediaOnly = false,
  onPatch,
  onUpload
}: {
  label: string;
  mediaUrl?: string;
  mediaType?: ProfileMediaType;
  hideTitle?: boolean;
  supportsMediaOnly?: boolean;
  onPatch: (patch: MediaPatch) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const hasMedia = Boolean(mediaUrl?.trim());

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      await onUpload(file);
      setMessage("Image uploaded. Publish changes when the preview looks right.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <details className="managed-media-editor">
      <summary>
        <span><ImageSquare aria-hidden="true" size={17} weight="duotone" /> Icon or thumbnail</span>
        <small>{hasMedia ? "Added" : "Optional"}</small>
      </summary>
      <div className="managed-media-body">
        <div className="managed-media-preview" data-type={mediaType ?? "icon"}>
          {hasMedia ? <img src={mediaUrl} alt="" /> : <ImageSquare aria-hidden="true" size={22} />}
        </div>
        <div className="managed-media-fields">
          <div className="field-block">
            <label htmlFor={`${id}-url`}>Image URL</label>
            <input
              id={`${id}-url`}
              inputMode="url"
              onChange={(event) => onPatch(event.target.value
                ? { mediaUrl: event.target.value }
                : { mediaUrl: undefined, hideTitle: false })}
              placeholder="https://... or /image.png"
              value={mediaUrl ?? ""}
            />
          </div>
          <div className="field-block">
            <label htmlFor={`${id}-type`}>Display</label>
            <select
              id={`${id}-type`}
              onChange={(event) => onPatch({
                mediaType: event.target.value === "thumbnail" ? "thumbnail" : "icon"
              })}
              value={mediaType ?? "icon"}
            >
              <option value="icon">Compact icon</option>
              <option value="thumbnail">Wide thumbnail</option>
            </select>
          </div>
        </div>
        <div className="managed-media-actions">
          <label className="secondary-button managed-media-upload">
            <input
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.svg"
              disabled={uploading}
              type="file"
              onChange={(event) => {
                void upload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <UploadSimple aria-hidden="true" size={16} weight="bold" />
            {uploading ? "Uploading" : "Upload image"}
          </label>
          {hasMedia ? (
            <button
              className="text-button"
              onClick={() => onPatch({ mediaUrl: undefined, hideTitle: false })}
              type="button"
            >
              <X aria-hidden="true" size={15} weight="bold" /> Clear
            </button>
          ) : null}
        </div>
        {supportsMediaOnly ? (
          <label className="check-option managed-media-toggle">
            <input
              checked={Boolean(hideTitle && hasMedia)}
              disabled={!hasMedia}
              onChange={(event) => onPatch({ hideTitle: event.target.checked })}
              type="checkbox"
            />
            Use the image as the visible heading
          </label>
        ) : null}
        {message ? <p className="managed-media-message" role="status">{message}</p> : null}
        <span className="sr-only">{label}</span>
      </div>
    </details>
  );
}
