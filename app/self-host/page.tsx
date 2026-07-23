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
    "Deploy the stripped Socialize profile and private link manager on your own infrastructure and domain.",
  alternates: { canonical: "/self-host" },
};

const pageNav = [
  { href: "#what-you-get", label: "What you get" },
  { href: "#before-you-start", label: "Before you start" },
  { href: "#activity", label: "GitHub activity" },
  { href: "#migrate", label: "Move your profile" },
  { href: "#setup", label: "Setup guide" },
  { href: "#deploy", label: "Deploy" },
  { href: "#operate", label: "Operate safely" },
];

export default function SelfHostPage() {
  return (
    <ServiceShell>
      <PageHero
        section="Self-host"
        title="Your profile. Your stack. Your rules."
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
            <p>Next.js on the front, secure sign-in and a profile database behind it.</p>
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
            a matching <code>owners/&#123;uid&#125;</code> allowlist document with
            <code> enabled: true</code> can open <code>/manage</code> and publish
            changes.
          </p>
          <FactGrid
            facts={[
              { label: "Public route", value: <code>/</code> },
              { label: "Owner workspace", value: <code>/manage</code> },
              { label: "Sign-in route", value: <code>/login</code> },
              { label: "Profile document", value: <code>profiles/main</code> },
            ]}
          />
          <CheckList>
            <CheckItem>
              A root <code>profile.config.ts</code> with your identity, sections,
              links, socials, accent, and fallback profile.
            </CheckItem>
            <CheckItem>
              Email/password, Google, and GitHub owner sign-in through your
              configured authentication provider.
            </CheckItem>
            <CheckItem>
              Public reads and owner-only writes enforced in
              <code>firestore.rules</code>.
            </CheckItem>
            <CheckItem>
              A focused editor for identity, drag-sortable sections and links,
              optional icons or thumbnails, visibility, and social profiles.
            </CheckItem>
            <CheckItem>
              Optional public GitHub commit and coding activity with repository,
              placement, sampling, and display controls.
            </CheckItem>
            <CheckItem>
              A review-before-publish importer for JSON exported from the hosted
              Socialize dashboard.
            </CheckItem>
          </CheckList>
          <Notice title="The config remains your recovery path">
            <p>
              The profile in <code>profile.config.ts</code> renders immediately
              and remains the fallback when the cloud backend is unavailable. After the
              first successful save, the saved profile record becomes the live
              source.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="before-you-start"
          title="Before you start"
          lead="Allow about twenty minutes for backend setup and the first deployment."
        >
          <CheckList>
            <CheckItem>Node.js 22 and npm installed locally.</CheckItem>
            <CheckItem>A GitHub account, a fork of the repository, and a Vercel account.</CheckItem>
            <CheckItem>
              A dedicated cloud backend project used only by this self-hosted
              profile. Choose its database location carefully because that location
              cannot be changed later.
            </CheckItem>
            <CheckItem>
              A domain you control, if you want a custom production address.
            </CheckItem>
            <CheckItem>
              An optional fine-grained <code>GITHUB_TOKEN</code> with no access to
              private repositories if you need higher public API limits.
            </CheckItem>
          </CheckList>
          <p>
            The backend web configuration uses public client identifiers;
            security comes from sign-in setup, authorized domains, and database
            rules, not from hiding those values. This starter does not need a
            server admin credential.
          </p>
          <Notice title="Do not reuse another application's backend project" tone="warning">
            <p>
              The included Firestore and Storage rules are the complete policy for
              the template&apos;s collections and upload paths. Deploying them into a
              shared project can expose profile documents or block an unrelated
              application. Create a dedicated project before deploying either
              rules file.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="activity"
          title="Configure public GitHub activity"
          lead="The profile can show sampled public work without putting a GitHub credential in the browser."
        >
          <p>
            In <code>/manage</code>, enable developer activity, enter the public
            GitHub username, choose placement before or after links, and control
            commit history and coding activity independently. Commit controls cover
            the heading, 1–10 item limit, repository labels, and dates. Contribution
            controls cover the yearly total, calendar, month and weekday labels,
            legend, year selector, and languages.
          </p>
          <h3>Select repositories deliberately</h3>
          <p>
            Recent mode automatically samples up to three currently public
            repositories from recent push activity. Include mode uses only up to
            five selected <code>owner/repository</code> slugs. Exclude mode removes
            up to five selected slugs from the automatic set. Private or unavailable
            repositories are omitted.
          </p>
          <p>
            The server route processes the public username, commit SHA and first-line
            message, repository and URL, commit date, push-day counts, and repository
            languages. Results come from GitHub, are not ownership verification, and
            may be sampled, delayed, incomplete, or unavailable. GitHub&apos;s public
            event feed can lag by about 30 seconds to six hours.
          </p>
          <p>
            The stripped edition caches commit data for about 15 minutes and full
            contribution calendars for about one hour. Without a token, it shows a
            clearly labeled recent public sample in the same yearly grid. Add a Vercel Firewall rate-limit rule for
            <code> /api/github-activity</code> on a public deployment. If you add the
            optional server-only <code>GITHUB_TOKEN</code>, it enables the complete
            public contribution calendar, must not have private repository access,
            and must never use a <code>NEXT_PUBLIC_</code> prefix.
          </p>
          <Notice title="GitHub remains a third-party source">
            <p>
              Activity cards do not prove account ownership, affiliation,
              employment, endorsement, or a complete contribution history. Only
              associate a GitHub identity you are authorized to represent.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="migrate"
          title="Move a hosted profile without rebuilding it"
          lead="The private manager converts the hosted export into the stripped profile model."
        >
          <Steps
            items={[
              {
                title: "Export from hosted Socialize",
                body: (
                  <p>
                    Open Settings in the hosted dashboard and download the profile
                    JSON export.
                  </p>
                ),
              },
              {
                title: "Import into the private manager",
                body: (
                  <p>
                    Sign in at <code>/manage</code>, choose
                    <strong> Import hosted JSON</strong>, and select the downloaded
                    file. The import remains local draft state until you publish.
                  </p>
                ),
              },
              {
                title: "Review and publish",
                body: (
                  <p>
                    Check identity, socials, section order, links, and developer
                    activity, then publish. The importer reports hosted icon choices
                    that need replacement and Firebase images that still depend on
                    the old project.
                  </p>
                ),
              },
              {
                title: "Move uploaded images",
                body: (
                  <p>
                    Re-upload any hosted avatar, link image, or section image to
                    the dedicated self-hosted Firebase project before deleting the
                    hosted account.
                  </p>
                ),
              },
            ]}
          />
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
                    Edit <code>profile.config.ts</code>. Replace the name, handle,
                    sections, links, social URLs, accent color, and optional
                    developer-activity defaults. Keep
                    <code>firestoreDocumentPath</code> at
                    <code>profiles/main</code> unless you also update the rules and
                    understand the data-path change.
                  </p>
                ),
                code:
                  'firestoreDocumentPath: "profiles/main"\nprofile: {\n  name: "Your name",\n  handle: "@your-handle"\n}',
                label: "profile.config.ts",
              },
              {
                title: "Connect the backend",
                body: (
                  <>
                    <p>
                      In your backend project dashboard, create a project, add a Web
                      app, then create a profile database and a Storage bucket for
                      optional link and heading uploads. Copy the six web-app values
                      into a local environment file.
                    </p>
                    <p>
                      Copy <code>.env.example</code> to <code>.env.local</code> and
                      fill every <code>NEXT_PUBLIC_FIREBASE_*</code> value. Do not
                      commit <code>.env.local</code>.
                    </p>
                  </>
                ),
                code:
                  "cp .env.example .env.local\n# Add the backend web-app values to .env.local",
              },
              {
                title: "Enable an owner sign-in method",
                body: (
                  <>
                    <p>
                      In your sign-in settings, enable at
                      least one of Email/Password, Google, or GitHub. For GitHub,
                      create an OAuth app and use the exact redirect URI shown in
                      your provider dashboard, such as
                      <code>https://YOUR_PROJECT_ID.firebaseapp.com/__/auth/handler</code>,
                      as the GitHub authorization callback URL.
                    </p>
                    <p>
                      Add <code>localhost</code> and your production hostname to
                      your sign-in provider&apos;s authorized domains where
                      required.
                    </p>
                  </>
                ),
              },
              {
                title: "Create the owner account",
                body: (
                  <p>
                    Create an email/password owner account in your dashboard, or attempt
                    Google or GitHub sign-in once so the provider creates that user.
                    Copy its UID from Authentication → Users. The first OAuth
                    attempt can be rejected by the manager until the allowlist
                    entry in the next step exists.
                  </p>
                ),
              },
              {
                title: "Add the owner UID to the database",
                body: (
                  <p>
                    In the database, create <code>owners/USER_UID</code> and add the
                    Boolean field <code>enabled: true</code>. Both the document ID
                    and this exact field value are required for owner access.
                    Browser clients cannot create or change owner records under
                    the included rules.
                  </p>
                ),
                code:
                  "owners\n└── YOUR_OWNER_UID\n    └── enabled: true",
                label: "Database",
              },
              {
                title: "Deploy the database and storage rules",
                body: (
                  <p>
                    The included rules allow anyone to read the public profile and
                    allow writes only when the authenticated UID has a matching,
                    enabled owner document. Storage rules make profile imagery
                    publicly readable while restricting uploads to the signed-in
                    enabled owner.
                    Deploy both rule files before using the manager in production.
                    On the first deploy, accept the Firebase Rules permission that
                    lets Storage check the Firestore owner allowlist.
                  </p>
                ),
                code:
                  "npx firebase-tools@latest login\nnpx firebase-tools@latest use --add\nnpx firebase-tools@latest deploy --only firestore:rules,storage",
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
          lead="Vercel runs the Next.js application; your backend continues to own authentication and profile data."
        >
          <p>
            Push your configured fork to GitHub, then import it in Vercel. Set the
            project&apos;s Root Directory to <code>self-hosted-template</code> so
            Vercel builds only the stripped edition. The checked-in
            <code> vercel.json</code> selects Next.js and runs the production
            environment validator before the build.
          </p>
          <CodeBlock>
            {
              "git add self-hosted-template\ngit commit -m \"Configure my Socialize profile\"\ngit push"
            }
          </CodeBlock>
          <p>
            In Vercel Project Settings → Environment Variables, add every value
            from <code>.env.example</code> for Production, Preview, and Development
            as appropriate, including the final <code>NEXT_PUBLIC_SITE_URL</code>.
            If developer activity needs higher GitHub limits, add the server-only
            <code> GITHUB_TOKEN</code> with no private-repository access. Configure
            a Vercel Firewall rate limit for <code>/api/github-activity</code>, then
            set <code>VERCEL_FIREWALL_CONFIGURED=true</code> for Production so the
            deployment validator can confirm that operational step. Redeploy after
            changing a public value because public Next.js variables are embedded
            into the browser bundle during the build.
          </p>
          <Notice title="Two deployments protect two different things" tone="signal">
            <p>
              Vercel deploys the Next.js application. The backend CLI deploys
              <code>firestore.rules</code> and <code>storage.rules</code>. A successful
              Vercel deployment does not publish local backend rule changes.
            </p>
          </Notice>
          <h3>Connect a custom domain</h3>
          <p>
            Add the domain in Vercel after the first successful deployment and
            apply the DNS records it supplies. Then add both the production domain
            and any Vercel preview domains you intend to use to your sign-in
            provider&apos;s authorized domains. GitHub sign-in still uses the
            provider&apos;s <code>firebaseapp.com/__/auth/handler</code> callback URL.
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
                title: "GitHub sign-in setup",
                description: "Provider setup and the required OAuth callback URL.",
              },
              {
                external: true,
                href: "https://firebase.google.com/docs/rules/manage-deploy",
                title: "Deploy database security rules",
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
            fallback. For production data, schedule database exports or keep a
            separate machine-readable export in a private, access-controlled
            location.
          </p>
          <h3>Protect the owner boundary</h3>
          <p>
            Never create an <code>owners/&#123;uid&#125;</code> document for a visitor.
            Revoke old owners promptly, use multi-factor authentication where your
            provider supports it, and regularly review authorized sign-in domains
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
        copy="Use Socialize hosting when you want the same profile model without operating your own backend, deployments, or owner allowlist yourself."
        links={[
          { href: "/sign-up", label: "Create a hosted page" },
          { href: "/docs", label: "Compare both paths" },
        ]}
      />
    </ServiceShell>
  );
}
