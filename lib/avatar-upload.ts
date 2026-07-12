import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

const ACCEPTED_TYPES = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateAvatarFile(file: File) {
  if (!ACCEPTED_TYPES.test(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Avatar images must be smaller than 5 MB.");
  }
}

/** Upload an avatar to Firebase Storage and return its public download URL. */
export async function uploadUserAvatar(uid: string, file: File) {
  const firestoreStorage = storage;
  if (!firestoreStorage) {
    throw new Error("Cloud storage is not configured for this deployment.");
  }

  validateAvatarFile(file);

  const contentType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const extension = extensionByType[contentType] ?? "jpg";
  const avatarRef = ref(firestoreStorage, `avatars/${uid}/avatar.${extension}`);

  await uploadBytes(avatarRef, file, {
    contentType,
    cacheControl: "public,max-age=3600",
  });

  return getDownloadURL(avatarRef);
}
