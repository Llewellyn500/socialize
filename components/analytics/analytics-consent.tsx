"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

type ConsentChoice = "granted" | "denied" | null;

const STORAGE_KEY = "socialize-analytics-consent";

export function AnalyticsConsent({ measurementId }: { measurementId?: string }) {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setChoice(stored === "granted" || stored === "denied" ? stored : null);
    setReady(true);
  }, []);

  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId) || !ready) {
    return null;
  }

  function choose(nextChoice: Exclude<ConsentChoice, null>) {
    window.localStorage.setItem(STORAGE_KEY, nextChoice);
    Reflect.set(window, `ga-disable-${measurementId}`, nextChoice === "denied");
    window.gtag?.("consent", "update", {
      analytics_storage: nextChoice,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    setChoice(nextChoice);
  }

  return (
    <>
      {choice === "granted" ? <GoogleAnalytics measurementId={measurementId} /> : null}
      {choice === null ? (
        <aside
          aria-labelledby="analytics-consent-title"
          className="analytics-consent"
          role="dialog"
        >
          <div>
            <span>Optional analytics</span>
            <strong id="analytics-consent-title">Help improve Socialize?</strong>
            <p>
              Allow Google Analytics to measure page visits and navigation. We do
              not enable advertising storage or send account and profile fields.
              Read the <Link href="/cookies">Cookie Policy</Link>.
            </p>
          </div>
          <div className="analytics-consent__actions">
            <button type="button" onClick={() => choose("denied")}>Decline</button>
            <button className="is-primary" type="button" onClick={() => choose("granted")}>Allow analytics</button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
