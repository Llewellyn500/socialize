"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem", background: "#8a2be2", color: "#f7f3fb", textAlign: "center" }}>
      <div style={{ maxWidth: 680 }}>
        <p style={{ font: "700 .7rem ui-monospace", letterSpacing: ".1em" }}>RUNTIME / INTERRUPTED</p>
        <h1 style={{ margin: "1rem 0", fontSize: "clamp(3.5rem,10vw,6rem)", fontWeight: 500, letterSpacing: "-.04em", lineHeight: ".9" }}>That did not compile emotionally.</h1>
        <p style={{ maxWidth: 480, margin: "1.5rem auto", lineHeight: 1.6 }}>Your data has not been intentionally changed. Try the action again or return to the homepage.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: ".7rem", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={{ border: 0, padding: ".85rem 1rem", background: "#141218", color: "#f4f1f7", cursor: "pointer", fontWeight: 700 }}>Try again</button>
          <Link href="/" style={{ padding: ".85rem 1rem", border: "1px solid #f7f3fb", fontWeight: 700 }}>Return home</Link>
        </div>
      </div>
    </main>
  );
}
