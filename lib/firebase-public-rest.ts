/**
 * Builds a Firebase Rules-aware public Firestore REST URL. The Web API key is
 * intentionally included as an identifier, not a secret; Firestore rules still
 * decide whether the requested document is readable.
 */
export function firebasePublicDocumentUrl(path: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return "";

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/${path.replace(/^\/+/, "")}`;
  return apiKey ? `${url}?key=${encodeURIComponent(apiKey)}` : url;
}
