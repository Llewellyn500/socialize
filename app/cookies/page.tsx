import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Draft explanation of cookies and browser storage used by Socialize for authentication, security, preferences, and optional analytics.",
  alternates: { canonical: "/cookies" },
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "Current launch position",
    content: (
      <>
        <p>
          Socialize intends to launch without advertising cookies or cross-site
          behavioral tracking. Google Analytics 4 is optional and is loaded only
          after you actively allow analytics. If you decline, the analytics tag is
          not loaded.
        </p>
        <p>
          Signed-in areas use browser storage required by Firebase Authentication
          to maintain a session, complete OAuth flows, prevent abuse, and remember
          limited product preferences. The production deployment must be scanned
          before launch and after material provider changes to verify this policy.
        </p>
      </>
    ),
  },
  {
    id: "technologies",
    title: "Technologies covered",
    lead: "This policy uses “cookies” as a convenient label for several browser-side storage mechanisms.",
    content: (
      <>
        <h3>Cookies</h3>
        <p>
          Small values sent with web requests. A hosting, authentication, security,
          or load-balancing provider may set them when necessary for a protected
          route or session.
        </p>
        <h3>Local storage and IndexedDB</h3>
        <p>
          Firebase Authentication may use browser databases to remember the signed-in
          user and refresh the session. Socialize also stores your analytics choice
          under <code>socialize-analytics-consent</code> so it survives a browser
          restart.
        </p>
        <h3>Session storage</h3>
        <p>
          Temporary storage may support Google or GitHub redirect state and protect
          the integrity of an authentication attempt. It normally clears when the
          browser session ends.
        </p>
        <h3>Similar delivery records</h3>
        <p>
          Server logs, cache headers, and content-delivery records are not cookies,
          but may contain device or request information. They are described in the
          <Link href="/privacy"> Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "necessary",
    title: "Strictly necessary storage",
    content: (
      <>
        <p>
          Necessary storage supports a feature you request or protects the service.
          It may be used to:
        </p>
        <ul>
          <li>Keep a user signed in through Firebase Authentication.</li>
          <li>Complete and validate Google or GitHub OAuth redirects.</li>
          <li>Protect against cross-site request forgery, replay, or session abuse.</li>
          <li>Route requests reliably and detect operational failures.</li>
          <li>Remember a security or consent choice where the law requires it.</li>
        </ul>
        <p>
          Blocking necessary storage may prevent sign-in, the dashboard, or account
          security features from working. Public profiles should remain readable
          without an account session.
        </p>
      </>
    ),
  },
  {
    id: "preferences-analytics",
    title: "Preferences and analytics",
    content: (
      <>
        <h3>Preferences</h3>
        <p>
          Socialize may remember a theme, motion, editor, or accessibility
          preference on the device. Where the preference is not necessary, it
          should be stored only after the user actively chooses it and should have
          a clear reset path.
        </p>
        <h3>Analytics</h3>
        <p>
          After consent, Socialize loads Google Analytics 4 to measure aggregate
          page visits and navigation. Manual page-view events contain the page path
          and title but omit URL query strings, account fields, and profile fields.
          Advertising storage, ad personalization, and Google advertising signals
          remain disabled.
        </p>
        <p>
          Google Analytics may set identifiers such as <code>_ga</code> and
          <code>_ga_*</code> after consent. Their exact lifetime is controlled by
          the production Google Analytics property and may also be affected by your
          browser settings.
        </p>
        <h3>Advertising</h3>
        <p>
          Socialize does not intend to use advertising cookies, sell browsing data,
          or build cross-service visitor profiles. A future business-model change
          would require an updated policy and any notice or consent required by law.
        </p>
      </>
    ),
  },
  {
    id: "providers",
    title: "Authentication providers",
    content: (
      <>
        <p>
          Choosing Google or GitHub sign-in opens an authentication flow controlled
          in part by that provider. The provider may use its own cookies or account
          session under its policy. Socialize receives the authentication result and
          account fields permitted by the sign-in flow, not the provider password.
        </p>
        <p>
          Firebase Authentication can persist its own state in the browser so you
          do not need to sign in on every page. Signing out clears the active
          Socialize session, but it does not sign you out of Google, GitHub, or other
          websites.
        </p>
      </>
    ),
  },
  {
    id: "choices",
    title: "Your choices",
    content: (
      <>
        <p>
          Browser controls can delete or block cookies, local storage, IndexedDB,
          and site permissions. The exact controls depend on your browser. Clearing
          Socialize site data will generally sign you out and reset local preferences.
        </p>
        <p>
          Socialize asks before loading Google Analytics. Use the persistent
          <strong> Privacy choices</strong> control to withdraw a previous choice or
          choose again. Withdrawing sends a denied analytics consent update and
          stops future collection; you can remove previously stored analytics
          cookies through your browser's site-data controls.
        </p>
        <p>
          Questions or requests can be sent to
          <a href="mailto:privacy@socialize.dev"> privacy@socialize.dev</a>.
        </p>
      </>
    ),
  },
  {
    id: "self-hosted",
    title: "Self-hosted instances",
    content: (
      <>
        <p>
          The operator of a self-hosted Socialize instance selects its Firebase
          project, domain, hosting, integrations, and any additional analytics. That
          operator is responsible for scanning the deployed site, publishing an
          accurate cookie notice, and collecting consent where required.
        </p>
        <p>
          This managed-service policy does not describe storage added by a fork,
          reverse proxy, hosting provider, custom script, or linked destination.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Verification and changes",
    content: (
      <>
        <p>
          Before approval, the operator should run a production browser-storage and
          network scan while signed out, signing in with each provider, editing a
          profile, and signing out. Provider names, storage purposes, and lifetimes
          should be added here if the scan finds persistent identifiers.
        </p>
        <p>
          Material changes will be posted with a new update date. Where law requires
          consent for a new purpose, that purpose will not rely only on continued
          use of the service.
        </p>
      </>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      contactEmail="privacy@socialize.dev"
      sections={sections}
      summary="This draft describes browser storage used for sign-in, security, preferences, and consented Google Analytics, with no advertising trackers at launch."
      title="Cookie Policy"
      related={[
        {
          href: "/privacy",
          title: "Privacy Policy",
          description: "The wider account, profile, support, and service data picture.",
        },
        {
          href: "/security",
          title: "Security",
          description: "How sessions, authorization, and vulnerability reports are handled.",
        },
      ]}
    />
  );
}
