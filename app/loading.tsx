import { Brand } from "@/components/brand";

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
        <Brand inverse />
        <p style={{ font: "700 .65rem ui-monospace", letterSpacing: ".1em", marginTop: "1.5rem" }}>LOADING THE WORKSPACE</p>
      </div>
    </main>
  );
}
