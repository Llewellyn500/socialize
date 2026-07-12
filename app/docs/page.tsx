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
  title: "Documentation",
  description:
    "Learn how Socialize hosted profiles, self-hosted profiles, account sign-in, and the portable profile model work.",
  alternates: { canonical: "/docs" },
};

const pageNav = [
  { href: "#overview", label: "Overview" },
  { href: "#hosted", label: "Hosted profiles" },
  { href: "#activity", label: "GitHub activity" },
  { href: "#self-hosted", label: "Self-hosted profiles" },
  { href: "#profile-model", label: "Profile model" },
  { href: "#auth", label: "Authentication" },
  { href: "#publishing", label: "Publishing" },
  { href: "#help", label: "Get help" },
];

const profileShape = `type Profile = {
  name: string;
  handle: string;
  role: string;
  bio: string;
  location: string;
  availability: string;
  avatarUrl: string;
  accent: string;
  sections: Array<{
    id: string;
    title: string;
    mediaUrl?: string;
    mediaType?: "icon" | "thumbnail";
    hideTitle?: boolean;
  }>;
  links: Array<{
    id: string;
    title: string;
    description: string;
    url: string;
    enabled: boolean;
    sectionId?: string;
    mediaUrl?: string;
    mediaType?: "icon" | "thumbnail";
  }>;
  socials: Array<{
    id: string;
    label: string;
    url: string;
  }>;
  developerActivity?: {
    enabled: boolean;
    githubUsername: string;
    placement: "before-links" | "after-links";
    repositories: {
      mode: "recent" | "include" | "exclude";
      names: string[]; // max 5 owner/repository slugs
    };
    commits: {
      enabled: boolean;
      title: string;
      limit: number; // 1-10
      showRepository: boolean;
      showDate: boolean;
    };
    coding: {
      enabled: boolean;
      title: string;
      windowDays: 7 | 14 | 30;
      showContributionCount: boolean;
      showHeatmap: boolean;
      showMonthLabels: boolean;
      showWeekdayLabels: boolean;
      showLegend: boolean;
      showYearSelector: boolean;
      showLanguages: boolean;
    };
  };
};`;

