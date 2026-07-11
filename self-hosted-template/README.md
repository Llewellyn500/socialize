# Socialize self-hosted

A stripped-down developer profile with three routes:

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Your profile, social accounts, and primary links |
| `/login` | Owner only | Email, Google, or GitHub authentication through Firebase |
| `/manage` | Owner only | Edit, reorder, hide, and publish links |

There is no marketing homepage, customer signup, analytics, or legal-site bundle in this edition. It is intended for one owner and one public profile.

## Run locally

Requirements: Node.js 22 or newer and a Firebase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Edit [`profile.config.ts`](./profile.config.ts) before you deploy. It is the single source for owner identity, the Firestore document path, profile copy, social accounts, and fallback links.

For a local avatar, add `public/avatar.jpg` and set `avatarUrl` to `/avatar.jpg`. This avoids a third-party image request from every visitor.

The profile in that file renders even before Firebase is configured. After the first save from `/manage`, Firestore becomes the live source. To return to the file-based profile, delete the configured document (default: `profiles/main`) in Firestore.

## Connect Firebase

1. Create a Firebase project and add a Web app.
2. Create a Cloud Firestore database.
3. Copy the Web app values into `.env.local`.
4. In **Authentication > Sign-in method**, enable the providers you want:
   - Email/Password
   - Google
   - GitHub
5. Add every deployed hostname to **Authentication > Settings > Authorized domains**.

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
npx firebase-tools deploy --only firestore:rules
```

Keep `firestoreDocumentPath` under `profiles/<document-id>` unless you also update `firestore.rules`.

## Deploy the app

### Vercel

1. Push your fork to GitHub and import it in Vercel.
2. Set **Root Directory** to `self-hosted-template`.
3. Keep the detected Next.js framework preset and default build command.
4. Add every variable from `.env.example` under **Project Settings → Environment Variables** for Production, Preview, and Development as needed.
5. Deploy, then add the resulting `*.vercel.app` hostname and your custom domain to Firebase Authentication → Authorized domains.
6. Redeploy after changing any `NEXT_PUBLIC_` value because those values are embedded at build time.

Vercel deploys the application but does not deploy `firestore.rules`. Run the Firebase CLI rule command separately whenever those rules change.

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
- A saved Firestore profile overrides the root config until the document is deleted.
- The template stores no analytics or visitor identifiers.
- Revoke an owner by deleting `owners/{uid}` or disabling that Firebase user.
