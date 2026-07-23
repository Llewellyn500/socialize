import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { Brand } from "@/components/brand";

const footerLinks = [
  ["Self-host", "/self-host"],
  ["Docs", "/docs"],
  ["Sponsor", "/sponsor"],
  ["Privacy", "/privacy"],
  ["Cookies", "/cookies"],
  ["Terms", "/terms"],
  ["Acceptable use", "/acceptable-use"],
  ["Security", "/security"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__lead">
        <Brand inverse />
        <p>
          A smaller, sharper link page for people who make software. Free to use,
          free to self-host, voluntarily supported.
        </p>
      </div>
      <nav className="site-footer__links" aria-label="Footer navigation">
        {footerLinks.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="site-footer__meta">
        <span>© {new Date().getFullYear()} Socialize</span>
        <a
          href="https://github.com/Llewellyn500/socialize"
          target="_blank"
          rel="noreferrer"
        >
          Open source <FiArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