export default function DocsPage() {
  return (
    <ServiceShell>
      <PageHero
        section="Docs"
        title="Know what runs your page."
        summary="Socialize has two delivery paths, related profile models, and a portable developer-activity block. Start managed, or run the compact self-hosted stack yourself."
        tone="ink"
        actions={
          <>
            <PageAction href="/sign-up">Create a hosted page</PageAction>
            <PageAction href="/self-host" secondary>
              Open the self-host guide
            </PageAction>
          </>
        }
        aside={
          <div className={styles.asideStatement}>
            <span>Documentation map</span>
            <strong>Pick a path, publish a profile, keep the data portable.</strong>
            <p>Hosted and self-hosted editions share concepts, while their top-level JSON schemas remain distinct.</p>
          </div>
        }
      />

      <PageLayout nav={pageNav}>
        <ContentSection
          id="overview"
          title="Two ways to run Socialize"
          lead="Choose based on how much infrastructure you want to own."
        >
          <FactGrid
            facts={[
              {
                label: "Hosted",
                value: "Socialize account, editor, handle, and deployment",
              },
              {
                label: "Self-hosted",
                value: "Your repository, backend project, domain, and operations",
              },
              {
                label: "Shared core",
                value: "Identity, links, socials, availability, accent, and developer activity",
              },
              {
                label: "Portability",
                value: "Backup/migration JSON plus a shared nested activity shape",
              },
            ]}
          />
          <p>
            Hosted mode is for developers who want to sign in, arrange their work,
            and share a URL. Self-hosted mode is a stripped Next.js application
            with a public profile, a private manager, and a cloud backend you control.
          </p>
          <Notice title="The service and template are related, not identical">
            <p>
              The hosted service can add multi-user operations, managed handles,
              and service-level features. The self-hosted edition stays focused on
              one owner and one public profile so it remains understandable to
              operate.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="hosted"
          title="Hosted profiles"
          lead="Socialize manages the account, data store, profile URL, and releases."
        >
          <Steps
            items={[
              {
                title: "Create an account",
                body: (
                  <p>
                    Open <Link href="/sign-up">Sign up</Link> and use email,
                    Google, or GitHub. If the same email already belongs to another
                    sign-in method, use that original method first rather than
                    creating a duplicate identity.
                  </p>
                ),
              },
              {
                title: "Claim a handle",
                body: (
                  <p>
                    Pick the short public identifier used in your Socialize URL.
                    Handles are unique, may be moderated, and must not impersonate
                    another person or organization.
                  </p>
                ),
              },
              {
                title: "Build the profile",
                body: (
                  <p>
                    Add your introduction, projects, writing, contact link, and
                    social profiles. The Activity tab can add sampled public GitHub
                    work with repository and display controls. Use descriptions to
                    tell visitors what they will find before they open a link.
                  </p>
                ),
              },
              {
                title: "Preview and publish",
                body: (
                  <p>
                    Check every destination, hide unfinished entries, then publish.
                    Public content can be indexed, copied, archived, or shared by
                    visitors, so keep private details out of the profile.
                  </p>
                ),
              },
            ]}
          />
          <h3>Account ownership</h3>
          <p>
            Keep at least one sign-in method available and protect the identity
            provider behind it. Socialize support should never ask for your
            password, OAuth secret, recovery code, or server admin credentials.
          </p>
        </ContentSection>

        <ContentSection
          id="activity"
          title="Public GitHub activity"
          lead="Choose what is displayed, understand what is sampled, and keep every credential server-side."
        >
          <p>
            The Activity tab controls the public GitHub username, placement before
            or after links, headings, a 1–10 commit limit, repository/date labels,
            and every contribution-calendar layer: yearly total, grid, month and
            weekday labels, intensity legend, year selector, and language summary.
            The connection check finds public data; it does not verify ownership.
          </p>
          <h3>Repository selection</h3>
          <ul>
            <li>
              <strong>Recent</strong> automatically samples up to three repositories
              from the latest public push events.
            </li>
            <li>
              <strong>Include</strong> uses only the selected public
              <code> owner/repository</code> slugs, up to five.
            </li>
            <li>
              <strong>Exclude</strong> removes up to five selected slugs from the
              automatic recent set.
            </li>
          </ul>
          <p>
            Selected repositories are rechecked as public. Repository filters apply
            to commits and languages; GitHub&apos;s contribution calendar remains
            account-wide. With a server token, its public GraphQL calendar supplies
            the yearly total, weeks, days, and contribution levels. Without one, the
            profile renders the same geometry from a clearly labeled recent public-event
            sample. GitHub results remain third-party, unverified, and may lag.
          </p>
          <h3>Caching and request limits</h3>
          <p>
            Public events are revalidated after five minutes; contribution calendars,
            repository, commit, and language lookups are cached for one hour. Successful route responses
            use a five-minute CDN cache with up to one additional stale hour. GitHub&apos;s
            event feed can itself lag by about 30 seconds to six hours.
          </p>
          <p>
            The route applies a best-effort limit of 30 requests per source IP per
            60 seconds. For distributed production enforcement, add a Vercel
            Firewall rate-limit rule for <code>/api/github-activity</code> and monitor
            <code>429</code> responses.
          </p>
          <Notice title="A GitHub token must remain public-only" tone="signal">
            <p>
              <code>GITHUB_TOKEN</code> is optional and server-only. If configured,
              it enables the complete public yearly calendar and must not have access
              to private repositories. Never prefix it with
              <code> NEXT_PUBLIC_</code>, store it in a profile, or include it in an export.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="self-hosted"
          title="Self-hosted profiles"
          lead="A compact single-owner application for developers who want the repository and runtime."
        >
          <p>
            The template uses Next.js with secure sign-in and a profile database. Your
            profile renders from <code>profile.config.ts</code> until the database
            has a saved profile. The private manager writes to the configured
            document only after the backend finds the signed-in UID in the private
            <code>owners</code> allowlist.
          </p>
          <CheckList>
            <CheckItem>
              Configure identity and fallback data in <code>profile.config.ts</code>.
            </CheckItem>
            <CheckItem>
              Put backend web-app values in <code>.env.local</code> locally and in
              your hosting environment for production.
            </CheckItem>
            <CheckItem>
              If developer activity is enabled, optionally configure a server-only
              <code> GITHUB_TOKEN</code> with no private-repository access.
            </CheckItem>
            <CheckItem>
              Deploy <code>firestore.rules</code> and grant one trusted account the
              <code>owners/&#123;uid&#125;</code> allowlist document.
            </CheckItem>
            <CheckItem>
              Test public reads, signed-out write rejection, owner writes, and
              token refresh before launch.
            </CheckItem>
          </CheckList>
          <ResourceLinks
            links={[
              {
                href: "/self-host#setup",
                title: "Complete setup guide",
                description: "Fork, backend setup, owner allowlist, rules, and local verification.",
              },
              {
                href: "/self-host#deploy",
                title: "Vercel deployment",
                description: "Root directory, environment values, previews, and domains.",
              },
              {
                href: "/security#self-hosters",
                title: "Self-hosted security responsibilities",
                description: "What Socialize maintains and what the operator owns.",
              },
            ]}
          />
        </ContentSection>

        <ContentSection
          id="profile-model"
          title="Profile models and portable data"
          lead="Keep backups stable while converting the few top-level differences between editions."
        >
          <p>
            The self-hosted edition defines the profile in
            <code>types/profile.ts</code>. A hosted JSON export is a backup and
            migration format, not a file the stripped template imports unchanged:
            identity and social fields use different top-level representations.
            Convert those fields during migration. The nested
            <code> developerActivity</code> object shown below is intentionally shared.
          </p>
          <CodeBlock label="types/profile.ts">{profileShape}</CodeBlock>
          <h3>Link behavior</h3>
          <ul>
            <li>
              <code>enabled: false</code> keeps a link in the editor but removes it
              from the public page.
            </li>
            <li>
              Primary links accept <code>http</code>, <code>https</code>, and
              supported contact URLs. Social links require public web URLs.
            </li>
            <li>
              Link IDs should remain stable across edits so reorder and update
              operations do not create unnecessary records.
            </li>
            <li>
              Link order is the array order. Dragging between sections updates both
              that order and <code>sectionId</code>; arrow and section controls remain
              available for keyboard users.
            </li>
            <li>
              Links and section headings can use an optional compact icon or wide
              thumbnail from an uploaded image, an <code>https://</code> URL, or a
              local public path in the self-hosted edition.
            </li>
          </ul>
          <h3>Public by design</h3>
          <p>
            Names, bios, locations, availability, avatars, and enabled links render
            on a public page. Do not put access tokens, private repository URLs,
            home addresses, private phone numbers, or authentication data in the
            profile model.
          </p>
        </ContentSection>

        <ContentSection
          id="auth"
          title="Authentication and authorization"
          lead="Signing in proves identity. Authorization decides what that identity may change."
        >
          <h3>Hosted service</h3>
          <p>
            Socialize sign-in handles email, Google, and GitHub identities. The
            service associates the authenticated account ID with a profile. A valid
            session alone must never grant access to another account&apos;s profile.
          </p>
          <h3>Self-hosted edition</h3>
          <p>
            The template checks for an <code>owners/&#123;uid&#125;</code> document in
            both the interface gate and database rules. The interface check helps
            the owner understand access state; the database rule remains the
            security boundary.
          </p>
          <CodeBlock label="firestore.rules">
            {
              "function isOwner() {\n  return request.auth != null\n    && exists(/databases/$(database)/documents/owners/$(request.auth.uid));\n}\n\nmatch /profiles/{profileId} {\n  allow read: if true;\n  allow create, update, delete: if isOwner();\n}"
            }
          </CodeBlock>
          <Notice title="Client checks are not access control" tone="signal">
            <p>
              Hiding a button or redirecting a visitor does not protect the database.
              Keep authorization in server-side security rules and test the rejected
              path as carefully as the successful one.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="publishing"
          title="Publishing checklist"
          lead="A small profile still deserves production checks."
        >
          <CheckList>
            <CheckItem>Open every link and confirm its final destination.</CheckItem>
            <CheckItem>
              Check the page at narrow mobile, tablet, laptop, and large desktop widths.
            </CheckItem>
            <CheckItem>
              Navigate with a keyboard and confirm focus remains visible.
            </CheckItem>
            <CheckItem>
              Use descriptive link titles and useful alternative text for the avatar.
            </CheckItem>
            <CheckItem>
              Run <code>npm run typecheck</code> and <code>npm run build</code> before deployment.
            </CheckItem>
            <CheckItem>
              Verify a signed-out visitor can read the profile but cannot write its document.
            </CheckItem>
            <CheckItem>
              Exercise the GitHub activity route, confirm sampling copy, and test
              the application and Vercel Firewall rate-limit paths.
            </CheckItem>
            <CheckItem>
              Review the <Link href="/acceptable-use">Acceptable Use Policy</Link>
              before publishing hosted content.
            </CheckItem>
          </CheckList>
        </ContentSection>

        <ContentSection
          id="help"
          title="Get help"
          lead="Send each kind of problem through the channel that can handle it."
        >
          <ResourceLinks
            links={[
              {
                external: true,
                href: "https://github.com/Llewellyn500/socialize/issues",
                title: "Code and template issues",
                description: "Reproducible bugs and public feature discussions. Never include secrets.",
              },
              {
                href: "mailto:support@socialize.you",
                title: "Hosted account support",
                description: "Account access, handle, publishing, or billing questions.",
              },
              {
                href: "mailto:security@socialize.you",
                title: "Private security reports",
                description: "Vulnerabilities, exposed credentials, or abuse of service infrastructure.",
              },
              {
                href: "/report/example",
                title: "Profile reporting guide",
                description: "What to collect before reporting a public profile.",
              },
            ]}
          />
          <p>
            Include the affected route, expected behavior, actual behavior, browser
            or runtime version, and the smallest reproduction you can share. Remove
            access tokens, service-account keys, passwords, and personal data first.
          </p>
        </ContentSection>
      </PageLayout>

      <ActionBand
        title="Choose how much stack you want."
        copy="Start managed for speed, or take the single-owner template when infrastructure ownership is part of the goal."
        links={[
          { href: "/sign-up", label: "Start hosted" },
          { href: "/self-host", label: "Set up self-hosting" },
        ]}
      />
    </ServiceShell>
  );
}
