import type { Metadata } from "next";
import {
  ActionBand,
  CheckItem,
  CheckList,
  ContentSection,
  FactGrid,
  Notice,
  PageAction,
  PageHero,
  PageLayout,
  ResourceLinks,
  ServiceShell,
  serviceContentStyles as styles,
} from "@/components/service-content";
import { contactConfig, mailto } from "@/lib/contact-config";
import { githubSponsorUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sponsor Socialize",
  description:
    "Fund Socialize maintenance, documentation, accessibility work, and the open self-hosted edition through GitHub Sponsors.",
  alternates: { canonical: "/sponsor" },
};

const pageNav = [
  { href: "#why", label: "Why sponsor" },
  { href: "#funding", label: "What funding covers" },
  { href: "#ways", label: "Ways to help" },
  { href: "#expectations", label: "Sponsor expectations" },
  { href: "#questions", label: "Questions" },
];

export default function SponsorPage() {
  return (
    <ServiceShell>
      <PageHero
        section="Sponsor"
        title="Keep the exit door maintained."
        summary="Sponsorship pays for the unglamorous work that makes the self-hosted edition dependable: security updates, clear setup notes, compatibility fixes, and time to answer useful reports."
        tone="signal"
        actions={
          <>
            <PageAction
              external
              href={githubSponsorUrl}
            >
              Sponsor on GitHub
            </PageAction>
            <PageAction
              external
              href="https://github.com/Llewellyn500/socialize"
              secondary
            >
              Review the project
            </PageAction>
          </>
        }
        aside={
          <div className={styles.asideStatement}>
            <span>Open source support</span>
            <strong>Everything Socialize offers today stays free. Sponsors fund the maintenance that keeps it that way.</strong>
            <p>Support is voluntary. It does not change which features, limits, or data controls are available to anyone.</p>
          </div>
        }
      />

      <PageLayout nav={pageNav}>
        <ContentSection
          id="why"
          title="Why sponsorship matters"
          lead="A useful fork needs more than a public repository."
        >
          <p>
            Socialize offers a managed product and a smaller self-hosted edition.
            The open edition gives developers a practical route to their own
            backend project and domain, without carrying the hosted service&apos;s
            accounts, marketing pages, or multi-user operations.
          </p>
          <p>
            That promise creates ongoing work: dependency releases must be
            reviewed, setup paths need retesting, security guidance changes, and
            documentation needs to match the code. Sponsorship gives that work a
            budget even when it does not produce a paid-service feature.
          </p>
          <Notice title="Sponsorship is support, not influence">
            <p>
              Contributions do not purchase roadmap control, moderation outcomes,
              access to user data, or favorable treatment in a security report.
              Product and safety decisions remain based on user impact and project
              priorities.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="funding"
          title="What funding covers"
          lead="The focus stays on work that keeps the project usable and understandable."
        >
          <FactGrid
            facts={[
              {
                label: "Maintenance",
                value: "Next.js, backend maintenance, and dependency updates",
              },
              {
                label: "Security",
                value: "Rule reviews, fixes, and coordinated disclosure work",
              },
              {
                label: "Documentation",
                value: "Setup checks, migration notes, and practical examples",
              },
              {
                label: "Accessibility",
                value: "Keyboard, contrast, semantics, and reduced-motion testing",
              },
            ]}
          />
          <CheckList>
            <CheckItem>
              Reproduce and fix defects that affect the public template.
            </CheckItem>
            <CheckItem>
              Keep sign-in and database rules guidance aligned
              with the implementation.
            </CheckItem>
            <CheckItem>
              Test upgrade paths so owners can pull changes without rebuilding
              their profile from scratch.
            </CheckItem>
            <CheckItem>
              Maintain examples and deployment notes across supported platforms.
            </CheckItem>
          </CheckList>
          <p>
            If sponsorship materially exceeds routine project needs, Socialize
            will publish a clearer funding plan before expanding how those funds
            are used.
          </p>
        </ContentSection>

        <ContentSection
          id="ways"
          title="Ways to help"
          lead="Money helps, but it is not the only useful contribution."
        >
          <ResourceLinks
            links={[
              {
                external: true,
                href: githubSponsorUrl,
                title: "One-time or monthly sponsorship",
                description: "Choose the amount and visibility through GitHub Sponsors.",
              },
              {
                href: mailto(contactConfig.sponsors, "Socialize organization sponsorship"),
                title: "Organization sponsorship",
                description: "Ask about a larger voluntary contribution or optional public acknowledgement before sending funds.",
              },
              {
                external: true,
                href: "https://github.com/Llewellyn500/socialize/issues",
                title: "Submit a useful issue",
                description: "A clear reproduction or documentation gap can save hours of maintenance.",
              },
              {
                external: true,
                href: "https://github.com/Llewellyn500/socialize",
                title: "Star or share the repository",
                description: "Help developers who need the self-hosted option find it.",
              },
            ]}
          />
          <p>
            Before sending code, open a focused issue for substantial changes so
            scope and direction can be agreed first. Never include user data,
            backend credentials, or unpublished vulnerability details in a public
            issue.
          </p>
        </ContentSection>

        <ContentSection
          id="expectations"
          title="Sponsor expectations"
          lead="Clear boundaries keep support fair to sponsors and users."
        >
          <h3>Recognition</h3>
          <p>
            GitHub can display your sponsorship publicly when you choose that
            setting. Any additional name or logo placement follows the benefit
            shown on the selected GitHub tier. Sponsors may ask to remain private
            or have a public acknowledgement removed.
          </p>
          <h3>Project access</h3>
          <p>
            Public releases remain available under the repository&apos;s license and
            every current hosted feature remains free. A sponsorship does not
            transfer copyright, unlock functionality, grant access to hosted user
            data, priority support, or create a service-level agreement.
          </p>
          <h3>Priorities</h3>
          <p>
            Security fixes are ordered by severity and user risk. Other maintenance
            is ordered by reproducibility, affected users, effort, and fit with the
            project. Sponsor feedback is welcome, but a contribution does not
            guarantee a feature or delivery date.
          </p>
          <h3>Conflicts</h3>
          <p>
            Socialize may decline or return support that creates a legal, safety,
            editorial, or independence conflict, subject to the payment platform&apos;s
            rules and technical ability to issue a refund.
          </p>
        </ContentSection>

        <ContentSection
          id="questions"
          title="Common questions"
          lead="GitHub handles voluntary contributions; Socialize does not sell access to the service."
        >
          <h3>Can I cancel a recurring sponsorship?</h3>
          <p>
            Yes. Manage or cancel it from your GitHub Sponsors settings. Cancelling
            never changes access to Socialize because there are no paid features or
            sponsor-only service tiers.
          </p>
          <h3>Will I receive an invoice or receipt?</h3>
          <p>
            GitHub provides payment records for GitHub Sponsors transactions.
            Organizations that want to discuss a voluntary contribution can email
            <a href={mailto(contactConfig.sponsors)}> {contactConfig.sponsors}</a>
            before paying.
          </p>
          <h3>Is a sponsorship tax deductible?</h3>
          <p>
            Do not assume it is. Socialize does not represent contributions as
            charitable donations. Ask a qualified tax professional about your
            circumstances and jurisdiction.
          </p>
          <h3>Can my team sponsor a specific feature?</h3>
          <p>
            You can propose work by email, but feature funding requires a separate
            written scope. Ordinary sponsorship should not be treated as a purchase
            order or delivery commitment.
          </p>
        </ContentSection>
      </PageLayout>

      <ActionBand
        title="Fund the work people can take with them."
        copy="A contribution helps keep the single-owner edition secure, documented, and practical to deploy."
        links={[
          {
            external: true,
            href: githubSponsorUrl,
            label: "Support the project",
          },
          { href: "/self-host", label: "See the self-hosted edition" },
        ]}
      />
    </ServiceShell>
  );
}
