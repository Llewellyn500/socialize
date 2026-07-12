# Socialize

Socialize is a developer-first link page with two ways to use it:

- **Hosted service:** create an account, claim a handle, edit visually, and publish on the Socialize domain.
- **Self-hosted edition:** run the stripped profile and owner dashboard on your own infrastructure and domain.

The hosted product and self-hosted starter share the same portable `ProfileConfig` shape. That makes export a real exit path instead of a marketing promise.

## What is in this repository

- Editorial SaaS landing page with hosted and self-hosted paths
- Email/password, Google, and GitHub sign-in flows
- Onboarding with transactional handle reservation
- Profile, links, appearance, publish, preview, and data-export dashboard
- Public `/{handle}` profiles backed by cloud storage
- Product documentation, self-hosting guide, sponsorship, trust, and legal routes
- Database and avatar storage rules
- Vercel-first deployment guidance, optional Docker build, and CI workflow
- A complete stripped starter in [`self-hosted-template`](./self-hosted-template)

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
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

Firebase Web API keys are identifiers and are expected in the browser. Your real security boundary is Authentication, Firestore/Storage rules, authorized domains, App Check, and server-side handling for any future private integration token.

For production, add every deployed domain under Authentication → Settings → Authorized domains. Test account linking when the same email arrives through different providers; Firebase may return `auth/account-exists-with-different-credential`, which should lead the user through the original provider before linking the new credential.

## Data model

The MVP deliberately keeps a public profile compact:

```text
users/{uid}        private account and lifecycle metadata
profiles/{uid}     publishable ProfileConfig plus ownerUid
handles/{handle}   public handle → uid lookup, reserved transactionally
reports/{id}       write-only abuse reports for future moderation tooling
avatars/{uid}/*    user-owned Firebase Storage path
```

`socialize.config.ts` documents the portable profile contract. Hosted accounts store that shape in Firestore. The self-hosted edition treats its root config as the initial seed and import/export format; a deployed browser editor cannot safely rewrite a TypeScript file on disk.

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
root. Vercel detects Next.js automatically, so the default `npm run build`
command and output settings are sufficient.

Add all values from `.env.example` in **Project Settings → Environment
Variables**. Apply them to Production, Preview, and Development as needed, then
redeploy. After the first deployment:

1. Add the Vercel production hostname and any preview hostname you use to
   Firebase Authentication → Authorized domains.
2. Set `NEXT_PUBLIC_SITE_URL` to the production `https://` URL so canonical,
   Open Graph, sitemap, and auth-action links use the correct origin.
3. Keep Firebase rule deployment separate: Vercel deploys the Next.js app;
   `firebase deploy --only firestore:rules,firestore:indexes,storage` deploys the
   backend access policy.
4. Add your custom domain in Vercel, then add that final domain to Firebase
   Authentication too.

For the stripped edition, import the same GitHub repository as a second Vercel
project and set its Root Directory to `self-hosted-template`.

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
- Google Analytics is optional, consent-gated, and configured without advertising storage or profile/account fields.
- Before a public launch, add Firebase App Check, rate limiting for reports and handle attempts, email verification enforcement, moderation tooling, account deletion automation, and emulator tests for every rules branch.

The included legal pages are product-specific starter drafts, not legal advice. Review them for your operating entity, jurisdiction, retention schedule, subprocessors, and support contact before launch.

## Sponsoring

Socialize is open source and accepts sponsorship for maintenance, documentation, accessibility, and the self-hosted edition. GitHub sponsorship metadata lives in [`.github/FUNDING.yml`](./.github/FUNDING.yml).

## License

No license was present in the original repository, so this work does not invent one. Add an explicit `LICENSE` before describing the code as legally reusable outside the permissions GitHub grants for viewing and forking.
