"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  FiBarChart2,
  FiCheck,
  FiCopy,
  FiDownload,
  FiEye,
  FiFileText,
  FiGithub,
  FiImage,
  FiLink,
  FiLogOut,
  FiMonitor,
  FiSave,
  FiSettings,
  FiSliders,
  FiUser,
} from "react-icons/fi";
import { Brand } from "@/components/brand";
import { AppLoadingState } from "@/components/app-loading-state";
import { ProfilePreview } from "@/components/profile-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { MotionToggle } from "@/components/motion-toggle";
import { uploadUserAvatar } from "@/lib/avatar-upload";
import {
  deleteProfileMedia,
  uploadProfileMedia,
  type ProfileMediaScope,
} from "@/lib/profile-media-upload";
import { sameProfileMediaObject } from "@/lib/profile-media-identity";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { hasLinkedGitHub, resolveGitHubLogin } from "@/lib/auth-providers";
import {
  demoProfile,
  developerActivityHasVisibleModules,
  groupLinksBySection,
  isAutoLinkDescription,
  isAutoLinkTitle,
  isValidGitHubRepository,
  coerceProfileMediaUrl,
  isSafeExternalUrl,
  isSafeProfileMediaUrl,
  isValidGitHubUsername,
  isValidHandle,
  resolveDeveloperActivity,
  titleFromUrl,
  type ProfileConfig,
  type ProfileLink,
  type ProfileSection,
  type ProfileTheme,
} from "@/lib/profile";
import { isHandleAvailableForUser, loadProfile, saveProfile } from "@/lib/profile-store";
import { loadProfileStats, type ProfileStats } from "@/lib/profile-stats";
import { coerceExternalUrl, normalizeLinkUrl } from "@/lib/email-link";
import {
  clearProfileDraft,
  profileUpdatedAtKey,
  profilesMatch,
  resolveProfileWithDraft,
  writeProfileDraft,
} from "@/lib/profile-draft";
import { sanitizeSocials } from "@/lib/socials";
import {
  fetchEnrichedLinkMetadata,
  isEnrichableLinkUrl,
} from "@/lib/link-metadata";
import { isLinkedInUrl } from "@/lib/linkedin-url";
import { LinksEditor } from "./links-editor";
import { DeveloperActivityEditor } from "./developer-activity-editor";
import { LinkStatsPanel } from "./link-stats-panel";
import { LinkedSignInMethods } from "./linked-sign-in-methods";
import { DeleteAccountPanel } from "./delete-account-panel";
import { SocialProfilesFields } from "./social-profiles-fields";
import styles from "./dashboard-app.module.css";

type Tab = "overview" | "stats" | "links" | "profile" | "activity" | "appearance" | "settings";
type Status = { tone: "neutral" | "success" | "error"; message: string } | null;
type HandleCheckStatus =
  | "idle"
  | "current"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";
type PendingDraftMedia = {
  scope: ProfileMediaScope;
  itemId: string;
  mediaUrl: string;
};

const navItems = [
  ["overview", "Overview", FiMonitor],
  ["stats", "Stats", FiBarChart2],
  ["links", "Links", FiLink],
  ["profile", "Profile", FiUser],
  ["activity", "Activity", FiGithub],
  ["appearance", "Appearance", FiSliders],
  ["settings", "Settings", FiSettings],
] as const;

const themeOptions: { id: ProfileTheme; label: string; className: string }[] = [
  { id: "paper", label: "Paper", className: styles.themePaper },
  { id: "terminal", label: "Terminal", className: styles.themeTerminal },
  { id: "midnight", label: "Midnight", className: styles.themeMidnight },
  { id: "mono", label: "Mono", className: styles.themeMono },
];

const LINKEDIN_LINK_TITLE = "LinkedIn";

