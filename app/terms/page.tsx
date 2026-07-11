import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Draft terms for Socialize accounts, hosted developer profiles, content, handles, and service access.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement and scope",
    content: (
      <>
        <p>
          These Terms govern access to the managed Socialize website, accounts,
          editor, hosted profiles, and related support. By creating an account or
          using the managed service, you agree to these Terms and the policies they
          incorporate.
        </p>
        <p>
          The final Terms must name the legal service operator and its contact
          address before launch. If you do not agree, do not create or use a hosted
          account. Browsing a public profile remains subject to applicable law and
          the provisions that reasonably apply to visitors.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and accounts",
    content: (
      <>
        <p>
          You must be at least 13 years old and old enough to enter a binding
          agreement where you live. If you use Socialize for an organization, you
          represent that you have authority to bind it to these Terms.
        </p>
        <p>
          Provide accurate account information, protect every connected sign-in
          method, and tell us promptly about suspected unauthorized access. You are
          responsible for activity carried out through your account until you
          report compromise and we have a reasonable opportunity to act.
        </p>
        <p>
          You may not transfer or sell an account or reserved handle without
          written permission. Socialize support will not ask for your password,
          OAuth secret, recovery code, or service-account key.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "The service",
    lead: "Socialize provides a profile editor and public page, not permanent storage or an identity guarantee.",
    content: (
      <>
        <p>
          The hosted service lets you create and publish a developer-focused page
          containing identity, project, writing, contact, and social links. We may
          add, remove, limit, or change features to maintain security, comply with
          law, or improve the product.
        </p>
        <p>
          We aim to provide reasonable notice before a material change that removes
          paid functionality or requires a data migration. Early, preview, or beta
          features may change more quickly and may be withdrawn.
        </p>
        <p>
          You should retain copies of important profile content and destination
          URLs. Socialize is not a source-code host, archive, emergency contact
          system, or substitute for your own records.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    content: (
      <>
        <p>
          You keep ownership of content you submit. You grant Socialize a
          non-exclusive, worldwide, royalty-free license to host, cache, reproduce,
          format, and display that content only as needed to operate, secure,
          promote, and improve the service. This license ends when content is
          deleted, except for reasonable backup periods, legal obligations, and
          copies already made by visitors or third parties.
        </p>
        <p>
          You represent that you have the rights and permissions needed to publish
          the content and links. Do not submit confidential information, credentials,
          private repository access, or another person&apos;s personal information
          without a lawful basis and appropriate permission.
        </p>
        <p>
          Socialize may create limited screenshots or previews of public profiles
          to explain or promote the product. The final Terms should confirm whether
          users may opt out of promotional use before this clause is approved.
        </p>
      </>
    ),
  },
  {
    id: "handles",
    title: "Handles and profile URLs",
    content: (
      <>
        <p>
          Handles are provided for use with the service, not sold as property.
          They must be reasonably connected to you or your organization and may
          not impersonate, mislead, infringe rights, or reserve names primarily for
          resale.
        </p>
        <p>
          We may rename, release, reserve, or suspend a handle after notice when
          reasonably possible, including for verified impersonation, trademark
          concerns, prolonged inactivity under a published policy, technical
          conflicts, or legal requirements. A handle does not grant trademark or
          other rights in the underlying name.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>
          You must follow the <Link href="/acceptable-use">Acceptable Use Policy</Link>.
          In particular, do not use profiles or links for malware, credential
          theft, unlawful content, harassment, impersonation, deceptive redirects,
          privacy violations, or attempts to disrupt the service.
        </p>
        <p>
          We may review reported public content and account records needed to
          investigate a suspected violation. Enforcement can include link removal,
          reduced visibility, handle changes, temporary restriction, or account
          termination, depending on risk, context, and history.
        </p>
      </>
    ),
  },
  {
    id: "self-hosting",
    title: "Self-hosted edition",
    content: (
      <>
        <p>
          A self-hosted deployment is operated by the person who deploys it, not by
          the managed Socialize service. That operator controls Firebase, hosting,
          domains, security rules, backups, content, and legal compliance.
        </p>
        <p>
          Source-code rights must be stated in the license distributed with the
          repository. This draft does not create an additional source-code license.
          A clear repository license must be selected and added before the
          self-hosted edition is publicly distributed.
        </p>
        <p>
          Socialize does not promise support, uptime, compatibility, or data
          recovery for an independent deployment unless a separate written
          agreement states otherwise.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <>
        <p>
          Socialize relies on providers such as Firebase and Vercel and may let you
          sign in with Google or GitHub. Public profile links lead to websites we
          do not operate. Those services have their own terms, privacy practices,
          availability, and security controls.
        </p>
        <p>
          We are not responsible for third-party content or a destination&apos;s
          conduct merely because a profile links to it. We may block a destination
          when needed to address abuse or protect users.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "Fees and sponsorship",
    content: (
      <>
        <p>
          Any paid plan, tax, renewal period, refund rule, and included feature
          must be shown before purchase. Unless checkout states otherwise, fees are
          charged in advance and are not refundable except where law requires.
          Final billing terms must be completed before paid plans launch.
        </p>
        <p>
          GitHub sponsorship supports project maintenance and is not payment for a
          hosted account, delivery date, roadmap vote, or service-level agreement.
          Separate written scopes govern any commissioned work.
        </p>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspension and termination",
    content: (
      <>
        <p>
          You may stop using the service and request account deletion. We may
          restrict or terminate access when reasonably necessary for a material
          policy violation, legal requirement, security risk, nonpayment, or harm
          to users or infrastructure.
        </p>
        <p>
          When risk permits, we will try to give notice and an opportunity to fix
          the problem. Immediate action may be necessary for phishing, malware,
          child exploitation, credible threats, active compromise, or service
          disruption. Provisions that by their nature should survive termination,
          including ownership, disclaimers, liability limits, and dispute terms,
          continue to apply.
        </p>
      </>
    ),
  },
  {
    id: "warranties-liability",
    title: "Warranties and liability",
    content: (
      <>
        <p>
          To the extent permitted by law, the service is provided on an "as is"
          and "as available" basis. We do not guarantee uninterrupted operation,
          permanent handles, search placement, traffic, employment outcomes, or
          preservation of third-party content.
        </p>
        <p>
          The final limitation-of-liability clause, monetary cap, exclusions, and
          any consumer-law carve-outs must be selected with counsel based on the
          operator&apos;s jurisdiction and paid-plan structure. They are intentionally
          not invented in this draft.
        </p>
      </>
    ),
  },
  {
    id: "law-changes-contact",
    title: "Law, changes, and contact",
    content: (
      <>
        <p>
          The governing law, venue, dispute process, and legal operator address
          must be inserted before launch. Nothing in the final Terms should remove
          mandatory rights that applicable consumer law does not allow parties to
          waive.
        </p>
        <p>
          We may update these Terms. Material changes will receive reasonable
          notice and will apply prospectively where required. Questions can be sent
          to <a href="mailto:legal@socialize.dev">legal@socialize.dev</a>.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      contactEmail="legal@socialize.dev"
      sections={sections}
      summary="These draft terms describe accounts, hosted profiles, user content, handles, and the boundary between the managed service and independent deployments."
      title="Terms of Service"
      related={[
        {
          href: "/acceptable-use",
          title: "Acceptable Use Policy",
          description: "Content and behavior that are not allowed on hosted profiles.",
        },
        {
          href: "/privacy",
          title: "Privacy Policy",
          description: "How the managed service expects to handle information.",
        },
        {
          href: "/sponsor",
          title: "Sponsorship",
          description: "What project support funds and what it does not purchase.",
        },
      ]}
    />
  );
}
