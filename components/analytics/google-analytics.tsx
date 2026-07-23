"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __socializeGaConfigured?: Record<string, boolean>;
  }
}

const staticRoutes = new Set([
  "/",
  "/acceptable-use",
  "/cookies",
  "/dashboard",
  "/docs",
  "/forgot-password",
  "/onboarding",
  "/privacy",
  "/security",
  "/self-host",
  "/sign-in",
  "/sign-up",
  "/sponsor",
  "/terms",
  "/verify-email",
]);

function analyticsPage(pathname: string) {
  if (pathname.startsWith("/report/")) {
    return { path: "/report/:handle", title: "Report a profile · Socialize" };
  }

  if (/^\/[^/]+$/.test(pathname) && !staticRoutes.has(pathname)) {
    return { path: "/:handle", title: "Developer profile · Socialize" };
  }

  return { path: pathname, title: document.title };
}

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !window.gtag) return;

    const page = analyticsPage(pathname);
    const pageContext = {
      page_title: page.title,
      page_location: `${window.location.origin}${page.path}`,
      page_path: page.path,
    };

    window.gtag("set", pageContext);
    window.__socializeGaConfigured ||= {};

    if (!window.__socializeGaConfigured[measurementId]) {
      window.gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
      });
      window.__socializeGaConfigured[measurementId] = true;
    }

    window.gtag("event", "page_view", {
      ...pageContext,
    });
  }, [measurementId, pathname, ready]);

  useEffect(() => {
    Reflect.set(window, `ga-disable-${measurementId}`, false);
    return () => {
      Reflect.set(window, `ga-disable-${measurementId}`, true);
    };
  }, [measurementId]);

  const safeId = JSON.stringify(measurementId);

  return (
    <>
      <Script id="socialize-ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
          window.gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          window.gtag('js', new Date());
          window['ga-disable-' + ${safeId}] = false;
        `}
      </Script>
      <Script
        id="socialize-ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
    </>
  );
}
