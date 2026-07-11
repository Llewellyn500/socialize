import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    "Draft rules for content, links, behavior, automation, and abuse on the hosted Socialize service.",
  alternates: { canonical: "/acceptable-use" },
};

const sections: LegalSection[] = [
  {
    id: "purpose",
    title: "Purpose and scope",
    content: (
      <>
        <p>
          This Acceptable Use Policy applies to managed Socialize accounts, hosted
          profiles, handles, links, support channels, and attempts to access the
          service. It supplements the <Link href="/terms">Terms of Service</Link>.
        </p>
        <p>
          Independent self-hosted deployments are governed by their operators.
          However, use of Socialize trademarks, project infrastructure, or support
          channels can still be restricted when it creates confusion, abuse, or a
          security risk.
        </p>
      </>
    ),
  },
  {
    id: "illegal-harmful",
    title: "Illegal or harmful use",
    lead: "Do not use Socialize to facilitate harm, exploitation, or unlawful activity.",
    content: (
      <ul>
        <li>
          Content or activity that violates applicable law or assists another
          person in doing so.
        </li>
        <li>
          Child sexual abuse material, sexual exploitation of minors, grooming, or
          content that sexualizes children.
        </li>
        <li>
          Credible threats, targeted harassment, stalking, doxxing, or encouragement
          of violence or self-harm.
        </li>
        <li>
          Sale or facilitation of illegal goods, stolen data, compromised accounts,
          or unlawful weapons or controlled substances.
        </li>
        <li>
          Content that infringes intellectual-property, privacy, publicity, or
          other enforceable rights.
        </li>
      </ul>
    ),
  },
  {
    id: "deception",
    title: "Deception and impersonation",
    content: (
      <ul>
        <li>
          Impersonating a person, company, project, or public authority, including
          through a misleading handle, name, avatar, or link destination.
        </li>
        <li>
          Phishing, credential collection, fake authentication, advance-fee fraud,
          investment fraud, or fabricated endorsements.
        </li>
        <li>
          Hiding or repeatedly changing a destination to evade review, or presenting
          one destination to safety systems and another to visitors.
        </li>
        <li>
          Claiming Socialize verifies identity, employment, project ownership, or
          security when it has not done so.
        </li>
        <li>
          Reserving handles primarily to extort, resell, block, or misdirect the
          person or organization reasonably associated with a name.
        </li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "Malware and security abuse",
    content: (
      <>
        <ul>
          <li>
            Linking to malware, destructive downloads, exploit kits, credential
            stealers, or instructions primarily intended to compromise systems.
          </li>
          <li>
            Probing, scanning, or testing Socialize or another user&apos;s resources
            without permission, outside a published security program.
          </li>
          <li>
            Bypassing authentication, rate limits, access controls, moderation,
            suspensions, or technical restrictions.
          </li>
          <li>
            Publishing active secrets, private keys, access tokens, personal data
            obtained through compromise, or links designed to expose them.
          </li>
          <li>
            Interfering with availability through denial-of-service activity,
            excessive requests, abusive automation, or resource exhaustion.
          </li>
        </ul>
        <p>
          Good-faith vulnerability research should follow the
          <Link href="/security"> Security reporting guidance</Link> and minimize
          access to data or systems beyond what is necessary to demonstrate the issue.
        </p>
      </>
    ),
  },
  {
    id: "privacy-content",
    title: "Privacy and sensitive content",
    content: (
      <ul>
        <li>
          Publishing another person&apos;s home address, private contact details,
          identity documents, financial information, health information, or precise
          location without a lawful basis and appropriate permission.
        </li>
        <li>
          Non-consensual intimate imagery, sexual deepfakes, or threats to publish
          intimate material.
        </li>
        <li>
          Content that exposes authentication material, private repository access,
          or confidential employer or client information.
        </li>
        <li>
          Collecting visitor information through deceptive forms, hidden tracking,
          or destinations that do not provide required notice and consent.
        </li>
      </ul>
    ),
  },
  {
    id: "platform-integrity",
    title: "Platform integrity",
    content: (
      <>
        <ul>
          <li>
            Creating accounts or profiles in bulk without written permission, or
            using automation that degrades the service.
          </li>
          <li>
            Sending unsolicited commercial messages through support, reporting, or
            other service channels.
          </li>
          <li>
            Manipulating traffic, referrals, metrics, or search systems with bots,
            click farms, hidden redirects, or coordinated inauthentic activity.
          </li>
          <li>
            Reusing an account, device, domain, or identity to evade a restriction
            imposed for a policy violation.
          </li>
          <li>
            Scraping the service in a way that violates law, ignores technical
            restrictions, collects sensitive information, or materially burdens
            infrastructure.
          </li>
        </ul>
        <p>
          Normal browser access, search indexing, link previews, and reasonable
          accessibility or archival tools are not prohibited merely because they are
          automated.
        </p>
      </>
    ),
  },
  {
    id: "enforcement",
    title: "Review and enforcement",
    content: (
      <>
        <p>
          We consider severity, intent, context, affected people, prior violations,
          and the likelihood of ongoing harm. Responses may include a warning,
          removing a link, limiting distribution, changing a handle, requiring an
          account change, temporarily restricting access, or terminating an account.
        </p>
        <p>
          Urgent threats, phishing, malware, child exploitation, active compromise,
          or serious service disruption may require immediate action without prior
          notice. We may preserve and disclose relevant records when required by
          law or reasonably necessary to protect users and investigate abuse.
        </p>
        <p>
          The final policy must define a workable appeal process, response targets,
          and record-retention schedule before public moderation begins.
        </p>
      </>
    ),
  },
  {
    id: "reporting",
    title: "Report a violation",
    content: (
      <>
        <p>
          Use the report route for the affected handle, for example
          <Link href="/report/example"> /report/example</Link>, or email
          <a href="mailto:safety@socialize.dev"> safety@socialize.dev</a>. Include
          the profile URL, specific link or content, reason for the report, and any
          supporting context that can be shared safely.
        </p>
        <p>
          Send vulnerabilities privately to
          <a href="mailto:security@socialize.dev"> security@socialize.dev</a> instead
          of the abuse queue. For immediate danger, contact the emergency service
          or appropriate authority in your location first.
        </p>
        <p>
          Do not submit knowingly false reports, threaten reporters, or use the
          process to obtain private information. A report does not guarantee a
          particular outcome, but it should receive a review proportionate to the
          stated risk.
        </p>
      </>
    ),
  },
];

export default function AcceptableUsePage() {
  return (
    <LegalPage
      contactEmail="safety@socialize.dev"
      sections={sections}
      summary="These draft rules protect people from harmful links, impersonation, security abuse, privacy violations, and infrastructure misuse."
      title="Acceptable Use Policy"
      related={[
        {
          href: "/terms",
          title: "Terms of Service",
          description: "The agreement governing hosted accounts and profiles.",
        },
        {
          href: "/security",
          title: "Security",
          description: "How to report a vulnerability without publishing it.",
        },
        {
          href: "/report/example",
          title: "Profile reporting guide",
          description: "The information needed to review a public-profile report.",
        },
      ]}
    />
  );
}
