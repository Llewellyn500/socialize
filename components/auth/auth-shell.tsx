import type { ReactNode } from "react";
import { FiCheck, FiCode, FiGlobe } from "react-icons/fi";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { MotionToggle } from "@/components/motion-toggle";
import styles from "./auth.module.css";

type AuthShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  context?: string;
  wide?: boolean;
};

const benefits = [
  {
    icon: FiGlobe,
    title: "One address for your work",
    copy: "Publish projects, writing, profiles, and contact links under one developer-first page.",
  },
  {
    icon: FiCode,
    title: "Your data stays portable",
    copy: "Export a structured profile backup and move to the self-hosted starter with the documented conversion guide.",
  },
  {
    icon: FiCheck,
    title: "Start small, change it later",
    copy: "Verify your email, claim a handle, then add links, themes, and integrations from your workspace.",
  },
] as const;

export function AuthShell({
  children,
  title,
  description,
  context = "Hosted workspace",
  wide = false,
}: AuthShellProps) {
  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">
        Skip to account form
      </a>
      <SiteHeader />
      <main
        id="main-content"
        className={`${styles.authMain} ${wide ? styles.wide : ""}`}
      >
        <section className={styles.introPane} aria-labelledby="auth-page-title">
          <div className={styles.introContent}>
            <p className={styles.contextLabel}>{context}</p>
            <h1 id="auth-page-title" className={styles.introTitle}>
              {title}
            </h1>
            <p className={styles.introDescription}>{description}</p>
            <p className={styles.introDescription}>
              No trial, no credit card, and no feature gate. Sponsorship is optional support for the project.
            </p>
            <div className={styles.benefitList}>
              {benefits.map(({ icon: Icon, title: benefitTitle, copy }) => (
                <div className={styles.benefit} key={benefitTitle}>
                  <Icon aria-hidden="true" />
                  <div>
                    <strong>{benefitTitle}</strong>
                    <span>{copy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.introFoot}>
            <span>Hosted by Socialize</span>
            <code>socialize.you/your-handle</code>
          </div>
        </section>
        <section className={styles.formPane} aria-label="Account details">
          <div className={styles.formToolbar}><ThemeToggle /><MotionToggle /></div>
          <div className={styles.formWrap}>{children}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
