# Socialize

Socialize is a free, developer-first link page with two ways to use it:

- **Hosted service:** create an account, claim a handle, edit visually, and publish on the Socialize domain at no cost.
- **Self-hosted edition:** run the stripped profile and owner dashboard on your own infrastructure and domain.

The hosted product and self-hosted starter use related profile models. The
self-hosted `/manage` workspace includes a review-before-publish importer that
converts the hosted dashboard's JSON export into the stripped schema. The optional
nested `developerActivity` shape is portable between both editions; hosted icon
IDs and Firebase-hosted images are reported when they need replacement.

All current Socialize functionality is free. There are no paid product tiers,
feature gates, or sponsor-only features. If the project helps, you can
[sponsor its maintenance](https://github.com/sponsors/Llewellyn500), but
sponsorship is voluntary support rather than payment for the service.

## What is in this repository

- Editorial SaaS landing page with hosted and self-hosted paths
- Email/password, Google, and GitHub sign-in flows
- Onboarding with transactional handle reservation
- Profile, drag-sortable links, custom sections/media, GitHub activity, appearance, publish, preview, and data-export dashboard
- Public `/{handle}` profiles backed by cloud storage
- Product documentation, self-hosting guide, sponsorship, trust, and legal routes
- Database, avatar, link-media, and section-media storage rules
- Vercel-first deployment guidance, optional Docker build, and CI workflow
- A complete stripped starter in [`self-hosted-template`](./self-hosted-template)

## Local development

Requirements: Node.js 22 and npm. The repository includes .nvmrc and the
continuous-integration workflow uses Node 22.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env.local
```

Open [http://localhost:3000](http://localhost:3000). Without backend environment values, the marketing site and dashboard run in a clearly labeled local demo mode. Authentication and cloud persistence activate when the backend is configured.

Useful commands:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`lint` currently runs the strict TypeScript compiler so CI stays non-interactive. Add ESLint rules before treating formatting or code-style checks as an enforcement gate.

## Firebase setup

1. Create a Firebase project and add a Web app.
2. Enable **Email/Password**, **Google**, and **GitHub** in Authentication → Sign-in method.
3. For GitHub, create a GitHub OAuth app and copy Firebase’s callback URL into its authorization callback field. Store the GitHub client secret only in Firebase—not in this repository or a `NEXT_PUBLIC_` variable.
4. Create Firestore and Cloud Storage.
5. Copy `.env.example` to `.env.local` and fill in the public Firebase Web app values.
6. Install the Firebase CLI, select your project, and deploy rules:

```bash
npm install --global firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### Deploy Firebase policy and trusted server writes

Vercel deploys the Next.js application but does not deploy Firestore rules,
Firestore indexes, or Storage rules. Production policy deployment must be run by
an authorized Firebase CLI identity. For a CI deployment, use a dedicated
service account with only the permissions required to deploy those Firebase
resources, keep its credential in the CI secret store, and limit access to the
deployment job.

The hosted app also uses a **separate, server-only** Firebase service-account
credential for click aggregation, the abuse-report queue, GitHub activity caches,
trusted account cleanup, and server-rendered public profile metadata after App
Check enforcement. The public-profile loader still checks the handle mapping and
`published` flag explicitly because this credential bypasses Security Rules. Put
the complete JSON value in
`FIREBASE_SERVICE_ACCOUNT_JSON` in the production runtime's encrypted environment
variables (for example, Vercel Project Settings). It must never be committed,
embedded in a Docker image, exported to the browser, or use a `NEXT_PUBLIC_`
name. Grant only the Firestore document access, Cloud Storage object
create/get/list/delete,
and Firebase Authentication user get/delete access required by these flows, plus
the Firebase App Check Token Verifier role. Without it, privileged server writes
and complete account deletion fail closed instead of opening direct browser-write
rules.

Firebase Web API keys are identifiers and are expected in the browser. Your real security boundary is Authentication, Firestore/Storage rules, authorized domains, App Check, and server-side handling for any future private integration token.

Before public launch, create a Firebase App Check reCAPTCHA Enterprise provider,
set `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`, verify token issuance in a
production-like environment, and grant the runtime service account the Firebase
App Check Token Verifier role. Browser report submissions and click analytics
use one-time App Check tokens and remain disabled until this is configured; this
keeps anonymous visitors from gaining a privileged Firestore write path. Only
then enforce App Check for Firestore and Storage. The app initializes App Check
when that value is present; do not enable enforcement until the live site has
been verified or you will block legitimate users.

For production, add every deployed domain under Authentication → Settings → Authorized domains. Test account linking when the same email arrives through different providers; Firebase may return `auth/account-exists-with-different-credential`, which should lead the user through the original provider before linking the new credential.

## Data model

The MVP deliberately keeps a public profile compact:

```text
users/{uid}        private account and lifecycle metadata
profiles/{uid}     publishable ProfileConfig plus ownerUid
handles/{handle}   public handle → uid lookup, reserved transactionally
reports/{id}       write-only abuse reports for future moderation tooling
avatars/{uid}/*    user-owned Firebase Storage path
profile-media/{uid}/objects/{000..127}
```

`socialize.config.ts` documents the hosted profile contract, which hosted accounts
store in Firestore. The stripped edition has its own top-level profile schema in
`self-hosted-template/profile.config.ts`. The self-hosted manager converts a
hosted export's identity, social, section, link, and activity fields for review
before publish. Built-in hosted icon IDs are not portable image assets, and
Firebase Storage images must be re-uploaded before deleting the hosted account.

Links retain their array order and can be dragged within or between sections.
Each link and section heading accepts an optional compact icon or wide thumbnail.
Hosted image writes use an authenticated, App Check-protected server route; the
self-hosted editor supports the same controls and also accepts local `/public`
paths. Hosted objects are immutable, generation-pinned, and stored in a fixed
128-slot pool capped at 192 MiB per account. Concurrent edits cannot overwrite a
live image, public clients cannot enumerate profile-media directories, and
browser requests cannot create objects outside that bound. Before uploads, the
server compares the pool with the authoritative Firestore profile and removes
unreferenced live objects older than a 24-hour draft grace period. Object-version
and soft-delete scans are strictly bounded; retained soft-deleted generations
continue to count toward the account quota until the bucket retention period
expires. Discarded draft media is also removed during normal edit, clear, and
delete flows.

## GitHub developer activity

Profiles can optionally show recent public GitHub work. In the dashboard, an
owner controls the GitHub username, placement before or after links, commit and
coding visibility, section titles, a 1–10 commit display limit, repository/date
labels, the contribution total, yearly heatmap, month and weekday labels,
intensity legend, year selector, and language summary.

Repository selection has three modes. **Recent** samples up to three repositories
from the latest public push events. **Include** uses only selected public
`owner/repository` slugs, and **Exclude** removes selected slugs from the automatic
set. Include and exclude lists accept at most five normalized slugs. Selected
repositories are checked against current public repository metadata; unavailable
or private repositories are omitted. A sampling label is shown when upstream
pagination or repository limits mean the result is incomplete.

The server-side activity route sends the configured public username and selected
repository names to the GitHub API. Repository filters apply to commits and
languages; the contribution calendar is account-wide. With `GITHUB_TOKEN`, the
route uses GitHub's GraphQL contribution calendar — the same yearly totals,
week/day cells, and levels shown on a GitHub profile, including anonymized
private contributions when the user has enabled that on GitHub. Private
repository names and contents are never returned. Without a token it preserves the
same calendar layout using a clearly labeled recent public-event sample. This is
third-party data—not proof of ownership, endorsement, or private work.

Public event responses are revalidated every five minutes. Contribution calendars,
repository metadata, commit, and language lookups are cached for one hour. A successful route response
is cached at the CDN for five minutes and can be served stale while it revalidates
for up to one additional hour. GitHub's public event feed can itself lag by about
30 seconds to six hours. Cache hits avoid a new upstream request, while a cold
cache or refresh consumes GitHub API quota.

The hosted route applies a best-effort limit of 30 requests per 60 seconds per
source IP. This in-process control is not a complete distributed production
boundary; configure Vercel Firewall rate limiting for `/api/github-activity` and
monitor `429` responses. Without `GITHUB_TOKEN`, server requests share GitHub's
unauthenticated limit of 60 requests per hour per source IP. A token typically
raises the primary REST API limit to 5,000 requests per hour.

`GITHUB_TOKEN` is optional and server-only. It enables the full yearly
calendar and **must not have access to private repository contents**. Use a
classic token with only `read:user` (no `repo` scope), or a fine-grained token
with Profile read and no repository access — that is enough for GitHub’s
anonymized private contribution counts on the graph. Add it under **Vercel
Project Settings → Environment Variables** without a `NEXT_PUBLIC_` prefix, and
redeploy. Never store it in Firestore, put it in exported profile data, or expose
it to browser code.

The `developerActivity` object is optional and included in hosted backup exports.
The stripped template accepts that same nested shape, provides equivalent owner
controls in `/manage`, and renders the public cards, but its surrounding profile
schema is different. Its standalone GitHub route caches commits for about 15 minutes
and contribution calendars for about one hour, with the same public-only token restriction. External requests
remain off until the feature is enabled.

## Routes

| Area | Routes |
| --- | --- |
| Marketing | `/`, `/self-host`, `/docs`, `/sponsor` |
| Authentication | `/sign-up`, `/sign-in`, `/forgot-password`, `/verify-email` |
| Product | `/onboarding`, `/dashboard`, `/{handle}` |
| Trust | `/privacy`, `/terms`, `/acceptable-use`, `/cookies`, `/security`, `/report/{handle}` |

Static application routes take priority over the dynamic profile route. Reserved handles are enforced in both application code and Firestore rules.

## Self-hosting

Use [`self-hosted-template`](./self-hosted-template) when you want only:

- `/` — the public profile
- `/login` — owner sign-in
- `/manage` — the protected profile editor

It intentionally omits the Socialize marketing site, public signup, multi-tenant handles, hosted-service legal shell, analytics, and billing. Read [`self-hosted-template/README.md`](./self-hosted-template/README.md) for its Firebase owner allowlist, configuration, and deployment instructions.

## Deploy the managed app on Vercel

Import the repository in Vercel and keep the Root Directory at the repository
root. The checked-in `vercel.json` selects Next.js, installs with `npm ci`, and
runs `npm run build:vercel`, which validates the production environment before
building.

Add all values from `.env.example` in **Project Settings → Environment
Variables**. Apply them to Production, Preview, and Development as needed, then
redeploy. After the first deployment:

1. Add the Vercel production hostname and any preview hostname you use to
   Firebase Authentication → Authorized domains.
2. Set `NEXT_PUBLIC_SITE_URL=https://www.socialize.you` so canonical,
   Open Graph, sitemap, and auth-action links use the correct origin.
3. Keep Firebase rule deployment separate: Vercel deploys the Next.js app;
   `firebase deploy --only firestore:rules,firestore:indexes,storage` deploys the
   backend access policy through an authorized operator or dedicated CI
   service account.
4. Add your custom domain in Vercel, then add that final domain to Firebase
   Authentication too.
5. If public GitHub activity will be enabled, optionally add the server-only
   `GITHUB_TOKEN` for higher API limits. Do not prefix it with `NEXT_PUBLIC_`, and
   do not grant the token private-repository access.
6. Configure Vercel Firewall rate limits for the public `/api` routes, verify
   production App Check traffic and enforcement, then set
   `VERCEL_FIREWALL_CONFIGURED=true` and `FIREBASE_APP_CHECK_ENFORCED=true`.
7. Run `npm run prod:check` from a trusted network to validate required values
   and confirm that every configured contact domain publishes MX records.

For the stripped edition, import the same GitHub repository as a second Vercel
project and set its Root Directory to `self-hosted-template`.

## Pre-launch checklist

Do not invite public hosted accounts until the following have been completed and
recorded:

- [ ] Run a clean-clone install, `npm run lint`, and `npm run build` for the
  hosted app and the equivalent checks for the self-hosted template.
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://www.socialize.you`, verify HTTPS and the
  intended www redirect, then test canonical URLs and social sharing previews.
- [ ] Add every production and preview domain to Firebase Authentication
  authorized domains, and deploy Firestore rules, indexes, and Storage rules
  through a controlled identity.
- [ ] Enable and verify production abuse controls: App Check, endpoint rate
  limits, account and email-verification behavior, moderation review, backups,
  and incident handling.
- [ ] Add a least-privilege `FIREBASE_SERVICE_ACCOUNT_JSON` runtime secret and
  verify trusted click, report, GitHub-cache, account-cleanup, and media
  operations without exposing a browser-write rule.
- [ ] Configure Firebase and Vercel spend alerts, then verify the per-account
  media pool and WAF limits with production monitoring.
- [ ] Configure and send/receive a test message through every published
  `NEXT_PUBLIC_*_EMAIL` address. Do not deploy addresses on domains without
  working mail delivery.
- [ ] Set every `NEXT_PUBLIC_LEGAL_*` production value, have the rendered Terms,
  Privacy, Cookies, acceptable-use, and security pages reviewed for the operator
  and jurisdiction, and verify the contact, retention, and reporting processes.
- [ ] Test sign-up, sign-in, password reset, OAuth, email verification,
  publishing, unpublishing, exports, deletion, uploads, and a public profile in
  a signed-out browser on desktop and mobile.
- [ ] Scan browser storage and network requests in production, verify analytics
  consent behavior, and update policy language with the results.
- [ ] Verify robots.txt and sitemap.xml, set up Google Search Console, submit the
  sitemap, and decide whether profiles should be explicitly discoverable by
  search engines.

## Google Analytics

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to your GA4 web stream ID (for example,
`G-XXXXXXXXXX`) in Vercel and redeploy. The existing
`NEXT_PUBLIC_MEASURING_ID` name is also supported as a compatibility fallback.

Analytics is opt-in. The Google tag is not loaded until a visitor selects
**Allow analytics**, and the choice can be changed later with the persistent
**Privacy choices** control. Route changes send a manual `page_view` containing
only a sanitized path and title; query strings, account fields, and profile fields
are excluded. Public handles are normalized to `/:handle` (and reports to
`/report/:handle`). Advertising storage, ad personalization, and Google signals
are denied.

Because the app reports Next.js route changes itself, open the GA4 web stream's
Enhanced measurement settings, edit **Page views**, and disable **Page changes
based on browser history events**. Leaving that setting enabled can count the same
client-side navigation twice.

## Brand assets and themes

The source logo files live in `public/app-icon.svg`, `public/logo-mark.svg`, and
`public/logo-lockup.svg`. Run `npm run brand:assets` after editing the app-icon
sources to regenerate the favicon PNGs, Apple touch icon, Android icons, maskable
icon, and `public/socialize-logo.png`.

The hosted account forms and dashboard use a dark theme by default. The light/dark
toggle stores its choice in `socialize-app-theme` on the current device. The
marketing site keeps its own art direction while sharing the same `#8a2be2` brand
color and logo system. Open Graph and Twitter artwork are generated by the Next.js
routes in `app/opengraph-image.tsx` and `app/twitter-image.tsx`.

Docker remains an optional VPS path:

```bash
docker compose up --build
```

Pass Firebase public configuration through your deployment environment. Do not bake private service-account credentials into an image.

## Security and privacy notes

- Firestore rules require owner-scoped writes and only expose published profiles.
- User-supplied profile links accept `https:` and `mailto:` URLs.
- OAuth or third-party integration secrets belong in trusted server infrastructure, never profile documents.
- GitHub activity is public-only, sampled, cached, optional per profile, and keeps a public-data-only `GITHUB_TOKEN` on the server.
- Google Analytics is optional, consent-gated, and configured without advertising storage or profile/account fields.
- Before a public launch, complete the security, privacy, and operational checks
  in the [pre-launch checklist](#pre-launch-checklist), including Firebase App
  Check, distributed rate limits, moderation tooling, and emulator coverage for
  every rules branch.

The legal pages read their operator, address, governing law, venue, liability cap,
and effective date from required `NEXT_PUBLIC_LEGAL_*` production settings. The
production build validator refuses to deploy placeholder values. Configuration is
not a substitute for review by qualified counsel for your operating entity,
jurisdiction, retention schedule, subprocessors, and support process.

## Community and project governance

- [Contributing guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security policy](./SECURITY.md)
- [Support guide](./SUPPORT.md)
- [Public roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)

## Supporting Socialize

Socialize is free to use and free to self-host. Sponsorship supports
maintenance, documentation, accessibility, security work, and the self-hosted
edition. It does not unlock product features, priority support, access to user
data, or roadmap control.

Sponsor through [GitHub Sponsors](https://github.com/sponsors/Llewellyn500) or
read the [support policy](./SUPPORT.md). GitHub sponsorship metadata lives in
[.github/FUNDING.yml](./.github/FUNDING.yml).

## License

Socialize is released under the [MIT License](./LICENSE).
