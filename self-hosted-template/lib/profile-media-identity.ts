type StorageObjectIdentity = {
  bucket: string;
  objectPath: string;
};

function decodePath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function firebaseStorageObjectIdentity(
  value?: string
): StorageObjectIdentity | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;

    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/^\/v\d+\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      const bucket = decodePath(match[1]).toLowerCase();
      const objectPath = decodePath(match[2]);
      return bucket && objectPath ? { bucket, objectPath } : null;
    }

    if (url.hostname === "storage.googleapis.com") {
      const match = url.pathname.match(/^\/([^/]+)\/(.+)$/);
      if (!match) return null;
      const bucket = decodePath(match[1]).toLowerCase();
      const objectPath = decodePath(match[2]);
      return bucket && objectPath ? { bucket, objectPath } : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function profileMediaIdentity(value?: string): string {
  const identity = firebaseStorageObjectIdentity(value);
  return identity
    ? `${identity.bucket}\n${identity.objectPath}`
    : "";
}

export function profileMediaIdentityFromPath(
  bucket: string,
  objectPath: string
): string {
  return bucket && objectPath
    ? `${bucket.toLowerCase()}\n${objectPath}`
    : "";
}

export function sameProfileMediaObject(
  left?: string,
  right?: string
): boolean {
  if (!left || !right) return left === right;

  const leftIdentity = profileMediaIdentity(left);
  const rightIdentity = profileMediaIdentity(right);
  return leftIdentity || rightIdentity
    ? Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity)
    : left === right;
}