export function DashboardApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<ProfileConfig>(demoProfile);
  const [user, setUser] = useState<User | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [host, setHost] = useState("socialize.you");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeMediaUploads, setActiveMediaUploads] = useState(0);
  const [status, setStatus] = useState<Status>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [overviewStats, setOverviewStats] = useState<ProfileStats | null>(null);
  const [claimedHandle, setClaimedHandle] = useState(demoProfile.handle);
  const [handleCheck, setHandleCheck] = useState<HandleCheckStatus>("current");
  const [draftBaseUpdatedAt, setDraftBaseUpdatedAt] = useState("");
  const [lastSavedProfile, setLastSavedProfile] = useState<ProfileConfig | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const pendingDraftMedia = useRef(new Map<string, PendingDraftMedia>());
  const mediaIntentVersions = useRef(new Map<string, number>());
  const activeMediaUploadsRef = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    setHost(window.location.host);

    if (!auth) {
      const localProfile = window.localStorage.getItem("socialize-demo-profile");
      if (localProfile) {
        try {
          const parsed = JSON.parse(localProfile) as ProfileConfig;
          setProfile(parsed);
          setClaimedHandle(parsed.handle);
        } catch {
          setProfile(demoProfile);
          setClaimedHandle(demoProfile.handle);
        }
      } else {
        setProfile(demoProfile);
        setClaimedHandle(demoProfile.handle);
      }
      setHandleCheck("current");
      setWorkspaceReady(true);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setLoadingProfile(false);
        setWorkspaceReady(true);
        return;
      }

      setWorkspaceReady(false);
      setLoadingProfile(true);

      void loadProfile(nextUser.uid)
        .then((stored) => {
          if (!stored) {
            router.replace("/onboarding");
            return;
          }
          const resolved = resolveProfileWithDraft(nextUser.uid, stored);
          setProfile(resolved.profile);
          setClaimedHandle(stored.handle);
          setHandleCheck("current");
          setDraftBaseUpdatedAt(resolved.baseUpdatedAt);
          setLastSavedProfile(stored);
          setDraftHydrated(true);
          if (resolved.restoredDraft) {
            setStatus({
              tone: "neutral",
              message: "Restored your unsaved draft from this browser.",
            });
          }
          setWorkspaceReady(true);
        })
        .catch(() => {
          router.replace("/onboarding");
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    });
  }, [router]);

  useEffect(() => {
    if (!draftHydrated || !user?.uid || !isFirebaseConfigured) return;
    if (lastSavedProfile && profilesMatch(profile, lastSavedProfile)) {
      clearProfileDraft(user.uid);
      return;
    }

    const timer = window.setTimeout(() => {
      writeProfileDraft(user.uid, profile, draftBaseUpdatedAt);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [profile, user?.uid, draftHydrated, draftBaseUpdatedAt, lastSavedProfile]);

  useEffect(() => {
    if (!user?.uid || !lastSavedProfile) return;
    if (profilesMatch(profile, lastSavedProfile)) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [profile, lastSavedProfile, user?.uid]);

  useEffect(() => {
    const candidate = profile.handle.trim().toLowerCase();

    if (!candidate) {
      setHandleCheck("invalid");
      return;
    }

    if (candidate === claimedHandle) {
      setHandleCheck("current");
      return;
    }

    if (!isValidHandle(candidate)) {
      setHandleCheck("invalid");
      return;
    }

    if (!isFirebaseConfigured || !user) {
      setHandleCheck("available");
      return;
    }

    let cancelled = false;
    setHandleCheck("checking");
    const timer = window.setTimeout(() => {
      void isHandleAvailableForUser(candidate, user.uid)
        .then((available) => {
          if (cancelled) return;
          setHandleCheck(available ? "available" : "taken");
        })
        .catch(() => {
          if (cancelled) return;
          setHandleCheck("error");
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profile.handle, claimedHandle, user, isFirebaseConfigured]);

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured) {
      setOverviewStats(null);
      return;
    }

    let active = true;
    void loadProfileStats(user.uid)
      .then((stats) => {
        if (active) setOverviewStats(stats);
      })
      .catch(() => {
        if (active) setOverviewStats(null);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, tab]);

  const pageUrl = useMemo(() => {
    return `${host}/${profile.handle}`;
  }, [host, profile.handle]);

  const handleHint = useMemo(() => {
    switch (handleCheck) {
      case "checking":
        return { text: "Checking if this handle is available…", tone: "neutral" as const };
      case "available":
        return { text: `@${profile.handle} is available`, tone: "success" as const };
      case "current":
        return { text: "3–30 lowercase letters, numbers, or hyphens", tone: "neutral" as const };
      case "taken":
        return { text: "That handle is already taken", tone: "error" as const };
      case "invalid":
        return {
          text: "Use 3–30 lowercase letters, numbers, or hyphens. Reserved routes are unavailable.",
          tone: "error" as const,
        };
      case "error":
        return { text: "Could not check availability. Try again before saving.", tone: "error" as const };
      default:
        return { text: "3–30 lowercase letters, numbers, or hyphens", tone: "neutral" as const };
    }
  }, [handleCheck, profile.handle]);

  const handleBlocksSave =
    handleCheck === "checking" ||
    handleCheck === "taken" ||
    handleCheck === "invalid" ||
    handleCheck === "error";

  const overviewClickSummary = useMemo(() => {
    const totalClicks = overviewStats?.totalClicks ?? 0;
    const linkEntries = Object.entries(overviewStats?.links ?? {});
    const topEntry = linkEntries.sort((a, b) => (b[1].clicks ?? 0) - (a[1].clicks ?? 0))[0];
    const topLink = topEntry
      ? profile.links.find((link) => link.id === topEntry[0])
      : undefined;
    const socialClicks = Object.values(overviewStats?.socials ?? {}).reduce(
      (sum, entry) => sum + (entry.clicks ?? 0),
      0,
    );

    return {
      totalClicks,
      topLinkTitle: topLink?.title,
      topLinkClicks: topEntry?.[1].clicks ?? 0,
      socialClicks,
    };
  }, [overviewStats, profile.links]);
  function update<K extends keyof ProfileConfig>(key: K, value: ProfileConfig[K]) {
    if (key === "avatarUrl") {
      invalidateMediaIntent("avatars", "avatar");
      discardDraftMedia(
        "avatars",
        "avatar",
        typeof value === "string" ? value : undefined,
      );
    }
    setProfile((current) => ({ ...current, [key]: value }));
    setStatus(null);
  }

  function draftMediaKey(scope: ProfileMediaScope, itemId: string) {
    return `${scope}:${itemId}`;
  }

  function beginMediaIntent(scope: ProfileMediaScope, itemId: string) {
    const key = draftMediaKey(scope, itemId);
    const version = (mediaIntentVersions.current.get(key) ?? 0) + 1;
    mediaIntentVersions.current.set(key, version);
    return version;
  }

  function invalidateMediaIntent(scope: ProfileMediaScope, itemId: string) {
    const key = draftMediaKey(scope, itemId);
    mediaIntentVersions.current.set(
      key,
      (mediaIntentVersions.current.get(key) ?? 0) + 1,
    );
  }

  function mediaIntentIsCurrent(
    scope: ProfileMediaScope,
    itemId: string,
    version: number,
  ) {
    return mediaIntentVersions.current.get(draftMediaKey(scope, itemId)) === version;
  }

  function invalidateAllMediaIntents() {
    for (const [key, version] of mediaIntentVersions.current) {
      mediaIntentVersions.current.set(key, version + 1);
    }
  }

  function trackMediaUpload(delta: 1 | -1) {
    activeMediaUploadsRef.current = Math.max(
      0,
      activeMediaUploadsRef.current + delta,
    );
    setActiveMediaUploads(activeMediaUploadsRef.current);
  }

  function rememberDraftMedia(
    scope: ProfileMediaScope,
    itemId: string,
    mediaUrl: string,
  ) {
    const key = draftMediaKey(scope, itemId);
    const previous = pendingDraftMedia.current.get(key);
    pendingDraftMedia.current.set(key, {
      scope,
      itemId,
      mediaUrl,
    });
    const previousUsedElsewhere =
      previous &&
      (
        profileRef.current.links.some(
          (item) =>
            !(scope === "links" && item.id === itemId) &&
            sameProfileMediaObject(item.mediaUrl, previous.mediaUrl),
        ) ||
        (profileRef.current.sections ?? []).some(
          (item) =>
            !(scope === "sections" && item.id === itemId) &&
            sameProfileMediaObject(item.mediaUrl, previous.mediaUrl),
        ) ||
        (scope !== "avatars" &&
          sameProfileMediaObject(
            profileRef.current.avatarUrl,
            previous.mediaUrl,
          ))
      );
    if (
      previous &&
      !sameProfileMediaObject(previous.mediaUrl, mediaUrl) &&
      !previousUsedElsewhere &&
      user
    ) {
      void deleteProfileMedia(
        user.uid,
        previous.scope,
        previous.itemId,
        previous.mediaUrl,
      ).catch((error) => {
        console.error("Failed to remove superseded draft media", error);
      });
    }
  }

  function discardDraftMedia(
    scope: ProfileMediaScope,
    itemId: string,
    nextMediaUrl?: string,
  ) {
    const key = draftMediaKey(scope, itemId);
    const pending = pendingDraftMedia.current.get(key);
    if (!pending || sameProfileMediaObject(pending.mediaUrl, nextMediaUrl)) return;

    pendingDraftMedia.current.delete(key);
    const usedElsewhere =
      profileRef.current.links.some(
        (item) =>
          !(pending.scope === "links" && item.id === pending.itemId) &&
          sameProfileMediaObject(item.mediaUrl, pending.mediaUrl),
      ) ||
      (profileRef.current.sections ?? []).some(
        (item) =>
          !(pending.scope === "sections" && item.id === pending.itemId) &&
          sameProfileMediaObject(item.mediaUrl, pending.mediaUrl),
      ) ||
      (pending.scope !== "avatars" &&
        sameProfileMediaObject(
          profileRef.current.avatarUrl,
          pending.mediaUrl,
        ));
    if (usedElsewhere) return;
    if (!user) return;
    void deleteProfileMedia(
      user.uid,
      pending.scope,
      pending.itemId,
      pending.mediaUrl,
    ).catch((error) => {
      console.error("Failed to remove discarded draft media", error);
    });
  }

  function addSection() {
    const sections = [
      ...(profile.sections ?? []),
      { id: `section-${Date.now()}`, title: "New section" },
    ];
    update("sections", sections);
  }

  function updateSection(sectionId: string, patch: Partial<ProfileSection>) {
    if (Object.prototype.hasOwnProperty.call(patch, "mediaUrl")) {
      invalidateMediaIntent("sections", sectionId);
      discardDraftMedia("sections", sectionId, patch.mediaUrl);
    }
    setProfile((current) => ({
      ...current,
      sections: (current.sections ?? []).map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
    setStatus(null);
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    const sections = [...(profile.sections ?? [])];
    const index = sections.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    update("sections", sections);
  }

  function removeSection(sectionId: string) {
    invalidateMediaIntent("sections", sectionId);
    discardDraftMedia("sections", sectionId);
    setProfile((current) => ({
      ...current,
      sections: (current.sections ?? []).filter((section) => section.id !== sectionId),
      links: current.links.map((link) =>
        link.sectionId === sectionId ? { ...link, sectionId: undefined } : link,
      ),
    }));
    setStatus(null);
  }

  function addLink(sectionId?: string) {
    update("links", [
      ...profile.links,
      {
        id: `link-${Date.now()}`,
        title: "",
        description: "",
        url: "",
        enabled: true,
        kind: "link",
        ...(sectionId ? { sectionId } : {}),
      },
    ]);
  }

  function updateLink(
    linkId: string,
    patch: Partial<ProfileLink>,
  ) {
    if (Object.prototype.hasOwnProperty.call(patch, "mediaUrl")) {
      invalidateMediaIntent("links", linkId);
      discardDraftMedia("links", linkId, patch.mediaUrl);
    }
    setProfile((current) => ({
      ...current,
      links: current.links.map((link) =>
        link.id === linkId ? { ...link, ...patch } : link,
      ),
    }));
    setStatus(null);
  }

  async function handleLinkUrlChange(linkId: string, rawUrl: string) {
    const currentLink = profile.links.find((link) => link.id === linkId);
    if (!currentLink) return;

    const url = normalizeLinkUrl(rawUrl);
    const shouldAutofillTitle = isAutoLinkTitle(currentLink.title, currentLink.url);
    const shouldAutofillDescription = isAutoLinkDescription(currentLink.description);
    const derived = isLinkedInUrl(url)
      ? LINKEDIN_LINK_TITLE
      : isEnrichableLinkUrl(url)
        ? ""
        : titleFromUrl(url);

    setProfile((current) => ({
      ...current,
      links: current.links.map((link) => {
        if (link.id !== linkId) return link;
        return {
          ...link,
          url,
          ...(shouldAutofillTitle && derived ? { title: derived } : {}),
        };
      }),
    }));
    setStatus(null);

    if (!isEnrichableLinkUrl(url)) return;

    const metadata = await fetchEnrichedLinkMetadata(url);
    if (!metadata) return;

    setProfile((current) => {
      const link = current.links.find((item) => item.id === linkId);
      if (!link || link.url.trim() !== url.trim()) return current;

      const autofillTitle = isAutoLinkTitle(link.title, url);
      const autofillDescription = isAutoLinkDescription(link.description);

      return {
        ...current,
        links: current.links.map((item) => {
          if (item.id !== linkId) return item;
          return {
            ...item,
            ...(autofillTitle && metadata.title ? { title: metadata.title } : {}),
            ...(autofillDescription && metadata.description
              ? { description: metadata.description }
              : {}),
          };
        }),
      };
    });
  }

  function moveLink(linkId: string, direction: -1 | 1) {
    const links = [...profile.links];
    const index = links.findIndex((link) => link.id === linkId);
    if (index < 0) return;

    const sectionKey = links[index].sectionId ?? "";
    const sectionIndices = links
      .map((link, linkIndex) =>
        (link.sectionId ?? "") === sectionKey ? linkIndex : -1,
      )
      .filter((linkIndex) => linkIndex >= 0);
    const position = sectionIndices.indexOf(index);
    const targetPosition = position + direction;
    if (targetPosition < 0 || targetPosition >= sectionIndices.length) return;

    const targetIndex = sectionIndices[targetPosition];
    [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
    update("links", links);
  }

  function reorderLink(
    linkId: string,
    targetLinkId: string | null,
    targetSectionId?: string,
  ) {
    if (linkId === targetLinkId) return;
    setProfile((current) => {
      const dragged = current.links.find((link) => link.id === linkId);
      if (!dragged) return current;

      const links = current.links.filter((link) => link.id !== linkId);
      const moved = {
        ...dragged,
        sectionId: targetSectionId || undefined,
      };
      if (targetLinkId) {
        const targetIndex = links.findIndex((link) => link.id === targetLinkId);
        if (targetIndex >= 0) links.splice(targetIndex, 0, moved);
        else links.push(moved);
      } else {
        let insertAt = -1;
        for (let index = links.length - 1; index >= 0; index -= 1) {
          if ((links[index].sectionId ?? "") === (targetSectionId ?? "")) {
            insertAt = index + 1;
            break;
          }
        }
        links.splice(insertAt >= 0 ? insertAt : links.length, 0, moved);
      }
      return { ...current, links };
    });
    setStatus(null);
  }

  async function uploadLinkMedia(linkId: string, file: File) {
    if (!user) throw new Error("Sign in before uploading a link image.");
    const intentVersion = beginMediaIntent("links", linkId);
    trackMediaUpload(1);
    try {
      const mediaUrl = await uploadProfileMedia(
        user.uid,
        "links",
        linkId,
        file,
      );
      if (
        !mediaIntentIsCurrent("links", linkId, intentVersion) ||
        !profileRef.current.links.some((link) => link.id === linkId)
      ) {
        void deleteProfileMedia(user.uid, "links", linkId, mediaUrl).catch(
          (error) => {
            console.error("Failed to remove a stale link image upload", error);
          },
        );
        return;
      }
      rememberDraftMedia("links", linkId, mediaUrl);
      updateLink(linkId, { mediaUrl, mediaIcon: undefined, mediaType: "icon" });
      setStatus({ tone: "success", message: "Link image uploaded. Save changes to publish it." });
    } finally {
      trackMediaUpload(-1);
    }
  }

  async function uploadSectionMedia(sectionId: string, file: File) {
    if (!user) throw new Error("Sign in before uploading a section image.");
    const intentVersion = beginMediaIntent("sections", sectionId);
    trackMediaUpload(1);
    try {
      const mediaUrl = await uploadProfileMedia(
        user.uid,
        "sections",
        sectionId,
        file,
      );
      if (
        !mediaIntentIsCurrent("sections", sectionId, intentVersion) ||
        !(profileRef.current.sections ?? []).some(
          (section) => section.id === sectionId,
        )
      ) {
        void deleteProfileMedia(user.uid, "sections", sectionId, mediaUrl).catch(
          (error) => {
            console.error("Failed to remove a stale section image upload", error);
          },
        );
        return;
      }
      rememberDraftMedia("sections", sectionId, mediaUrl);
      updateSection(sectionId, { mediaUrl, mediaIcon: undefined, mediaType: "icon" });
      setStatus({ tone: "success", message: "Section image uploaded. Save changes to publish it." });
    } finally {
      trackMediaUpload(-1);
    }
  }

  function removeLink(linkId: string) {
    invalidateMediaIntent("links", linkId);
    discardDraftMedia("links", linkId);
    update("links", profile.links.filter((link) => link.id !== linkId));
  }

  const linkGroups = useMemo(() => groupLinksBySection(profile), [profile]);
  const developerActivity = useMemo(
    () => resolveDeveloperActivity(profile.developerActivity),
    [profile.developerActivity],
  );

  async function persistProfile(
    nextProfile: ProfileConfig = profile,
    successMessage?: string,
  ) {
    if (activeMediaUploadsRef.current > 0) {
      setStatus({
        tone: "neutral",
        message: "Wait for image uploads to finish before saving.",
      });
      return false;
    }
    invalidateAllMediaIntents();
    setSaving(true);
    setStatus(null);
    try {
      let profileToSave = nextProfile;
      const nextHandle = profileToSave.handle.trim().toLowerCase();
      if (!isValidHandle(nextHandle)) {
        throw new Error(
          "Choose a handle with 3 to 30 lowercase letters, numbers, or hyphens.",
        );
      }
      if (nextHandle !== claimedHandle) {
        if (handleCheck === "checking") {
          throw new Error("Wait for the handle availability check to finish.");
        }
        if (handleCheck === "taken") {
          throw new Error("That handle is already taken.");
        }
        if (handleCheck === "invalid" || handleCheck === "error") {
          throw new Error("Pick an available handle before saving.");
        }
        const available = await isHandleAvailableForUser(nextHandle, user?.uid);
        if (!available) {
          setHandleCheck("taken");
          throw new Error("That handle is already taken.");
        }
      }
      profileToSave = {
        ...profileToSave,
        handle: nextHandle,
        links: profileToSave.links.map((link) => ({
          ...link,
          url: coerceExternalUrl(link.url),
          ...(link.mediaUrl
            ? { mediaUrl: coerceProfileMediaUrl(link.mediaUrl) }
            : {}),
        })),
        sections: (profileToSave.sections ?? []).map((section) => ({
          ...section,
          ...(section.mediaUrl
            ? { mediaUrl: coerceProfileMediaUrl(section.mediaUrl) }
            : {}),
        })),
        socials: sanitizeSocials(profileToSave.socials),
      };
      const invalidLink = profileToSave.links.find((link) => !isSafeExternalUrl(link.url));
      if (invalidLink) throw new Error(`“${invalidLink.title}” needs an https:// or mailto: URL.`);
      const invalidLinkMedia = profileToSave.links.find(
        (link) =>
          link.mediaUrl &&
          !link.mediaIcon &&
          !isSafeProfileMediaUrl(link.mediaUrl),
      );
      if (invalidLinkMedia) {
        throw new Error(`"${invalidLinkMedia.title || "Link"}" needs an https:// image URL or local image path.`);
      }
      const invalidSection = (profileToSave.sections ?? []).find(
        (section) =>
          !section.title.trim() ||
          (section.mediaUrl &&
            !section.mediaIcon &&
            !isSafeProfileMediaUrl(section.mediaUrl)),
      );
      if (invalidSection) {
        throw new Error("Every section needs heading text and a valid image URL.");
      }
      const activity = resolveDeveloperActivity(profileToSave.developerActivity);
      const activityWillPublish =
        activity.enabled && developerActivityHasVisibleModules(activity);
      if (activityWillPublish && !hasLinkedGitHub(user)) {
        throw new Error("Link your GitHub account before showing developer activity.");
      }
      const linkedGitHubUsername = activityWillPublish
        ? await resolveGitHubLogin(user)
        : null;
      if (activityWillPublish && !linkedGitHubUsername) {
        throw new Error(
          "Could not resolve your GitHub username. Unlink and link GitHub again under Settings.",
        );
      }
      if (activityWillPublish && linkedGitHubUsername) {
        profileToSave = {
          ...profileToSave,
          developerActivity: {
            ...activity,
            githubUsername: linkedGitHubUsername,
          },
        };
      }
      if (
        activityWillPublish &&
        !isValidGitHubUsername(
          resolveDeveloperActivity(profileToSave.developerActivity).githubUsername,
        )
      ) {
        throw new Error("Link your GitHub account before showing developer activity.");
      }
      if (activity.repositories.names.some((name) => !isValidGitHubRepository(name))) {
        throw new Error("Repository filters must use the owner/repository format.");
      }
      if (
        activityWillPublish &&
        activity.repositories.mode === "include" &&
        activity.repositories.names.length === 0
      ) {
        throw new Error("Add at least one repository or use automatic selection.");
      }
      if (auth && user) {
        const saved = await saveProfile(
          user.uid,
          profileToSave,
          draftBaseUpdatedAt,
        );
        pendingDraftMedia.current.clear();
        setProfile(saved);
        setClaimedHandle(saved.handle);
        setHandleCheck("current");
        setLastSavedProfile(saved);
        setDraftBaseUpdatedAt(profileUpdatedAtKey(saved));
        clearProfileDraft(user.uid);
      } else {
        window.localStorage.setItem("socialize-demo-profile", JSON.stringify(profileToSave));
        pendingDraftMedia.current.clear();
        setProfile(profileToSave);
        setClaimedHandle(profileToSave.handle);
        setHandleCheck("current");
        setLastSavedProfile(profileToSave);
      }
      setStatus({
        tone: "success",
        message:
          successMessage ?? "Saved",
      });
      return true;
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "We could not save your profile." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    const previous = profile;
    const nextProfile = { ...profile, published: !profile.published };

    if (nextProfile.published && user) {
      try {
        await user.reload();
        if (!user.emailVerified) {
          setStatus({
            tone: "error",
            message: "Verify your email before publishing your profile.",
          });
          return;
        }
        await user.getIdToken(true);
      } catch {
        setStatus({
          tone: "error",
          message: "We could not confirm your email verification. Please try again.",
        });
        return;
      }
    }

    setProfile(nextProfile);
    const saved = await persistProfile(
      nextProfile,
      nextProfile.published ? "Your profile is live." : "Your profile is unpublished.",
    );
    if (!saved) setProfile(previous);
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (!user) {
      setStatus({ tone: "error", message: "Sign in to your account before uploading an avatar." });
      return;
    }

    const intentVersion = beginMediaIntent("avatars", "avatar");
    setUploadingAvatar(true);
    trackMediaUpload(1);
    setStatus(null);
    try {
      const avatarUrl = await uploadUserAvatar(user.uid, file);
      if (!mediaIntentIsCurrent("avatars", "avatar", intentVersion)) {
        void deleteProfileMedia(
          user.uid,
          "avatars",
          "avatar",
          avatarUrl,
        ).catch((error) => {
          console.error("Failed to remove a stale avatar upload", error);
        });
        return;
      }
      rememberDraftMedia("avatars", "avatar", avatarUrl);
      update("avatarUrl", avatarUrl);
      setStatus({ tone: "success", message: "Avatar uploaded. Save changes to keep it on your profile." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "The avatar upload failed. Try again.",
      });
    } finally {
      setUploadingAvatar(false);
      trackMediaUpload(-1);
    }
  }

  async function copyPageUrl() {
    await navigator.clipboard.writeText(`${window.location.protocol}//${pageUrl}`);
    setUrlCopied(true);
    setStatus({ tone: "success", message: "Profile URL copied." });
    window.setTimeout(() => setUrlCopied(false), 2000);
  }

  function exportProfile() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.handle}-socialize.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function logOut() {
    if (activeMediaUploadsRef.current > 0) {
      setStatus({
        tone: "neutral",
        message: "Wait for image uploads to finish before signing out.",
      });
      return;
    }
    if (auth) await signOut(auth);
    router.push("/sign-in");
  }

  if (!workspaceReady) {
    return (
      <AppLoadingState
        description={
          loadingProfile
            ? "Fetching your links, profile, and settings…"
            : "Connecting to your Socialize account…"
        }
        label="Loading workspace"
        title={loadingProfile ? "Loading your profile." : "Loading your workspace."}
      />
    );
  }

  if (isFirebaseConfigured && !user) {
    return (
      <div className={styles.emptyAuth}>
        <div><Brand /><h1>This workspace is private.</h1><p>Sign in to manage your links, profile, and publishing settings.</p><Link href="/sign-in?returnTo=/dashboard">Sign in to continue</Link></div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Brand />
        <div className={styles.topbarCenter}><i /> {profile.published ? "Published" : "Private draft"} · {pageUrl}</div>
        <div className={styles.topbarActions}>
          <ThemeToggle compact />
          <MotionToggle compact />
          <button
            type="button"
            onClick={copyPageUrl}
            className={urlCopied ? styles.actionSuccess : undefined}
            aria-label={urlCopied ? "Profile URL copied" : "Copy profile URL"}
          >
            {urlCopied ? <><FiCheck /> Copied!</> : <><FiCopy /> Copy URL</>}
          </button>
          <Link href={`/${profile.handle}`} target="_blank"><FiEye /> Preview</Link>
          <button className={styles.publish} type="button" onClick={togglePublished} disabled={saving || activeMediaUploads > 0 || handleBlocksSave}>
            {profile.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Dashboard navigation">
          <div className={styles.account}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.accountAvatar} src={profile.avatarUrl} alt="" />
            ) : (
              <span className={styles.accountAvatar}>{profile.displayName.slice(0, 2).toUpperCase()}</span>
            )}
            <div><strong>{profile.displayName}</strong><small>{user?.email || "local demo"}</small></div>
          </div>
          <span className={styles.navLabel}>Workspace</span>
          {navItems.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? styles.active : ""} type="button" onClick={() => setTab(id)}><Icon /><span>{label}</span></button>
          ))}
          <div className={styles.sidebarBottom}>
            <button type="button" onClick={logOut} disabled={activeMediaUploads > 0}><FiLogOut /><span>Sign out</span></button>
          </div>
        </aside>

        <main className={styles.panel}>
          {tab === "overview" ? (
            <>
              <PanelHeading eyebrow="WORKSPACE / OVERVIEW" title="Good to see you." />
              {!isFirebaseConfigured ? <div className={styles.notice}>This is the local demo workspace. Add your environment values to enable real accounts and cloud saves.</div> : null}
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}><span>Profile status</span><strong>{profile.published ? "Live" : "Draft"}</strong><p>@{profile.handle}</p></div>
                <div className={styles.overviewCard}><span>Active links</span><strong>{profile.links.filter((link) => link.enabled).length}</strong><p>of {profile.links.length} total</p></div>
                <div className={styles.overviewCard}>
                  <span>Total clicks</span>
                  <strong>{overviewClickSummary.totalClicks}</strong>
                  <p>{overviewClickSummary.socialClicks > 0 ? `${overviewClickSummary.socialClicks} from social icons` : "From your public profile"}</p>
                </div>
                <div className={styles.overviewCard}>
                  <span>Top link</span>
                  <strong>{overviewClickSummary.topLinkClicks}</strong>
                  <p>{overviewClickSummary.topLinkTitle || "No clicks yet"}</p>
                </div>
              </div>
              <div className={styles.overviewStatsHint}>
                <p>Click counts update when people open links on your live profile.</p>
                <button type="button" onClick={() => setTab("stats")}>Open full stats</button>
              </div>
              {profile.published ? (
                <aside className={styles.supportPrompt}>
                  <div>
                    <span>KEEP SOCIALIZE FREE</span>
                    <strong>Your page is live. If Socialize helped, help keep it free.</strong>
                    <p>Support funds hosting, security, documentation, and maintenance. It never unlocks product features.</p>
                  </div>
                  <Link href="/sponsor">See what support funds</Link>
                </aside>
              ) : null}
              <div className={styles.checklist}>
                <div><FiCheck /><span>Claim your handle</span><small>@{profile.handle}</small></div>
                <div><FiCheck /><span>Add your best work</span><small>{profile.links.length} links</small></div>
                <div>{profile.published ? <FiCheck /> : <FiFileText />}<span>Publish your profile</span><small>{profile.published ? "done" : "waiting"}</small></div>
              </div>
            </>
          ) : null}

          {tab === "stats" ? (
            <>
              <PanelHeading eyebrow="WORKSPACE / STATS" title="What people open." />
              <LinkStatsPanel
                uid={user?.uid ?? null}
                profile={profile}
                localDemo={!isFirebaseConfigured || !user}
              />
            </>
          ) : null}

          {tab === "links" ? (
            <>
              <PanelHeading eyebrow="CONTENT / LINKS" title="Your links." />
              <LinksEditor
                linkGroups={linkGroups}
                profile={profile}
                onAddLink={addLink}
                onAddSection={addSection}
                onLinkUrlChange={handleLinkUrlChange}
                onMoveLink={moveLink}
                onMoveSection={moveSection}
                onReorderLink={reorderLink}
                onRemoveLink={removeLink}
                onRemoveSection={removeSection}
                onUploadLinkMedia={uploadLinkMedia}
                onUploadSectionMedia={uploadSectionMedia}
                onUpdateLink={updateLink}
                onUpdateSection={updateSection}
                canUploadMedia={Boolean(user)}
              />
            </>
          ) : null}

          {tab === "profile" ? (
            <>
              <PanelHeading eyebrow="IDENTITY / PROFILE" title="Make it yours." />
              <div className={styles.formGrid}>
                <Field label="Display name"><input value={profile.displayName} onChange={(event) => update("displayName",event.target.value)} /></Field>
                <Field label="Handle" hint={handleHint.text} hintTone={handleHint.tone}>
                  <input
                    aria-invalid={handleCheck === "taken" || handleCheck === "invalid"}
                    value={profile.handle}
                    onChange={(event) =>
                      update("handle", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                  />
                </Field>
                <Field label="Role" wide><input value={profile.role} onChange={(event) => update("role",event.target.value)} /></Field>
                <Field label="Bio" wide><textarea maxLength={240} value={profile.bio} onChange={(event) => update("bio",event.target.value)} /></Field>
                <div className={styles.formFieldWide}>
                  <SocialProfilesFields
                    socials={profile.socials}
                    onChange={(socials) => update("socials", socials)}
                  />
                </div>
                <Field label="Location"><input value={profile.location || ""} onChange={(event) => update("location",event.target.value)} /></Field>
                <Field label="Availability"><input value={profile.availability || ""} onChange={(event) => update("availability",event.target.value)} /></Field>
                <Field label="Avatar image" wide hint="JPEG, PNG, WebP, or GIF smaller than 3 MB.">
                  <div className={styles.filePicker}>
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.filePreview} src={profile.avatarUrl} alt="" />
                    ) : (
                      <span className={styles.filePreviewFallback} aria-hidden="true"><FiImage /></span>
                    )}
                    <div className={styles.filePickerCopy}>
                      <label className={styles.fileButton}>
                        <input
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={!user || uploadingAvatar}
                          type="file"
                          onChange={(event) => {
                            void uploadAvatar(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                        <FiImage aria-hidden="true" />
                        {uploadingAvatar ? "Uploading…" : profile.avatarUrl ? "Replace image" : "Choose image"}
                      </label>
                      <span className={styles.fieldHint}>Stored securely with your account.</span>
                    </div>
                  </div>
                </Field>
                <Field label="Avatar URL" wide hint="You can also paste an HTTPS image URL."><input value={profile.avatarUrl || ""} onChange={(event) => update("avatarUrl",event.target.value)} /></Field>
              </div>
            </>
          ) : null}

          {tab === "appearance" ? (
            <>
              <PanelHeading eyebrow="DESIGN / APPEARANCE" title="Pick a point of view." />
              <div className={styles.themes}>
                {themeOptions.map((theme) => <button key={theme.id} className={`${styles.themeButton} ${theme.className} ${profile.theme === theme.id ? styles.active : ""}`} type="button" onClick={() => update("theme",theme.id)}><strong>{theme.label}</strong>{profile.theme === theme.id ? <FiCheck /> : <span>SELECT</span>}</button>)}
              </div>
              <div className={styles.accentRow}><input type="color" aria-label="Accent color" value={profile.accent} onChange={(event) => update("accent",event.target.value)} /><div><strong>Accent color</strong><br /><code>{profile.accent}</code></div></div>
            </>
          ) : null}

          {tab === "activity" ? (
            <>
              <PanelHeading eyebrow="GITHUB / ACTIVITY" title="Show what you ship." />
              <DeveloperActivityEditor
                onChange={(developerActivityValue) => update("developerActivity", developerActivityValue)}
                value={developerActivity}
              />
            </>
          ) : null}

          {tab === "settings" ? (
            <>
              <PanelHeading eyebrow="ACCOUNT / SETTINGS" title="Keep the exits visible." />
              <div className={styles.settingsBlock}>
                <div>
                  <h3>Sign-in methods</h3>
                  <p>Connect email, Google, and GitHub so any of them can open this account.</p>
                </div>
              </div>
              <LinkedSignInMethods />
              <div className={styles.settingsBlock}><div><h3>Export profile data</h3><p>Download a JSON backup for migration or conversion to the self-hosted format.</p></div><button type="button" onClick={exportProfile}><FiDownload /> Export</button></div>
              <DeleteAccountPanel
                user={user}
                handle={claimedHandle}
                disabled={activeMediaUploads > 0}
              />
              <div className={styles.settingsBlock}><div><h3>Session</h3><p>{user ? `Signed in as ${user.email || "a connected provider"}.` : "Local demo mode; no account is connected."}</p></div><button type="button" onClick={logOut} disabled={activeMediaUploads > 0}><FiLogOut /> Sign out</button></div>
              <div className={styles.settingsBlock}><div><h3>Self-host this profile</h3><p>Use your export with the stripped edition and run it on your own infrastructure.</p></div><Link href="/self-host">Open guide</Link></div>
            </>
          ) : null}

          {tab === "links" || tab === "profile" || tab === "appearance" || tab === "activity" ? (
            <>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={() => void persistProfile()}
                disabled={saving || activeMediaUploads > 0 || handleBlocksSave}
              >
                <FiSave /> {saving ? "Saving…" : activeMediaUploads > 0 ? "Uploading image…" : "Save changes"}
              </button>
              {status ? (
                <p className={styles.status} data-tone={status.tone}>
                  {status.message}
                </p>
              ) : null}
            </>
          ) : null}
        </main>

        <aside className={styles.previewPane} aria-label="Live profile preview">
          <span className={styles.previewLabel}><i /> LIVE PREVIEW</span>
          <div className={`${styles.phone} live-preview-phone`}>
            <ProfilePreview profile={profile} interactive />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PanelHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className={styles.panelHeading}><div><span>{eyebrow}</span><h1>{title}</h1></div>{action}</header>;
}

function Field({
  label,
  hint,
  hintTone = "neutral",
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  hintTone?: "neutral" | "success" | "error";
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.formField} ${wide ? styles.formFieldWide : ""}`}>
      <label>{label}</label>
      {children}
      {hint ? (
        <span className={styles.fieldHint} data-tone={hintTone}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
