import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Draft privacy policy for Socialize accounts, public developer profiles, optional analytics, and service operations.",
  alternates: { canonical: "/privacy" },
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope",
    lead: "This draft covers the managed Socialize service, not a developer's independent deployment.",
    content: (
      <>
        <p>
          This Privacy Policy explains how Socialize intends to collect, use,
          disclose, retain, and protect information when you visit the service,
          create an account, publish a hosted profile, contact support, or report
          abuse.
        </p>
        <p>
          A self-hosted Socialize operator controls their own backend project,
          deployment, domain, and visitor data. Their privacy practices are not
          controlled by the managed Socialize service. Review the policy published
          by that operator before using a self-hosted instance.
        </p>
      </>
    ),
  },
  {
    id: "information",
    title: "Information we handle",
    lead: "The service needs account data, public profile content, and a limited operational record."
    ,
    content: (
      <>
        <h3>Account and sign-in information</h3>
        <p>
          Account sign-in may provide a user ID, email address, display
          name, avatar, verified-email status, and the sign-in provider you chose.
          Google and GitHub authenticate you directly; Socialize does not receive
          your password for those providers.
        </p>
        <h3>Profile content</h3>
        <p>
          We store the name, handle, role, bio, location, availability, avatar,
          accent choice, section headings, project links, social links, and other
          content you choose to publish. Optional uploaded link icons, thumbnails,
          and heading images are stored in publicly readable cloud storage because
          public profiles must be able to render them. A published profile record is publicly readable. When
          developer activity is enabled, its GitHub username, repository selections,
          and display settings are part of that public record. When it is disabled,
          the hosted service omits those settings from the public profile and keeps
          them only in the owner-private account document.
        </p>
        <p>
          If you enable developer activity, Socialize sends the public GitHub
          username and relevant <code>owner/repository</code> names to GitHub from
          the server. We temporarily process and cache public event dates, commit
          SHAs and first-line messages, repository names and URLs, commit dates,
          contribution dates, counts, levels and years, public push-day totals, and
          repository-language data. Full contribution calendars require the optional
          public-only server token; otherwise the calendar is a labeled sample. Results
          may be incomplete or delayed. They come from GitHub and are not
          verified proof that a Socialize account owns a GitHub account or repository.
          The configured server token must not have private-repository access.
        </p>
        <h3>Service and device information</h3>
        <p>
          Hosting and security systems may record request time, IP address, user
          agent, route, referrer, response status, authentication events, and
          diagnostic details. The GitHub activity route also uses a source IP for
          a best-effort limit of 30 requests per 60 seconds. If you allow optional analytics, Google Analytics
          may also process the page path and title, referrer, browser and device
          details, and session-level measurements. Socialize's manual page-view
          events omit URL query strings and do not include account or profile
          fields.
        </p>
        <h3>Messages and reports</h3>
        <p>
          If you contact support, sponsorship, privacy, legal, or security channels,
          we receive the message, contact details, attachments, and related account
          or profile information you provide.
        </p>
      </>
    ),
  },
  {
    id: "analytics",
    title: "Optional analytics",
    lead: "Google Analytics stays off until you actively allow it.",
    content: (
      <>
        <p>
          If you choose <strong>Allow analytics</strong>, Socialize loads Google
          Analytics 4 to understand aggregate page visits and navigation. We deny
          advertising storage, ad personalization, and Google advertising signals.
          Declining means the analytics tag is not loaded.
        </p>
        <p>
          Your choice is stored on this device. You can withdraw it at any time
          through the <strong>Privacy choices</strong> control. The
          <Link href="/cookies"> Cookie Policy</Link> describes related browser
          storage and controls.
        </p>
      </>
    ),
  },
  {
    id: "uses",
    title: "How we use information",
    content: (
      <ul>
        <li>Create and secure accounts, sessions, and profile ownership.</li>
        <li>Store, render, and deliver the hosted profile you configure.</li>
        <li>Request, cache, sample, and display public GitHub activity you enable.</li>
        <li>Prevent impersonation, abuse, fraud, malware, and unauthorized access.</li>
        <li>Debug failures, maintain availability, and improve accessibility.</li>
        <li>Measure aggregate site traffic when you allow optional analytics.</li>
        <li>Answer support, privacy, legal, sponsorship, and security messages.</li>
        <li>Enforce the Terms and Acceptable Use Policy.</li>
        <li>Meet legal obligations and respond to valid legal process.</li>
      </ul>
    ),
  },
  {
    id: "legal-bases",
    title: "Legal bases",
    lead: "Where law requires a legal basis, the basis depends on the purpose."
    ,
    content: (
      <>
        <p>
          We expect to process account and profile information to perform the
          service contract you request. We may rely on legitimate interests for
          service security, fraud prevention, support, and careful product
          improvement, after considering the effect on users. We may use consent
          for optional technologies or communications where required, and process
          information to comply with law or protect vital interests in an emergency.
        </p>
        <p>
          The final policy must identify the legal operator, relevant jurisdictions,
          and any additional lawful bases confirmed during counsel review.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How information is shared",
    content: (
      <>
        <p>We may disclose information in the following limited situations:</p>
        <ul>
          <li>
            <strong>Public profile delivery.</strong> Enabled profile content is
            available to anyone who opens or discovers the public URL.
          </li>
          <li>
            <strong>Service providers.</strong> Cloud infrastructure providers handle
            account and profile storage, Vercel hosts and delivers the Next.js
            application, and Google Analytics provides optional aggregate traffic
            measurement after consent. Email, domain, and error-monitoring providers
            may also process information to operate the service under their terms
            and safeguards.
          </li>
          <li>
            <strong>Identity providers.</strong> Google or GitHub receives the
            authentication request when you choose that provider.
          </li>
          <li>
            <strong>Developer activity.</strong> GitHub receives server-side API
            requests for the public username and repositories needed to render an
            activity section you enable. GitHub is the third-party source of the
            resulting public commit, event, repository, and language metadata and
            handles those requests under its own terms and privacy practices.
          </li>
          <li>
            <strong>Legal and safety needs.</strong> We may disclose information
            when reasonably necessary to comply with valid process, protect rights
            or safety, investigate abuse, or defend legal claims.
          </li>
          <li>
            <strong>Business transfer.</strong> Information may transfer as part of
            a merger, financing, acquisition, reorganization, or sale, subject to
            appropriate notice and applicable law.
          </li>
        </ul>
        <p>
          Socialize does not intend to sell personal information or share it for
          cross-context behavioral advertising. The production service must be
          audited before launch to confirm that this statement remains accurate.
        </p>
      </>
    ),
  },
  {
    id: "public-content",
    title: "Public profiles and links",
    content: (
      <>
        <p>
          A hosted profile is public by design. Search engines, archives, link
          preview services, and visitors may index, cache, copy, screenshot, or
          redistribute content after publication. Deleting content from Socialize
          cannot erase copies controlled by other parties.
        </p>
        <p>
          Links take visitors to independent services with their own privacy
          practices. Socialize does not control what those destinations collect.
          Profile owners should avoid publishing confidential information or data
          about another person without permission.
        </p>
        <p>
          GitHub activity cards reproduce public information from GitHub, with a
          labeled sample when the full calendar is unavailable. They may be delayed,
          incomplete, attributed incorrectly,
          or changed at the source, and do not indicate verification, endorsement,
          employment, authorship of every pushed change, or affiliation with GitHub.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention and deletion",
    content: (
      <>
        <p>
          Account and profile data is generally kept while the account remains
          active. When an account is deleted, the intended launch target is removal
          from primary service systems within 30 days, unless a longer period is
          needed for security, dispute resolution, legal compliance, or recovery
          from accidental deletion.
        </p>
        <p>
          Backups and provider logs may age out on separate schedules. Abuse,
          transaction, or security records may be retained longer when reasonably
          necessary to prevent repeat harm or meet legal obligations. Final
          schedules must be confirmed against production provider settings before
          this policy is approved.
        </p>
        <p>
          Public GitHub events are revalidated after five minutes. Contribution
          calendars, repository, commit, and language results may remain in the application cache for up
          to one hour, and a successful CDN response may be served stale while it
          revalidates for up to one additional hour. GitHub&apos;s own public event
          feed may lag by about 30 seconds to six hours. Disabling the panel stops
          the profile from initiating new activity requests, but it does not erase
          third-party copies or cached responses before those windows expire.
        </p>
      </>
    ),
  },
  {
    id: "choices",
    title: "Your choices and rights",
    content: (
      <>
        <p>
          You can edit public profile content from the dashboard and control your
          chosen identity provider through that provider. Depending on your
          location, you may also have rights to access, correct, delete, restrict,
          object to, or receive a portable copy of personal information, and to
          withdraw consent where processing relies on consent.
        </p>
        <p>
          You can change or clear the GitHub username and repository selections,
          disable developer activity, or unpublish the profile from the dashboard.
          Disabling the feature removes its configuration from the public profile
          record on the next successful save; cached activity responses then expire
          on the schedule described above.
        </p>
        <p>
          Use the <strong>Privacy choices</strong> button available throughout the
          service to allow, decline, or withdraw optional analytics on this device.
          Withdrawing consent stops future analytics collection from Socialize.
        </p>
        <p>
          Send a request to <a href="mailto:privacy@socialize.you">privacy@socialize.you</a>.
          We may need to verify account control before acting. You may also complain
          to the data-protection authority available in your jurisdiction.
        </p>
        <p>
          Browser storage and cookie choices are described in the
          <Link href="/cookies"> Cookie Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "international-children",
    title: "International use and children",
    content: (
      <>
        <p>
          Socialize and its providers may process information in countries other
          than yours. Before launch, the operator must document relevant transfer
          mechanisms and provider locations for the users it serves.
        </p>
        <p>
          The managed service is not directed to children under 13, or a higher
          minimum age where local law requires it. If we learn that an ineligible
          child supplied personal information, we will take reasonable steps to
          remove it. A parent or guardian can contact the privacy address below.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Changes and contact",
    content: (
      <>
        <p>
          Material policy changes will be posted with a new update date and, where
          required, additional notice or consent. Continued use after an effective
          change is subject to the notice and applicable law.
        </p>
        <p>
          Privacy questions and rights requests can be sent to
          <a href="mailto:privacy@socialize.you"> privacy@socialize.you</a>. The
          legal name, registration details, and postal address of the service
          operator must be inserted here before public launch.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      contactEmail="privacy@socialize.you"
      sections={sections}
      summary="This draft explains the information Socialize expects to handle for developer accounts, public profiles, optional public GitHub activity, service operations, and consented analytics."
      title="Privacy Policy"
      related={[
        {
          href: "/cookies",
          title: "Cookie Policy",
          description: "Browser storage used for sign-in, security, and preferences.",
        },
        {
          href: "/terms",
          title: "Terms of Service",
          description: "Rules for accounts, profiles, content, and service access.",
        },
        {
          href: "/security",
          title: "Security",
          description: "Security boundaries and private vulnerability reporting.",
        },
      ]}
    />
  );
}
