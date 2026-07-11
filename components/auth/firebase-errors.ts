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
      return "An account already exists with this email. Use its original sign-in method first.";
    case "auth/operation-not-allowed":
      return "That sign-in method is not enabled in Firebase yet.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized in Firebase Authentication yet.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Wait a few minutes before trying again.";
    case "auth/network-request-failed":
      return "The request could not reach Firebase. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "For security, sign in again before continuing.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Firestore denied this change. Check the project rules for signed-in profile owners.";
    case "unavailable":
    case "firestore/unavailable":
      return "Firestore is temporarily unavailable. Check your connection and try again.";
    case "aborted":
    case "firestore/aborted":
      return "Another profile update happened at the same time. Try saving again.";
    default:
      if (error instanceof Error) {
        if (error.message === "That handle is already taken.") {
          return error.message;
        }
        if (error.message === "Firebase is not configured.") {
          return "Firebase is not configured for this deployment.";
        }
      }
      return "Something went wrong while contacting Firebase. Try again.";
  }
}
