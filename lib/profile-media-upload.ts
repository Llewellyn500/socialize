import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

const ACCEPTED_TYPES = /^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/i;
const MAX_BYTES = 3 * 1024 * 1024;

export type ProfileMediaScope = "links" | "sections";

function resolveMediaContentType(file: File) {
  if (file.type === "image/jpg") return "image/jpeg";
  if (file.type && ACCEPTED_TYPES.test(file.type)) return file.type;
  if (/\.svg$/i.test(file.name)) return "image/svg+xml";
  return file.type;
}

export function validateProfileMediaFile(file: File) {
  const contentType = resolveMediaContentType(file);
  if (!ACCEPTED_TYPES.test(contentType)) {
    throw new Error("Use a JPEG, PNG, WebP, GIF, or SVG image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Link and heading images must be smaller than 3 MB.");
  }
}

export async function uploadProfileMedia(
  uid: string,
  scope: ProfileMediaScope,
  itemId: string,
  file: File,
) {
  const firestoreStorage = storage;
  if (!firestoreStorage) {
    throw new Error("Cloud storage is not configured for this deployment.");
  }

  validateProfileMediaFile(file);
  const safeItemId = itemId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  if (!safeItemId) throw new Error("This item needs a valid ID before an image can be uploaded.");

  const contentType = resolveMediaContentType(file);
  const mediaRef = ref(
    firestoreStorage,
    `profile-media/${uid}/${scope}/${safeItemId}/media`,
  );
  await uploadBytes(mediaRef, file, {
    contentType,
    cacheControl: "public,max-age=3600",
  });
  return getDownloadURL(mediaRef);
}
