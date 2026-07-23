type StorageObjectIdentity = {
  bucket: string;
  objectPath: string;
  generation: string;
};

function parseStorageObject(value: string | undefined): StorageObjectIdentity | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase();
    let bucket = "";
    let objectPath = "";

    if (hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      bucket = decodeURIComponent(match[1]);
      objectPath = decodeURIComponent(match[2]);
    } else if (hostname === "storage.googleapis.com") {
      const match = url.pathname.match(/^\/([^/]+)\/(.+)$/);
      if (!match) return null;
      bucket = decodeURIComponent(match[1]);
      objectPath = decodeURIComponent(match[2]);
    } else {
      return null;
    }

    if (!bucket || !objectPath) return null;
    return {
      bucket,
      objectPath,
      generation: url.searchParams.get("generation") ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Stable identity for a Firebase/Google Cloud Storage object. Download tokens,
 * query ordering, and unrelated cache parameters do not change object identity.
 * Generation remains part of the identity because hosted pool paths are reused.
 */
export function profileMediaIdentity(value: string | undefined) {
  const parsed = parseStorageObject(value);
  if (!parsed) return "";
  return `${parsed.bucket}\n${parsed.objectPath}\n${parsed.generation}`;
}

export function sameProfileMediaObject(
  left: string | undefined,
  right: string | undefined,
) {
  if (!left || !right) return left === right;
  const leftIdentity = profileMediaIdentity(left);
  const rightIdentity = profileMediaIdentity(right);
  if (leftIdentity || rightIdentity) {
    return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
  }
  return left === right;
}
