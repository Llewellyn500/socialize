"use client";

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  if (!db) return;

  const handle = normalizeHandle(input.handle);
  const targetId = input.targetId.trim().slice(0, 80);
  if (!handle || !targetId) return;

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

  const handleSnap = await getDoc(doc(db, "handles", handle));
  if (!handleSnap.exists()) return;
  const uid = handleSnap.data().uid as string | undefined;
  if (!uid) return;

  const statsRef = doc(db, "profileStats", uid);
  const linkPath = input.kind === "link" ? "links" : "socials";

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(statsRef);
    const now = serverTimestamp();

    if (!snap.exists()) {
      transaction.set(statsRef, {
        handle,
        totalClicks: 1,
        links: input.kind === "link" ? { [targetId]: { clicks: 1, lastClickAt: now } } : {},
        socials: input.kind === "social" ? { [targetId]: { clicks: 1, lastClickAt: now } } : {},
        updatedAt: now,
      });
      return;
    }

    const data = snap.data() as ProfileStats & {
      links?: Record<string, { clicks?: number }>;
      socials?: Record<string, { clicks?: number }>;
    };
    const bucket = input.kind === "link" ? data.links ?? {} : data.socials ?? {};
    const previous = bucket[targetId]?.clicks ?? 0;

    transaction.update(statsRef, {
      handle,
      totalClicks: (data.totalClicks ?? 0) + 1,
      updatedAt: now,
      [`${linkPath}.${targetId}.clicks`]: previous + 1,
      [`${linkPath}.${targetId}.lastClickAt`]: now,
    });
  });
}

