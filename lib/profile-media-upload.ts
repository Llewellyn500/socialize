import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

const ACCEPTED_TYPES = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const MAX_BYTES = 3 * 1024 * 1024;

export type ProfileMediaScope = "links" | "sections";

export function validateProfileMediaFile(file: File) {
  if (!ACCEPTED_TYPES.test(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
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

  const contentType = file.type === "image/jpg" ? "image/jpeg" : file.type;
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
