import type { Metadata } from "next";
import Link from "next/link";
import {
  ActionBand,
  CheckItem,
  CheckList,
  CodeBlock,
  ContentSection,
  FactGrid,
  Notice,
  PageAction,
  PageHero,
  PageLayout,
  ResourceLinks,
  ServiceShell,
  Steps,
  serviceContentStyles as styles,
} from "@/components/service-content";

export const metadata: Metadata = {
  title: "Self-host Socialize",
  description:
    "Deploy the stripped Socialize profile and private link manager with your own Firebase project and domain.",
  alternates: { canonical: "/self-host" },
};

const pageNav = [
  { href: "#what-you-get", label: "What you get" },
  { href: "#before-you-start", label: "Before you start" },
  { href: "#setup", label: "Setup guide" },
  { href: "#deploy", label: "Deploy" },
  { href: "#operate", label: "Operate safely" },
];

export default function SelfHostPage() {
  return (
    <ServiceShell>
      <PageHero
        section="Self-host"
        title="Your profile. Your Firebase. Your rules."
        summary="The self-hosted edition keeps only the public profile, owner sign-in, and private link manager. It removes Socialize accounts, service marketing, and shared multi-user infrastructure."
        tone="moss"
        actions={
          <>
            <PageAction
              external
              href="https://github.com/Llewellyn500/socialize"
            >
              Open the repository
            </PageAction>
            <PageAction href="/docs#self-hosted" secondary>
              Read the data model
            </PageAction>
          </>
        }
        aside={
          <div className={styles.asideStatement}>
            <span>Self-hosted footprint</span>
            <strong>One public page. One private workspace. One profile document.</strong>
            <p>Next.js on the front, Firebase Authentication and Firestore behind it.</p>
          </div>
        }
      />

      <PageLayout nav={pageNav}>
        <ContentSection
          id="what-you-get"
          title="A deliberately smaller edition"
          lead="Use it when ownership matters more than managed convenience."
        >
          <p>
            The template lives in <code>self-hosted-template</code>. Visitors see
            your profile at <code>/</code>. Only a signed-in account whose UID has
            a matching <code>owners/&#123;uid&#125;</code> allowlist document can open
            <code>/manage</code> and publish changes.
          </p>
          <FactGrid
            facts={[
              { label: "Public route", value: <code>/</code> },
              { label: "Owner workspace", value: <code>/manage</code> },
              { label: "Sign-in route", value: <code>/login</code> },
              { label: "Firestore document", value: <code>profiles/main</code> },
            ]}
          />
          <CheckList>
            <CheckItem>
              A root <code>profile.config.ts</code> with your identity, links,
              socials, accent, and fallback profile.
            </CheckItem>
            <CheckItem>
              Email/password, Google, and GitHub owner sign-in through Firebase
              Authentication.
            </CheckItem>
            <CheckItem>
              Public reads and owner-only writes enforced in
              <code>firestore.rules</code>.
            </CheckItem>
            <CheckItem>
              A focused editor for identity, link order, visibility, and social
              profiles.
            </CheckItem>
          </CheckList>
          <Notice title="The config remains your recovery path">
            <p>
              The profile in <code>profile.config.ts</code> renders immediately
              and remains the fallback when Firebase is unavailable. After the
              first successful save, the Firestore document becomes the live
              source.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="before-you-start"
          title="Before you start"
          lead="Allow about twenty minutes for Firebase and the first deployment."
        >
          <CheckList>
            <CheckItem>Node.js 20 or newer and npm installed locally.</CheckItem>
            <CheckItem>A GitHub account, a fork of the repository, and a Vercel account.</CheckItem>
            <CheckItem>
              A Firebase project. Choose its Firestore location carefully because
              that location cannot be changed later.
            </CheckItem>
            <CheckItem>
              A domain you control, if you want a custom production address.
            </CheckItem>
          </CheckList>
          <p>
            The Firebase web configuration uses public client identifiers;
            security comes from Authentication, authorized domains, and Firestore
            rules, not from hiding those values. This starter does not need a
            Firebase Admin service-account key.
          </p>
        </ContentSection>

        <ContentSection
          id="setup"
          title="Setup, from fork to owner access"
          lead="These steps follow the files already included in the template."
        >
          <Steps
            items={[
              {
                title: "Fork and install the template",
                body: (
                  <p>
                    Fork the repository into your GitHub account, clone your fork,
                    and install dependencies from the template directory. Commit
                    the generated <code>package-lock.json</code> so cloud builds
                    use the same dependency graph.
                  </p>
                ),
                code:
                  "git clone https://github.com/YOUR_GITHUB_USER/socialize.git\ncd socialize/self-hosted-template\nnpm install",
              },
              {
                title: "Make the fallback profile yours",
                body: (
                  <p>
                    Edit <code>profile.config.ts</code>. Replace the owner email,
                    name, handle, links, social URLs, and accent color. Keep
                    <code>firestoreDocumentPath</code> at
                    <code>profiles/main</code> unless you also update the rules and
                    understand the data-path change.
                  </p>
                ),
                code:
                  'ownerEmail: "you@example.com"\nfirestoreDocumentPath: "profiles/main"',
                label: "profile.config.ts",
              },
              {
                title: "Create the Firebase web app",
                body: (
                  <>
                    <p>
                      In Firebase Console, create a project, add a Web app, then
                      create a Firestore database. Copy the six web-app values into
                      a local environment file.
                    </p>
                    <p>
                      Copy <code>.env.example</code> to <code>.env.local</code> and
                      fill every <code>NEXT_PUBLIC_FIREBASE_*</code> value. Do not
                      commit <code>.env.local</code>.
                    </p>
                  </>
                ),
                code:
                  "cp .env.example .env.local\n# Add the Firebase Web app values to .env.local",
              },
              {
                title: "Enable an owner sign-in method",
                body: (
                  <>
                    <p>
                      In Firebase Console, open Authentication, then enable at
                      least one of Email/Password, Google, or GitHub. For GitHub,
                      create an OAuth app and use Firebase&apos;s exact redirect URI,
                      such as
                      <code>https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler</code>,
                      as the GitHub authorization callback URL.
                    </p>
                    <p>
                      Add <code>localhost</code> and your production hostname to
                      Firebase Authentication&apos;s authorized domains where
                      required.
                    </p>
                  </>
                ),
              },
              {
                title: "Create the owner account",
                body: (
                  <p>
                    Create an email/password user in Firebase Console, or attempt
                    Google or GitHub sign-in once so Firebase creates that user.
                    Copy its UID from Authentication → Users. The first OAuth
                    attempt can be rejected by the manager until the allowlist
                    entry in the next step exists.
                  </p>
                ),
              },
              {
                title: "Add the owner UID to Firestore",
                body: (
                  <p>
                    In Firestore, create <code>owners/USER_UID</code> with a small
                    marker field such as <code>enabled: true</code>. The document
                    ID—not its field value—is the access grant. Browser clients
                    cannot create or change owner records under the included
                    rules.
                  </p>
                ),
                code:
                  "owners\n└── YOUR_FIREBASE_UID\n    └── enabled: true",
                label: "Firestore",
              },
              {
                title: "Deploy the Firestore rules",
                body: (
                  <p>
                    The included rules allow anyone to read the public profile and
                    allow writes only when the authenticated UID has a matching
                    owner document. Deploy those rules before using the manager
                    in production.
                  </p>
                ),
                code:
                  "npx firebase-tools@latest login\nnpx firebase-tools@latest use --add\nnpx firebase-tools@latest deploy --only firestore:rules",
              },
              {
                title: "Verify locally",
                body: (
                  <p>
                    Start the development server, check the public profile, sign in
                    at <code>/login</code>, edit one link at <code>/manage</code>,
                    and confirm the change appears in a separate signed-out window.
                  </p>
                ),
                code: "npm run dev\n# Open http://localhost:3000",
              },
            ]}
          />
        </ContentSection>

        <ContentSection
          id="deploy"
          title="Deploy on Vercel"
          lead="Vercel runs the Next.js application; Firebase continues to own authentication and profile data."
        >
          <p>
            Push your configured fork to GitHub, then import it in Vercel. Set the
            project&apos;s Root Directory to <code>self-hosted-template</code> so
            Vercel builds only the stripped edition. The framework preset should
            be detected as Next.js; no custom build command is required.
          </p>
          <CodeBlock>
            {
              "git add self-hosted-template\ngit commit -m \"Configure my Socialize profile\"\ngit push"
            }
          </CodeBlock>
          <p>
            In Vercel Project Settings → Environment Variables, add every
            <code>NEXT_PUBLIC_FIREBASE_*</code> value from <code>.env.example</code>
            for Production, Preview, and Development as appropriate. Redeploy
            after changing a value because public Next.js variables are embedded
            into the browser bundle during the build.
          </p>
          <Notice title="Two deployments protect two different things" tone="signal">
            <p>
              Vercel deploys the Next.js application. The Firebase CLI deploys
              <code>firestore.rules</code>. A successful Vercel deployment does
              not publish a local Firebase rule change.
            </p>
          </Notice>
          <h3>Connect a custom domain</h3>
          <p>
            Add the domain in Vercel after the first successful deployment and
            apply the DNS records it supplies. Then add both the production domain
            and any Vercel preview domains you intend to use to Firebase
            Authentication&apos;s authorized domains. GitHub sign-in still uses
            Firebase&apos;s <code>firebaseapp.com/__/auth/handler</code> callback URL.
          </p>
          <ResourceLinks
            links={[
              {
                external: true,
                href: "https://vercel.com/docs/frameworks/full-stack/nextjs",
                title: "Deploy Next.js on Vercel",
                description: "Official project import, build, and deployment guidance.",
              },
              {
                external: true,
                href: "https://vercel.com/docs/deployments/configure-a-build#root-directory",
                title: "Set the Vercel root directory",
                description: "Point a monorepo project at self-hosted-template.",
              },
              {
                external: true,
                href: "https://firebase.google.com/docs/auth/web/github-auth",
                title: "Firebase GitHub Authentication",
                description: "Provider setup and the required OAuth callback URL.",
              },
              {
                external: true,
                href: "https://firebase.google.com/docs/rules/manage-deploy",
                title: "Deploy Firebase Security Rules",
                description: "Official CLI commands and rule deployment guidance.",
              },
            ]}
          />
        </ContentSection>

        <ContentSection
          id="operate"
          title="Own the maintenance too"
          lead="Self-hosting transfers availability, security, and upgrade work to you."
        >
          <h3>Back up the profile</h3>
          <p>
            Keep <code>profile.config.ts</code> current enough to serve as a useful
            fallback. For production data, schedule Firestore exports or keep a
            separate machine-readable export in a private, access-controlled
            location.
          </p>
          <h3>Protect the owner boundary</h3>
          <p>
            Never create an <code>owners/&#123;uid&#125;</code> document for a visitor.
            Revoke old owners promptly, use multi-factor authentication where your
            provider supports it, and regularly review Firebase authorized domains
            and Vercel project access.
          </p>
          <h3>Take upstream updates deliberately</h3>
          <p>
            Keep your fork&apos;s changes in small commits. Review upstream diffs,
            run <code>npm run typecheck</code> and <code>npm run build</code>, then
            test sign-in, profile reads, owner writes, and a signed-out session
            before deployment.
          </p>
          <p>
            Security problems in the template can be reported through the
            <Link href="/security"> Socialize security page</Link>. Questions about
            configuration belong in the repository&apos;s issue tracker, without
            secrets or private account data.
          </p>
        </ContentSection>
      </PageLayout>

      <ActionBand
        title="Prefer the managed route?"
        copy="Use Socialize hosting when you want the same profile model without operating Firebase, Vercel deployments, or an owner allowlist yourself."
        links={[
          { href: "/sign-up", label: "Create a hosted page" },
          { href: "/docs", label: "Compare both paths" },
        ]}
      />
    </ServiceShell>
  );
}
