import type { Metadata } from "next";
import Link from "next/link";
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
import { legalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Socialize security boundaries, authorization model, self-hosting responsibilities, and private vulnerability reporting guidance.",
  alternates: { canonical: "/security" },
};

const pageNav = [
  { href: "#posture", label: "Security posture" },
  { href: "#hosted", label: "Hosted service" },
  { href: "#self-hosters", label: "Self-hosters" },
  { href: "#report", label: "Report a vulnerability" },
  { href: "#scope", label: "Research scope" },
  { href: "#safe-harbor", label: "Safe harbor" },
  { href: "#incidents", label: "Incidents" },
];

export default function SecurityPage() {
  return (
    <ServiceShell>
      <PageHero
        section="Security"
        title="Protect the owner boundary."
        summary="Profiles are public. Editing is not. Socialize uses account identity and database authorization to keep that distinction enforceable, and provides a private path for responsible reports."
        tone="ink"
        actions={
          <>
            <PageAction href={mailto(contactConfig.security, "Private Socialize security report")}>
              Email a private report
            </PageAction>
            <PageAction href="/self-host#operate" secondary>
              Self-hosting checklist
            </PageAction>
          </>
        }
        aside={
          <div className={styles.asideStatement}>
            <span>Security boundary</span>
            <strong>Public reads. Authenticated ownership. Server-enforced writes.</strong>
            <p>The interface explains access; server-side security rules must enforce it.</p>
          </div>
        }
      />

      <PageLayout nav={pageNav}>
        <Notice title="Deployment-specific security statement" tone="warning">
          <p>
            This page describes the controls shipped in this repository. Operators
            must verify every claim against the deployed backend project, hosting
            configuration, domain, logs, and incident process after each material
            production change.
          </p>
        </Notice>

        <ContentSection
          id="posture"
          title="Security posture"
          lead="Small data and explicit boundaries reduce the number of things that can go wrong."
        >
          <FactGrid
            facts={[
              { label: "Public data", value: "Published profile fields and enabled links" },
              { label: "Private action", value: "Creating, editing, exporting, and deleting account data" },
              { label: "Identity", value: "Authenticated account ID and provider session" },
              { label: "Authorization", value: "Database rules tied to account ownership or an owner allowlist" },
            ]}
          />
          <CheckList>
            <CheckItem>
              Collect only account, profile, support, and operational data needed to
              run the service.
            </CheckItem>
            <CheckItem>
              Keep server admin credentials and privileged backend operations
              out of browser code.
            </CheckItem>
            <CheckItem>
              Treat client-side redirects and hidden controls as user experience,
              never as the authorization boundary.
            </CheckItem>
            <CheckItem>
              Keep dependencies current, review Security Rule changes, and test
              both allowed and rejected operations.
            </CheckItem>
          </CheckList>
          <p>
            Socialize is not a secure vault. Public profile content should be
            assumed discoverable and copyable. Never publish credentials, private
            repository tokens, identity documents, client secrets, or confidential
            contact details in a profile.
          </p>
        </ContentSection>

        <ContentSection
          id="hosted"
          title="Hosted service controls"
          lead="The managed service must bind every private operation to the authenticated account that owns the profile."
        >
          <h3>Authentication</h3>
          <p>
            Email, Google, and GitHub sign-in are handled through Socialize&apos;s
            authentication layer. OAuth providers authenticate users on provider-controlled
            pages. Socialize should not receive or store Google or GitHub passwords.
          </p>
          <h3>Authorization</h3>
          <p>
            A signed-in session proves which user is present. Database security
            rules and trusted server operations must verify that the user owns the
            requested profile before a write, export, account change, or deletion.
            A guessed handle or document path must not grant access.
          </p>
          <h3>Operational access</h3>
          <p>
            Production console, backend, domain, deployment, and support access
            should use individual accounts, multi-factor authentication where
            available, least privilege, and prompt removal when access is no longer
            needed. Privileged actions should leave an auditable provider record.
          </p>
          <h3>Transport and storage</h3>
          <p>
            Production traffic should use HTTPS. Cloud and hosting providers
            supply platform-level transport and storage protections. Socialize must
            still configure access rules, retention, backups, secrets, and provider
            permissions correctly.
          </p>
        </ContentSection>

        <ContentSection
          id="self-hosters"
          title="Security for self-hosters"
          lead="The template supplies a starting boundary. The operator owns the deployed result."
        >
          <p>
            The self-hosted edition uses a private
            <code>owners/&#123;uid&#125;</code> database allowlist for private writes.
            The included rules allow public reads from the profile collection and
            deny writes unless the signed-in UID has a matching owner document.
            The public interface renders a configured fallback when the cloud backend is
            unavailable.
          </p>
          <CheckList>
            <CheckItem>
              Create owner allowlist documents only from your backend dashboard or other
              trusted administration tooling; browser clients cannot grant access.
            </CheckItem>
            <CheckItem>
              Deploy and test <code>firestore.rules</code>. A local rule file does
              not protect production until it is deployed to the correct project.
            </CheckItem>
            <CheckItem>
              Add only the intended owner UID and delete its allowlist document
              immediately when that identity is lost or compromised.
            </CheckItem>
            <CheckItem>
              Add only the required authorized sign-in domains and keep GitHub
              OAuth callback URLs exact.
            </CheckItem>
            <CheckItem>
              Patch Next.js, backend dependencies, and other packages; monitor your hosting
              and backend usage for unexpected activity.
            </CheckItem>
            <CheckItem>
              Back up profile data and test restoration without exposing it in a
              public repository.
            </CheckItem>
          </CheckList>
          <p>
            A vulnerability in code shipped by Socialize can be reported to the
            address below. Compromise caused by a fork&apos;s custom code, provider
            account, secrets, rules, deployment, or domain must also be handled by
            that operator and the relevant provider.
          </p>
        </ContentSection>

        <ContentSection
          id="report"
          title="Report a vulnerability privately"
          lead="Give us enough detail to reproduce the issue without increasing harm."
        >
          <p>
            Email <a href={mailto(contactConfig.security, "Private Socialize security report")}>{contactConfig.security}</a>
            with a clear subject. Do not open a public issue for an unpatched
            vulnerability. If ordinary email is unsuitable, ask for an encrypted
            reporting channel before sending sensitive evidence.
          </p>
          <CheckList>
            <CheckItem>The affected hostname, route, repository file, or commit.</CheckItem>
            <CheckItem>Impact and the conditions required to trigger it.</CheckItem>
            <CheckItem>Numbered reproduction steps and a minimal proof of concept.</CheckItem>
            <CheckItem>
              Whether any account or personal data was accessed, changed, or exposed.
            </CheckItem>
            <CheckItem>
              Your preferred name, contact method, and disclosure timeline.
            </CheckItem>
          </CheckList>
          <p>
            Remove tokens, passwords, cookies, and unrelated personal data from
            screenshots or logs. If a secret belonging to you was exposed during
            testing, revoke it before sending the report.
          </p>
          <Notice title="Response targets, not service-level promises" tone="signal">
            <p>
              The intended program target is acknowledgement within three business
              days, initial triage within ten business days, and an update at least
              every fourteen days while a confirmed issue remains open. Capacity,
              severity, and incomplete reports may affect these targets.
            </p>
          </Notice>
        </ContentSection>

        <ContentSection
          id="scope"
          title="Research scope"
          lead="Good-faith testing should be narrow, reversible, and limited to accounts you control."
        >
          <h3>Intended in scope</h3>
          <ul>
            <li>Managed Socialize web properties owned and operated by the project.</li>
            <li>Authorization failures that expose or modify another hosted account.</li>
            <li>Authentication bypass, session compromise, stored cross-site scripting, or server-side injection.</li>
            <li>Public-template defects that create a vulnerability in an unmodified self-hosted deployment.</li>
            <li>Exposed Socialize-owned production secrets or privileged infrastructure access.</li>
          </ul>
          <h3>Not authorized without written permission</h3>
          <ul>
            <li>Denial-of-service, load, stress, or resource-exhaustion testing.</li>
            <li>Social engineering, phishing, bribery, threats, or physical intrusion.</li>
            <li>Testing Google, GitHub, a hosting provider, or another third party.</li>
            <li>Accessing another user&apos;s account, private data, or linked service.</li>
            <li>Testing a self-hosted instance without permission from its operator.</li>
            <li>Automated scanning that generates excessive traffic or creates accounts in bulk.</li>
            <li>Publishing a vulnerability before coordinated disclosure is complete.</li>
          </ul>
          <p>
            A public profile containing prohibited content is an abuse report, not
            necessarily a product vulnerability. Use the handle-specific
            <Link href="/report/example"> reporting guide</Link> for that case.
          </p>
        </ContentSection>

        <ContentSection
          id="safe-harbor"
          title="Safe harbor"
          lead="Good-faith research within these boundaries is welcomed and treated as authorized."
        >
          <p>
            When research follows this policy, is carried out in good faith, avoids
            privacy harm and service disruption, and is reported promptly, Socialize
            intends to treat it as authorized security research and not pursue legal
            action for accidental, good-faith violations of this policy.
          </p>
          <p>
            Stop testing and report immediately if you encounter personal data,
            credentials, or access beyond accounts you control. Do not retain,
            download, alter, or disclose more data than necessary to demonstrate the
            issue. Give Socialize a reasonable opportunity to investigate and fix a
            confirmed vulnerability before public disclosure.
          </p>
          <p>
            This policy cannot authorize activity against third parties, excuse
            violations of law, or bind law-enforcement authorities. It is offered
            by {legalConfig.operatorName} for testing of the managed Socialize
            service only.
          </p>
        </ContentSection>

        <ContentSection
          id="incidents"
          title="Security incidents"
          lead="Containment comes first, followed by an accurate account of impact and recovery."
        >
          <p>
            For a confirmed incident, the intended process is to restrict affected
            access, preserve relevant evidence, revoke exposed credentials, patch
            the cause, validate the fix, and monitor for recurrence. Notification to
            affected users and authorities will follow applicable law and the risk
            presented by the incident.
          </p>
          <p>
            Public updates should distinguish known facts from investigation and
            avoid details that expose users or enable active exploitation. A final
            review should identify control, process, and documentation improvements.
          </p>
          <ResourceLinks
            links={[
              {
                href: mailto(contactConfig.security, "Private Socialize security report"),
                title: "Private vulnerability report",
                description: "Technical security weaknesses and exposed credentials.",
              },
              {
                href: mailto(contactConfig.safety, "Urgent Socialize abuse report"),
                title: "Urgent hosted-profile abuse",
                description: "Phishing, malware, threats, impersonation, or privacy harm.",
              },
              {
                external: true,
                href: "https://github.com/Llewellyn500/socialize/issues",
                title: "Public reliability issue",
                description: "Non-sensitive bugs that do not expose data or access.",
              },
            ]}
          />
        </ContentSection>
      </PageLayout>

      <ActionBand
        title="Found something that changes the risk?"
        copy="Send it privately, minimize the data you touch, and give the project enough detail to reproduce it."
        links={[
          {
            href: mailto(contactConfig.security, "Private Socialize security report"),
            label: "Email security",
          },
          { href: "/acceptable-use", label: "Read the abuse rules" },
        ]}
      />
    </ServiceShell>
  );
}
