export function getFirebaseAuthError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "That email and password do not match. Check both fields and try again.";
    case "auth/email-already-in-use":
      return "An account already uses that email. Sign in instead, or reset your password.";
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Enter a complete email address, such as you@example.com.";
    case "auth/missing-password":
      return "Enter your password to continue.";
    case "auth/weak-password":
      return "Use a stronger password with at least 8 characters.";
    case "auth/popup-closed-by-user":
      return "The sign-in window was closed before authentication finished.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
      return "A newer sign-in window replaced this one. Finish the open sign-in request.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email. Sign in with your existing method to link the new one.";
    case "auth/credential-already-in-use":
      return "That sign-in method is already linked to another account.";
    case "auth/provider-already-linked":
      return "That sign-in method is already linked to this account.";
    case "auth/operation-not-allowed":
      return "That sign-in method is not enabled yet.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in yet.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Wait a few minutes before trying again.";
    case "auth/network-request-failed":
      return "The request could not reach the server. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "For security, sign in again before continuing.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "You do not have permission to make this change.";
    case "unavailable":
    case "firestore/unavailable":
      return "Profile storage is temporarily unavailable. Check your connection and try again.";
    case "aborted":
    case "firestore/aborted":
      return "Another profile update happened at the same time. Try saving again.";
    case "invalid-argument":
    case "firestore/invalid-argument":
      return "The profile data was rejected. Check the fields and try again.";
    default:
      if (error instanceof Error) {
        if (error.message === "That handle is already taken.") {
          return error.message;
        }
        if (
          error.message === "Firebase is not configured." ||
          error.message === "Accounts are not configured."
        ) {
          return "Accounts are not configured for this deployment.";
        }
        if (/Unsupported field value: undefined/i.test(error.message)) {
          return "The profile data was rejected. Check the fields and try again.";
        }
      }
      return "Something went wrong. Try again.";
  }
}
