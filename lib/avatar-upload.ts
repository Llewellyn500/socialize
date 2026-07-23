import { deleteObject, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { uploadProfileMedia } from "@/lib/profile-media-upload";

const ACCEPTED_TYPES = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const MAX_BYTES = 3 * 1024 * 1024;

export function validateAvatarFile(file: File) {
  if (!ACCEPTED_TYPES.test(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size >= MAX_BYTES) {
    throw new Error("Avatar images must be smaller than 3 MB.");
  }
}

/** Upload an avatar to Firebase Storage and return its public download URL. */
export async function uploadUserAvatar(uid: string, file: File) {
  validateAvatarFile(file);
  return uploadProfileMedia(uid, "avatars", "avatar", file);
}

export async function deleteObsoleteAvatarFiles(
  uid: string,
  options: { keepCurrent: boolean },
) {
  const firestoreStorage = storage;
  if (!firestoreStorage) return;
  const paths = [
    "avatar.jpg",
    "avatar.jpeg",
    "avatar.png",
    "avatar.webp",
    "avatar.gif",
    ...(options.keepCurrent ? [] : ["avatar"]),
  ];
  await Promise.all(
    paths.map(async (fileName) => {
      try {
        await deleteObject(ref(firestoreStorage, `avatars/${uid}/${fileName}`));
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "";
        if (!code.includes("object-not-found")) throw error;
      }
    }),
  );
}
