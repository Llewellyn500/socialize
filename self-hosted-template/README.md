# Socialize self-hosted

A stripped-down developer profile with three routes:

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Your profile, links, and optional public GitHub activity |
| `/login` | Owner only | Email, Google, or GitHub authentication through Firebase |
| `/manage` | Owner only | Edit, reorder, hide, and publish profile content |
| `/api/github-activity` | Public API | Cached public commit and coding activity data |

There is no marketing homepage, customer signup, analytics, or legal-site bundle in this edition. It is intended for one owner and one public profile.

## Run locally

Requirements: Node.js 22 or newer and a Firebase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Edit [`profile.config.ts`](./profile.config.ts) before you deploy. It is the single source for owner identity, the Firestore document path, profile copy, social accounts, fallback sections and links, and developer activity defaults.

For a local avatar, add `public/avatar.jpg` and set `avatarUrl` to `/avatar.jpg`. This avoids a third-party image request from every visitor.

The profile in that file renders even before Firebase is configured. After the first save from `/manage`, Firestore becomes the live source. To return to the file-based profile, delete the configured document (default: `profiles/main`) in Firestore.

## Arrange links and headings

The private `/manage` workspace lets the owner drag links into any order and move
them between custom sections. Arrow buttons and a section selector provide the
same operations without dragging. Every link and section heading can optionally
use a compact icon or wide thumbnail. Uploads accept JPEG, PNG, WebP, or GIF files
up to 3 MB. You can also use an `https://` image URL or a local file placed under
`public/` and referenced as `/filename.png`. Section text remains the accessible
name even when the image is used as the visible heading.

## Show GitHub activity

Open `/manage`, then use **Developer activity** to control:

- whether the section is visible;
- the GitHub username and placement before or after primary links;
- automatic recent repositories, an include list, or an exclude list (up to five `owner/repository` names);
- recent commit visibility, heading, 1 to 10 item limit, repository names, and dates;
- contribution visibility, heading, total, yearly grid, month/weekday labels, legend, year selector, and language summary.

The server route requests public commits and public repository metadata from GitHub. Commit data is cached for about 15 minutes and contribution calendars for about one hour; the route applies a best-effort limit of 30 requests per source IP per minute. Add a Vercel Firewall rate-limit rule for distributed production enforcement. Without a token, the yearly grid is a clearly labeled recent public sample. For a complete public contribution calendar, add an optional server-only `GITHUB_TOKEN` to `.env.local` and Vercel. Do not add `NEXT_PUBLIC_` to its name, and do not grant it private repository access.

The language list counts primary languages in the account's recently pushed, non-archived public repositories. When GitHub returns more commits than the API sampling limit, the public profile labels the chart as a sample.

## Connect Firebase

1. Create a Firebase project and add a Web app.
2. Create a Cloud Firestore database.
3. Create a Firebase Storage bucket for optional link and heading uploads.
4. Copy the Web app values into `.env.local`.
5. In **Authentication > Sign-in method**, enable the providers you want:
   - Email/Password
   - Google
   - GitHub
6. Add every deployed hostname to **Authentication > Settings > Authorized domains**.

For GitHub authentication, create a GitHub OAuth App and use Firebase's callback URL:

```text
https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler
```

The login page does not create a general user base. It signs in a Firebase user, then accepts only users whose UID exists in the private owner allowlist.

## Create the owner

1. Create an Email/Password user in Firebase Console, or attempt Google/GitHub sign-in once so Firebase creates the provider user.
2. Open **Authentication > Users** and copy that user's UID.
3. Open Firestore and create a collection named `owners`.
4. Create a document whose document ID is the copied UID. Add a field such as `enabled: true`; the field value is informational because the document's existence grants access.
5. Use the same email in `profile.config.ts`, then sign in again.

Do not allow browser clients to create or edit `owners` documents. The included rules deny those writes. Firebase Web app values beginning with `NEXT_PUBLIC_` are public identifiers, not server credentials.

## Deploy the security rules

The included rules allow anyone to read the public profile document. Profile writes require an authenticated UID with a matching `owners/{uid}` document. Each user can read only their own owner record, and no browser client can write the owner collection.

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules,storage
```

The first Storage rules deployment may ask you to enable the Firebase Rules
permission that lets Storage check the Firestore owner allowlist. Accept that
cross-service permission so uploads can verify `owners/{uid}`.

Keep `firestoreDocumentPath` under `profiles/<document-id>` unless you also update `firestore.rules`.

## Deploy the app

### Vercel

1. Push your fork to GitHub and import it in Vercel.
2. Set **Root Directory** to `self-hosted-template`.
3. Keep the detected Next.js framework preset and default build command.
4. Add every variable from `.env.example` under **Project Settings → Environment Variables** for Production, Preview, and Development as needed.
5. Deploy, then add the resulting `*.vercel.app` hostname and your custom domain to Firebase Authentication → Authorized domains.
6. Redeploy after changing any `NEXT_PUBLIC_` value because those values are embedded at build time.

Vercel deploys the application but does not deploy `firestore.rules` or `storage.rules`. Run the Firebase CLI rule command separately whenever those rules change.

### Docker (optional VPS path)

Docker Compose reads build values from `.env`, so copy the example and fill it in:

```bash
cp .env.example .env
docker compose up --build -d
```

On a public server, put the container behind an HTTPS reverse proxy and add the final domain to Firebase Authorized domains.

## Useful commands

```bash
npm run lint       # TypeScript check
npm run build      # Production build
npm run start      # Run the production build
```

## Data and security notes

- Public Firestore read access is intentional because `/` is a public profile.
- Client route guards improve the experience, but `firestore.rules` is the real write boundary.
- Firestore checks one owner allowlist document when authorizing a profile write.
- Storage rules keep link and section uploads owner-writable and publicly readable for profile rendering.
- A saved Firestore profile overrides the root config until the document is deleted.
- Developer activity requests only public GitHub data and never sends `GITHUB_TOKEN` to the browser.
- The template stores no analytics or visitor identifiers.
- Revoke an owner by deleting `owners/{uid}` or disabling that Firebase user.
