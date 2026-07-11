import type { ReactNode } from "react";
import {
  ActionBand,
  ContentSection,
  LegalDraftNote,
  PageHero,
  PageLayout,
  ResourceLinks,
  ServiceShell,
  serviceContentStyles as styles,
} from "@/components/service-content";

export type LegalSection = {
  id: string;
  title: string;
  lead?: string;
  content: ReactNode;
};

type LegalPageProps = {
  title: string;
  summary: string;
  contactEmail: string;
  sections: LegalSection[];
  related?: Array<{ href: string; title: string; description: string }>;
};

export function LegalPage({
  title,
  summary,
  contactEmail,
  sections,
  related = [],
}: LegalPageProps) {
  const nav = sections.map((section) => ({
    href: `#${section.id}`,
    label: section.title,
  }));

  return (
    <ServiceShell>
      <PageHero
        section={title}
        title={title}
        summary={summary}
        tone="moss"
        aside={
          <div className={styles.asideStatement}>
            <span>Product policy draft</span>
            <strong>Last updated July 11, 2026.</strong>
            <p>Prepared for operational planning and counsel review before launch.</p>
          </div>
        }
      />

      <PageLayout nav={nav} navLabel="In this policy">
        <LegalDraftNote />
        {sections.map((section) => (
          <ContentSection
            id={section.id}
            key={section.id}
            lead={section.lead}
            title={section.title}
          >
            {section.content}
          </ContentSection>
        ))}

        {related.length ? (
          <ContentSection id="related" title="Related policies">
            <ResourceLinks links={related} />
          </ContentSection>
        ) : null}
      </PageLayout>

      <ActionBand
        title="A question about this policy?"
        copy={`Write to ${contactEmail}. Include the account or profile URL involved, but do not email passwords, access tokens, or service-account keys.`}
        links={[
          { href: `mailto:${contactEmail}`, label: `Email ${contactEmail}` },
          { href: "/docs#help", label: "Find the right support channel" },
        ]}
      />
    </ServiceShell>
  );
}
