import { LogoMark } from "@/components/logo-mark";

export default function Loading() {
  return (
    <main
      aria-label="Loading Socialize"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#111014",
        color: "#f4f1f7",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span className="brand-mark" aria-hidden="true"><LogoMark /></span>
        <p style={{ font: "700 .65rem ui-monospace", letterSpacing: ".1em", marginTop: "1.5rem" }}>LOADING THE WORKSPACE</p>
      </div>
    </main>
  );
}
