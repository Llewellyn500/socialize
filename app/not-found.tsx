import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem", background: "#d6c4e8", color: "#141218", textAlign: "center" }}>
      <div style={{ maxWidth: 720 }}>
        <Brand />
        <p style={{ marginTop: "4rem", font: "700 .7rem ui-monospace", letterSpacing: ".1em" }}>404 / WRONG TURN</p>
        <h1 style={{ margin: "1rem 0", fontSize: "clamp(4rem,12vw,6rem)", fontWeight: 500, letterSpacing: "-.04em", lineHeight: ".9" }}>Nothing shipped here.</h1>
        <p style={{ color: "rgba(24,25,23,.62)" }}>The page moved, the handle changed, or this route never existed.</p>
        <Link href="/" style={{ display: "inline-flex", marginTop: "1.5rem", padding: ".85rem 1rem", background: "#8a2be2", color: "#f4f1f7", fontSize: ".75rem", fontWeight: 700 }}>Return home</Link>
      </div>
    </main>
  );
}
