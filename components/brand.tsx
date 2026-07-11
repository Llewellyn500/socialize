import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-lockup ${inverse ? "brand-lockup--inverse" : ""}`}
      aria-label="Socialize home"
    >
      <span className="brand-mark" aria-hidden="true"><LogoMark /></span>
      <span>socialize</span>
    </Link>
  );
}
