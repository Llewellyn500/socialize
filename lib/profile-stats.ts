"use client";

import {
  doc,
  getDoc,
  type Timestamp,
} from "firebase/firestore";
import { db, getLimitedUseAppCheckToken } from "@/lib/firebase";
import { normalizeHandle } from "@/lib/profile";
import { isSocialKey } from "@/lib/socials";

export { isSocialKey };

export type LinkClickStat = {
  clicks: number;
  lastClickAt?: string;
};

export type ProfileStats = {
  handle: string;
  totalClicks: number;
  links: Record<string, LinkClickStat>;
  socials: Record<string, LinkClickStat>;
  updatedAt?: string;
};

function toIso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as Timestamp).toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeStats(handle: string, data: Record<string, unknown> | undefined): ProfileStats {
  const linksRaw = (data?.links ?? {}) as Record<string, { clicks?: number; lastClickAt?: unknown }>;
  const socialsRaw = (data?.socials ?? {}) as Record<string, { clicks?: number; lastClickAt?: unknown }>;

  const links: Record<string, LinkClickStat> = {};
  for (const [id, entry] of Object.entries(linksRaw)) {
    links[id] = {
      clicks: typeof entry?.clicks === "number" ? entry.clicks : 0,
      lastClickAt: toIso(entry?.lastClickAt),
    };
  }

  const socials: Record<string, LinkClickStat> = {};
  for (const [id, entry] of Object.entries(socialsRaw)) {
    socials[id] = {
      clicks: typeof entry?.clicks === "number" ? entry.clicks : 0,
      lastClickAt: toIso(entry?.lastClickAt),
    };
  }

  return {
    handle,
    totalClicks: typeof data?.totalClicks === "number" ? data.totalClicks : 0,
    links,
    socials,
    updatedAt: toIso(data?.updatedAt),
  };
}

export async function loadProfileStats(uid: string): Promise<ProfileStats | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, "profileStats", uid));
  if (!snapshot.exists()) {
    return {
      handle: "",
      totalClicks: 0,
      links: {},
      socials: {},
    };
  }
  return normalizeStats(
    String(snapshot.data().handle ?? ""),
    snapshot.data() as Record<string, unknown>,
  );
}

type ClickKind = "link" | "social";

/** Fire-and-forget click increment for a published public profile. */
export async function recordProfileClick(input: {
  handle: string;
  targetId: string;
  kind: ClickKind;
}) {
  const handle = normalizeHandle(input.handle);
  const targetId = input.targetId.trim().slice(0, 80);
  if (
    !handle ||
    !targetId ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(targetId) ||
    (input.kind !== "link" && input.kind !== "social")
  ) {
    return;
  }

  // Avoid double-counting rapid duplicate clicks in the same tab.
  const dedupeKey = `socialize-click:${handle}:${input.kind}:${targetId}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
    window.setTimeout(() => {
      try {
        sessionStorage.removeItem(dedupeKey);
      } catch {
        // ignore
      }
    }, 1500);
  } catch {
    // sessionStorage may be unavailable
  }

  // Analytics never blocks navigation. The server route owns aggregation so
  // public visitors cannot write arbitrary Firestore documents directly.
  const appCheckToken = await getLimitedUseAppCheckToken();
  if (!appCheckToken) return;

  await fetch("/api/profile-click", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-AppCheck": appCheckToken,
    },
    body: JSON.stringify({ handle, targetId, kind: input.kind }),
  });
}

