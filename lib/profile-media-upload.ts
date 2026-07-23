import { auth, getLimitedUseAppCheckToken } from "@/lib/firebase";

const ACCEPTED_TYPES = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_DELETE_BATCH = 64;

export type ProfileMediaScope = "links" | "sections" | "avatars";
export type ProfileMediaDeletion = {
  scope: ProfileMediaScope;
  itemId: string;
  mediaUrl: string;
};

function resolveMediaContentType(file: File) {
  if (file.type === "image/jpg") return "image/jpeg";
  if (file.type && ACCEPTED_TYPES.test(file.type)) return file.type;
  return file.type;
}

export function validateProfileMediaFile(file: File) {
  const contentType = resolveMediaContentType(file);
  if (!ACCEPTED_TYPES.test(contentType)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size >= MAX_BYTES) {
    throw new Error("Link and heading images must be smaller than 3 MB.");
  }
}

async function trustedMediaHeaders(uid: string) {
  const user = auth?.currentUser;
  if (!user || user.uid !== uid) {
    throw new Error("Sign in again before changing profile images.");
  }

  const [idToken, appCheckToken] = await Promise.all([
    user.getIdToken(),
    getLimitedUseAppCheckToken(),
  ]);
  return {
    Authorization: `Bearer ${idToken}`,
    ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
  };
}

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  return new Error(body?.error || fallback);
}

export async function uploadProfileMedia(
  uid: string,
  scope: ProfileMediaScope,
  itemId: string,
  file: File,
) {
  validateProfileMediaFile(file);
  const formData = new FormData();
  formData.set("scope", scope);
  formData.set("itemId", itemId);
  formData.set("file", file);

  const response = await fetch("/api/profile-media", {
    method: "POST",
    cache: "no-store",
    headers: await trustedMediaHeaders(uid),
    body: formData,
  });
  if (!response.ok) {
    throw await responseError(response, "The image upload failed.");
  }

  const result = (await response.json()) as { mediaUrl?: unknown };
  if (typeof result.mediaUrl !== "string" || !result.mediaUrl.startsWith("https://")) {
    throw new Error("The image service returned an invalid URL.");
  }
  return result.mediaUrl;
}

export async function deleteProfileMediaBatch(
  uid: string,
  items: ProfileMediaDeletion[],
) {
  if (!items.length) return;

  for (let index = 0; index < items.length; index += MAX_DELETE_BATCH) {
    const response = await fetch("/api/profile-media", {
      method: "DELETE",
      cache: "no-store",
      headers: {
        ...(await trustedMediaHeaders(uid)),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.slice(index, index + MAX_DELETE_BATCH),
      }),
    });
    if (!response.ok) {
      throw await responseError(
        response,
        "An obsolete profile image could not be removed.",
      );
    }
  }
}

export async function deleteProfileMedia(
  uid: string,
  scope: ProfileMediaScope,
  itemId: string,
  mediaUrl: string,
) {
  await deleteProfileMediaBatch(uid, [{ scope, itemId, mediaUrl }]);
}
