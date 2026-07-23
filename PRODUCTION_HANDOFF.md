# Production handoff

## Completed in this branch

- Hosted and self-hosted production builds, type checks, dependency audits,
  Firebase rule compilation, Docker configuration, and environment validation
  are release gates in CI.
- Hosted authentication supports email, Google, and GitHub with account-linking
  safeguards.
- Profile media is immutable, bounded, generation-pinned, and protected from
  stale concurrent uploads. Public object downloads are allowed; directory
  listing is not.
- Profile saves use optimistic revisions so an older browser tab cannot silently
  overwrite a newer save.
- Self-hosted media is immutable and owner-managed, with owner-only orphan
  reconciliation after a 24-hour draft grace period.
- Open Graph cards render from the current published profile rather than a
  separately mutable saved image.

## Required before the production deployment

These settings live outside the repository and must be confirmed in Vercel and
Firebase:

1. Set the real `NEXT_PUBLIC_SITE_URL`, Firebase web configuration, Google
   Analytics ID, legal entity/contact/jurisdiction values, and
   `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel.
2. Configure Firebase Auth authorized domains and the Google/GitHub OAuth
   redirect URLs for the production domain.
3. Deploy `firestore.rules` and `storage.rules` to the hosted Firebase project.
4. Grant the runtime service account only the Firestore access it needs and
   Storage object create/get/list/delete access for profile media.
5. Configure Firebase App Check, then enable enforcement only after production
   traffic shows valid tokens. Set the repository's App Check assertion flag
   only after enforcement is active.
6. Configure the Vercel WAF/rate limits described in the README before enabling
   the WAF assertion flag.
7. For each self-hosted copy, use a dedicated Firebase project, deploy the
   template rules, create the single enabled owner document, set that copy's
   Firebase environment variables, and configure its Auth domain.
8. Run the post-deploy smoke checks below against the production URL.

## Post-deploy smoke checks

- Create an email account, verify it, complete onboarding, save, publish, and
  unpublish.
- Sign in with Google and GitHub; test the same-email provider-linking path.
- Upload, replace, clear, and reorder link/section media in two browser tabs;
  confirm the stale tab gets a revision warning.
- Verify the public profile, its social card URL, robots/sitemap, legal pages,
  analytics consent behavior, account deletion, and GitHub activity controls.
- Confirm unauthenticated clients cannot list Storage profile-media paths.
- Repeat profile editing, media upload, refresh, sign-out, and public rendering
  in a freshly generated self-hosted copy.
