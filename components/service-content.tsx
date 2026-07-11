import Link from "next/link";
import type { ReactNode } from "react";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiInfo,
} from "react-icons/fi";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import styles from "@/components/service-content.module.css";

export type PageNavItem = {
  href: string;
  label: string;
};

type ServiceShellProps = {
  children: ReactNode;
};

type PageHeroProps = {
  section: string;
  title: string;
  summary: string;
  aside?: ReactNode;
  actions?: ReactNode;
  tone?: "ink" | "moss" | "signal";
};

type ContentSectionProps = {
  children: ReactNode;
  id: string;
  title: string;
  lead?: string;
};

type Step = {
  title: string;
  body: ReactNode;
  code?: string;
  label?: string;
};

type NoticeProps = {
  children: ReactNode;
  title: string;
  tone?: "default" | "signal" | "warning";
};

type ActionLink = {
  href: string;
  label: string;
  external?: boolean;
};

export function ServiceShell({ children }: ServiceShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  section,
  title,
  summary,
  aside,
  actions,
  tone = "ink",
}: PageHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">
            <FiArrowLeft aria-hidden="true" /> Home
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{section}</span>
        </nav>
        <h1>{title}</h1>
        <p>{summary}</p>
        {actions ? <div className={styles.heroActions}>{actions}</div> : null}
      </div>
      <div className={`${styles.heroAside} ${styles[`heroAside_${tone}`]}`}>
        {aside ?? (
          <div className={styles.asideStatement}>
            <span>Socialize service notes</span>
            <strong>Useful details, written for people who build things.</strong>
          </div>
        )}
      </div>
    </header>
  );
}

export function PageAction({
  href,
  children,
  secondary = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  external?: boolean;
}) {
  const className = secondary ? styles.actionSecondary : styles.actionPrimary;

  if (external) {
    return (
      <a className={className} href={href} rel="noreferrer" target="_blank">
        {children} <FiArrowUpRight aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children} <FiArrowUpRight aria-hidden="true" />
    </Link>
  );
}

export function PageLayout({
  nav,
  children,
  navLabel = "On this page",
}: {
  nav: PageNavItem[];
  children: ReactNode;
  navLabel?: string;
}) {
  return (
    <div className={styles.pageLayout}>
      <aside className={styles.pageNav}>
        <p>{navLabel}</p>
        <nav aria-label={navLabel}>
          {nav.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className={styles.pageBody}>{children}</div>
    </div>
  );
}

export function ContentSection({
  children,
  id,
  title,
  lead,
}: ContentSectionProps) {
  return (
    <section className={styles.contentSection} id={id}>
      <div className={styles.sectionHeading}>
        <h2>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </div>
      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

export function Steps({ items }: { items: Step[] }) {
  return (
    <ol className={styles.steps}>
      {items.map((item, index) => (
        <li key={item.title}>
          <span className={styles.stepNumber} aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className={styles.stepCopy}>
            <h3>{item.title}</h3>
            <div>{item.body}</div>
            {item.code ? <CodeBlock label={item.label}>{item.code}</CodeBlock> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CodeBlock({
  children,
  label = "Terminal",
}: {
  children: string;
  label?: string;
}) {
  return (
    <figure className={styles.codeBlock}>
      <figcaption>
        <span>{label}</span>
        <span aria-hidden="true">● ● ●</span>
      </figcaption>
      <pre>
        <code>{children}</code>
      </pre>
    </figure>
  );
}

export function Notice({
  children,
  title,
  tone = "default",
}: NoticeProps) {
  return (
    <aside className={`${styles.notice} ${styles[`notice_${tone}`]}`}>
      <FiInfo aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}

export function CheckList({ children }: { children: ReactNode }) {
  return <ul className={styles.checkList}>{children}</ul>;
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li>
      <FiCheck aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export function FactGrid({
  facts,
}: {
  facts: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className={styles.factGrid}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResourceLinks({
  links,
}: {
  links: Array<{ href: string; title: string; description: string; external?: boolean }>;
}) {
  return (
    <div className={styles.resourceLinks}>
      {links.map((link) => {
        const content = (
          <>
            <span>
              <strong>{link.title}</strong>
              <small>{link.description}</small>
            </span>
            <FiArrowUpRight aria-hidden="true" />
          </>
        );

        return link.external ? (
          <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
            {content}
          </a>
        ) : (
          <Link href={link.href} key={link.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function ActionBand({
  title,
  copy,
  links,
}: {
  title: string;
  copy: string;
  links: ActionLink[];
}) {
  return (
    <section className={styles.actionBand}>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <div className={styles.actionBandLinks}>
        {links.map((link, index) => (
          <PageAction
            external={link.external}
            href={link.href}
            key={link.href}
            secondary={index > 0}
          >
            {link.label}
          </PageAction>
        ))}
      </div>
    </section>
  );
}

export function LegalDraftNote() {
  return (
    <Notice title="Draft for legal review" tone="warning">
      <p>
        This page is an operational product draft, not legal advice. It must be
        reviewed and approved by qualified counsel before Socialize opens to the
        public.
      </p>
    </Notice>
  );
}

export { styles as serviceContentStyles };
