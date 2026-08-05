"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiArrowUpRight, FiMenu, FiX } from "react-icons/fi";
import { Brand } from "@/components/brand";

const links = [
  { href: "/self-host", label: "Self-host" },
  { href: "/docs", label: "Docs" },
  { href: "/sponsor", label: "Sponsor" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "is-active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <Link className="text-link" href="/sign-in">
            Sign in
          </Link>
          <Link className="button button--small button--ink" href="/sign-up">
            Create your free page <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>
      {open ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={close}
        />
      ) : null}
      <div
        id="mobile-navigation"
        className={`mobile-nav ${open ? "is-open" : ""}`}
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={close}>
            {link.label}
          </Link>
        ))}
        <Link href="/sign-in" onClick={close}>
          Sign in
        </Link>
        <Link href="/sign-up" onClick={close}>
          Create your free page
        </Link>
      </div>
    </header>
  );
}
