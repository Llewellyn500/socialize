export function getFirebaseAuthError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const firebaseDetail =
    error instanceof Error
      ? error.message
          .replace(/^Firebase:\s*/i, "")
          .replace(/\s*\(auth\/internal-error\)\.?\s*$/i, "")
          .trim()
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
    case "auth/app-not-authorized":
      return "This preview URL is blocked by the Firebase browser API key. Add it to that key's Website restrictions, then redeploy.";
    case "auth/invalid-api-key":
      return "Firebase rejected this deployment's browser API key. Check the Vercel Preview value and redeploy.";
    case "auth/invalid-app-id":
      return "This deployment's Firebase app ID does not match its API key. Check the Vercel Firebase values and redeploy.";
    case "auth/internal-error":
      if (
        firebaseDetail &&
        firebaseDetail !== "An internal AuthError has occurred."
      ) {
        return `Firebase rejected the sign-in request: ${firebaseDetail.slice(0, 220)}`;
      }
      return "Firebase could not complete this provider sign-in. If App Check is enforced, verify its reCAPTCHA Enterprise key for this exact preview hostname. For GitHub, also verify the Firebase callback URL and client secret.";
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
    case "auth/captcha-check-failed":
    case "auth/recaptcha-not-enabled":
    case "auth/missing-recaptcha-token":
    case "auth/invalid-recaptcha-token":
      return "Firebase rejected the App Check or reCAPTCHA token. Add this exact preview hostname to the reCAPTCHA Enterprise key, then retry.";
    case "appCheck/recaptcha-error":
    case "appCheck/fetch-status-error":
    case "appCheck/throttled":
    case "appCheck/initial-throttle":
      return "App Check could not verify this preview. Confirm the reCAPTCHA Enterprise key allows this exact hostname, then retry.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Wait a few minutes before trying again.";
    case "auth/network-request-failed":
      return "The request could not reach the server. Check your connection and try again.";
    case "auth/requires-recent-login":
      return "For security, confirm your identity again, then retry.";
    case "auth/user-mismatch":
      return "That confirmation did not match this account. Try again.";
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
        if (
          error.message === "That handle is already taken." ||
          error.message.startsWith("Enter your password") ||
          error.message.startsWith("Type @") ||
          error.message.startsWith("Export your profile") ||
          error.message.startsWith("Sign out") ||
          error.message.startsWith("Sign in") ||
          error.message.startsWith("Confirm your identity") ||
          error.message.startsWith("Account deletion") ||
          error.message.startsWith("We could not delete")
        ) {
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
      if (code.startsWith("auth/") || code.startsWith("appCheck/")) {
        return `Authentication failed (${code}). Check the Firebase and App Check configuration for this deployment.`;
      }
      return "Something went wrong. Try again.";
  }
}
