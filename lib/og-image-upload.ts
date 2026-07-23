import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

/** Upload a generated profile OG PNG and return its public CDN URL. */
export async function uploadProfileOgImage(uid: string, bytes: Blob | ArrayBuffer) {
  const firestoreStorage = storage;
  if (!firestoreStorage) {
    throw new Error("Cloud storage is not configured for this deployment.");
  }

  const blob =
    bytes instanceof Blob
      ? bytes
      : new Blob([new Uint8Array(bytes)], { type: "image/png" });
  if (blob.size >= 3 * 1024 * 1024) {
    throw new Error("The generated Open Graph image is too large.");
  }

  const ogRef = ref(firestoreStorage, `og/${uid}/opengraph.png`);
  await uploadBytes(ogRef, blob, {
    contentType: "image/png",
    cacheControl: "public,max-age=31536000,immutable",
  });

  const url = await getDownloadURL(ogRef);
  // Cache-bust so crawlers pick up replacements at the same storage path.
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}

export async function deleteProfileOgImage(uid: string) {
  const firestoreStorage = storage;
  if (!firestoreStorage) return;
  try {
    await deleteObject(ref(firestoreStorage, `og/${uid}/opengraph.png`));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (!code.includes("object-not-found")) throw error;
  }
}
