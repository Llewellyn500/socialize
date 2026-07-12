import type { Metadata } from "next";
import Link from "next/link";
import {
  ActionBand,
  CheckItem,
  CheckList,
  ContentSection,
  PageAction,
  PageHero,
  PageLayout,
  ResourceLinks,
  ServiceShell,
  serviceContentStyles as styles,
} from "@/components/service-content";
import { ReportForm } from "@/components/report-form";

type ReportPageProps = {
  params: Promise<{ handle: string }>;
};

function cleanHandle(value: string): string {
  return value
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 64) || "profile";
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const handle = cleanHandle((await params).handle);

  return {
    title: `Report @${handle}`,
    description: `Help and reporting guidance for the Socialize profile @${handle}.`,
    alternates: { canonical: `/report/${encodeURIComponent(handle)}` },
    robots: { index: false, follow: false },
  };
}

export default async function ReportProfilePage({ params }: ReportPageProps) {
  const handle = cleanHandle((await params).handle);
  const profilePath = `/${handle}`;
  const subject = encodeURIComponent(`Report @${handle} on Socialize`);
  const body = encodeURIComponent(
    `Profile: https://socialize.you/${handle}\n\nReason:\n\nSpecific link or content:\n\nContext or evidence:\n`,
  );
  const reportEmail = `mailto:safety@socialize.you?subject=${subject}&body=${body}`;

  const pageNav = [
    { href: "#report-form", label: "Report details" },
    { href: "#include", label: "What to include" },
    { href: "#review", label: "How review works" },
    { href: "#urgent", label: "Urgent cases" },
  ];

  return (
    <ServiceShell>
      <PageHero
        section={`Report @${handle}`}
        title={`Report @${handle}`}
        summary="Use this route for impersonation, phishing, malware, harassment, privacy harm, or another hosted-profile policy concern."
        tone="signal"
        actions={
          <>
            <PageAction href={reportEmail}>Email this report</PageAction>
            <PageAction href={profilePath} secondary>
              Return to the profile
            </PageAction>
          </>
        }
        aside={
          <div className={styles.asideStatement}>
            <span>Profile report</span>
            <strong>@{handle}</strong>
            <p>Reports should identify specific content and the risk it creates.</p>
          </div>
        }
      />

      <PageLayout nav={pageNav}>
        <ContentSection
          id="report-form"
          title="Report details"
          lead="Send a focused report to the private moderation queue, or use the safety email if submission is unavailable."
        >
          <ReportForm fallbackEmail={reportEmail} handle={handle} />

          <ResourceLinks
            links={[
              {
                href: reportEmail,
                title: "Send a report by email",
                description: `A prefilled message for @${handle} to safety@socialize.you.`,
              },
              {
                href: "/acceptable-use#reporting",
                title: "Read the reporting policy",
                description: "Report categories, enforcement factors, and channel guidance.",
              },
            ]}
          />
        </ContentSection>

        <ContentSection
          id="include"
          title="What to include"
          lead="A precise report can be reviewed faster and with less risk to everyone involved."
        >
          <CheckList>
            <CheckItem>
              The full profile URL and the exact link, text, or image involved.
            </CheckItem>
            <CheckItem>
              The closest reason: impersonation, phishing, malware, harassment,
              private information, rights concern, or another policy issue.
            </CheckItem>
            <CheckItem>
              A short explanation of who may be harmed and why the content creates
              that risk.
            </CheckItem>
            <CheckItem>
              A screenshot, timestamp, or destination URL when it can be shared
              without exposing additional private data.
            </CheckItem>
            <CheckItem>
              A safe contact address if you want a request for clarification or an
              outcome notice.
            </CheckItem>
          </CheckList>
          <p>
            Do not send passwords, access tokens, private keys, identity documents,
            or more personal information than the review needs. Do not repeatedly
            open a suspected malicious link to gather evidence.
          </p>
          <p>
            Copyright or trademark notices that require formal legal statements can
            be sent to <a href="mailto:legal@socialize.you">legal@socialize.you</a>.
            A security weakness in Socialize itself belongs at
            <a href="mailto:security@socialize.you"> security@socialize.you</a>.
          </p>
        </ContentSection>

        <ContentSection
          id="review"
          title="How review works"
          lead="A report begins a review. It does not decide the outcome by itself."
        >
          <p>
            Socialize may review the public profile, destination, relevant account
            records, prior reports, and context supplied by the profile owner or
            reporter. The response depends on severity, evidence, intent, affected
            people, prior violations, and the likelihood of ongoing harm.
          </p>
          <p>
            Possible actions include no action, a request for more information, a
            warning, link removal, handle change, temporary restriction, or account
            termination. Immediate threats, phishing, malware, child exploitation,
            or active compromise may require action before contacting the owner.
          </p>
          <p>
            We may not be able to share private account details, investigation
            methods, or all enforcement reasons with a reporter. Knowingly false or
            retaliatory reports can themselves violate the
            <Link href="/acceptable-use"> Acceptable Use Policy</Link>.
          </p>
        </ContentSection>

        <ContentSection
          id="urgent"
          title="Urgent and specialized cases"
          lead="Use the fastest channel that can address the actual risk."
        >
          <h3>Immediate physical danger</h3>
          <p>
            Contact the emergency service or appropriate authority in your location
            first. Then send the profile URL and reference information to
            <a href="mailto:safety@socialize.you?subject=Urgent%20hosted-profile%20safety%20report"> safety@socialize.you</a>.
          </p>
          <h3>Credentials or active compromise</h3>
          <p>
            Revoke exposed credentials and contact the affected provider. Send a
            private technical report through the <Link href="/security#report">security channel</Link>.
          </p>
          <h3>Self-hosted profile</h3>
          <p>
            Socialize cannot remove content from an independently operated domain.
            Contact that site&apos;s operator or hosting provider. If the deployment
            creates misleading use of Socialize branding or reveals a defect in the
            unmodified template, include that context in your message.
          </p>
        </ContentSection>
      </PageLayout>

      <ActionBand
        title={`Ready to report @${handle}?`}
        copy="Use the prefilled email, identify the exact content, and keep unrelated personal data out of the message."
        links={[
          { href: reportEmail, label: "Open the report email" },
          { href: profilePath, label: "Return to the profile" },
        ]}
      />
    </ServiceShell>
  );
}
