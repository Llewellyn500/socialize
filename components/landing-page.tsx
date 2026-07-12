"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUpRight,
  FiCheck,
  FiCode,
  FiCommand,
  FiCopy,
  FiDatabase,
  FiEdit3,
  FiEye,
  FiGitBranch,
  FiGithub,
  FiGlobe,
  FiMove,
  FiPlus,
  FiServer,
  FiSliders,
  FiTerminal,
} from "react-icons/fi";
import { ProfilePreview } from "@/components/profile-preview";
import { SignalTicker } from "@/components/signal-ticker";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MotionNotice } from "@/components/motion-notice";
import { isMotionReduced } from "@/lib/motion";
import { demoProfile, type ProfileConfig, type ProfileTheme } from "@/lib/profile";

const editorTabs = [
  { id: "links", label: "Links", icon: FiMove },
  { id: "profile", label: "Profile", icon: FiEdit3 },
  { id: "theme", label: "Theme", icon: FiSliders },
] as const;

const themes: { id: ProfileTheme; label: string; color: string }[] = [
  { id: "paper", label: "Paper", color: "#8a2be2" },
  { id: "terminal", label: "Terminal", color: "#b7ff4a" },
  { id: "midnight", label: "Midnight", color: "#f5cc5b" },
  { id: "mono", label: "Mono", color: "#111111" },
];

export function LandingPage() {
  const [activeEditorTab, setActiveEditorTab] = useState<(typeof editorTabs)[number]["id"]>("links");
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<ProfileConfig>(demoProfile);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    function revealAll() {
      targets.forEach((target) => target.classList.add("is-visible"));
    }

    function observe() {
      if (isMotionReduced()) {
        revealAll();
        return null;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
      );

      targets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        const alreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
        if (alreadyVisible) target.classList.add("is-visible");
        else observer.observe(target);
      });

      // Safety net: never leave reveal nodes stuck invisible.
      const safety = window.setTimeout(() => {
        targets.forEach((target) => {
          if (!target.classList.contains("is-visible")) target.classList.add("is-visible");
        });
      }, 2500);

      return () => {
        observer.disconnect();
        window.clearTimeout(safety);
      };
    }

    let cleanup = observe();
    const onMotionChange = () => {
      cleanup?.();
      cleanup = observe();
    };
    window.addEventListener("socialize:motion-change", onMotionChange);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", onMotionChange);

    return () => {
      cleanup?.();
      window.removeEventListener("socialize:motion-change", onMotionChange);
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  const activeTheme = useMemo(
    () => themes.find((theme) => theme.id === profile.theme) ?? themes[0],
    [profile.theme],
  );

  async function copyInstallCommand() {
    await navigator.clipboard?.writeText("git clone https://github.com/Llewellyn500/socialize");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="marketing-shell">
      <MotionNotice />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />

      <main id="main-content">
        <section className="hero-section">
          <div className="hero-grain" aria-hidden="true" />
          <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
          <div className="hero-orbit hero-orbit--two" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">
              <span>01</span> A developer&apos;s first link page
            </p>
            <h1 className="hero-title" aria-label="Your work deserves more than a list of links">
              <span className="hero-title__line hero-title__line--one">Your work</span>
              <span className="hero-title__line hero-title__line--two">deserves more</span>
              <span className="hero-title__line hero-title__line--three">
                than <em>a list.</em>
              </span>
            </h1>
            <div className="hero-bottom">
              <p>
                Publish a sharp developer profile in minutes, or take the code and
                run it yourself. Your projects, writing, and socials—without the
                creator-economy clutter.
              </p>
              <div className="hero-actions">
                <Link className="button button--signal" href="/sign-up">
                  Create a hosted page <FiArrowUpRight aria-hidden="true" />
                </Link>
                <Link className="button button--line" href="/self-host">
                  Self-host it <FiTerminal aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="hero-stage" aria-label="Example Socialize developer profile">
            <div className="hero-stage__label hero-stage__label--top">
              <FiCommand aria-hidden="true" /> live profile
            </div>
            <div className="hero-stage__frame">
              <ProfilePreview profile={profile} />
            </div>
            <div className="floating-code floating-code--left" aria-hidden="true">
              <span>latest commit</span>
              <strong>fix: make retries boring</strong>
              <small>8 minutes ago · main</small>
            </div>
            <div className="floating-code floating-code--right" aria-hidden="true">
              <span>weekly languages</span>
              <strong>TypeScript · Go · MDX</strong>
              <small>Most used this week</small>
            </div>
          </div>
          <a className="scroll-cue" href="#product">
            Scroll to inspect <FiArrowDown aria-hidden="true" />
          </a>
        </section>

        <SignalTicker />

        <section id="product" className="manifesto-section section-pad">
          <div className="section-index" data-reveal>
            <span>02 / PRODUCT</span>
            <span>Built around developer habits</span>
          </div>
          <div className="manifesto-grid">
            <p className="manifesto-kicker" data-reveal>
              Not another generic bio page.
            </p>
            <h2 data-reveal>
              One place for what you <em>ship</em>, what you know, and where to
              find you next.
            </h2>
          </div>
          <div className="manifesto-notes" data-reveal>
            <div>
              <FiGitBranch aria-hidden="true" />
              <strong>Developer-native blocks</strong>
              <p>Projects, repositories, writing links, and coding activity feel at home.</p>
            </div>
            <div>
              <FiDatabase aria-hidden="true" />
              <strong>Your data, in one shape</strong>
              <p>Saved to your account when hosted. Export a portable config file when you self-host.</p>
            </div>
          </div>
        </section>

        <section className="paths-section">
          <div className="path-panel path-panel--hosted" data-reveal>
            <span className="path-panel__number">A</span>
            <div className="path-panel__icon"><FiGlobe /></div>
            <p className="eyebrow">The no-ops route</p>
            <h2>We host it.</h2>
            <p className="path-panel__copy">
              Sign in, claim your handle, arrange your work, and publish. We handle
              accounts, storage, and the details—you handle the work.
            </p>
            <ul>
              <li><FiCheck /> Email, Google, and GitHub sign-in</li>
              <li><FiCheck /> Visual editor with a live preview</li>
              <li><FiCheck /> A shareable Socialize URL</li>
            </ul>
            <Link href="/sign-up">
              Build on our domain <FiArrowUpRight />
            </Link>
          </div>
          <div className="path-panel path-panel--self" data-reveal>
            <span className="path-panel__number">B</span>
            <div className="path-panel__icon"><FiServer /></div>
            <p className="eyebrow">The own-everything route</p>
            <h2>You host it.</h2>
            <p className="path-panel__copy">
              Fork the stripped edition: your public profile, one private manager,
              and none of the marketing or service shell.
            </p>
            <ul>
              <li><FiCheck /> One portable configuration file</li>
              <li><FiCheck /> Your infrastructure and domain</li>
              <li><FiCheck /> Docker and one-click deploy paths</li>
            </ul>
            <Link href="/self-host">
              Read the self-host guide <FiArrowUpRight />
            </Link>
          </div>
        </section>

        <section className="editor-section section-pad">
          <div className="section-index section-index--light" data-reveal>
            <span>03 / EDITOR</span>
            <span>What you see is what you publish</span>
          </div>
          <div className="editor-intro" data-reveal>
            <h2>Move fast without editing JSX.</h2>
            <p>
              Build your page in a focused workspace. Reorder links, switch themes,
              and see the result before anyone else does.
            </p>
          </div>
          <div className="editor-window" data-reveal>
            <div className="editor-window__chrome">
              <span><i /><i /><i /></span>
              <code>socialize.you/dashboard</code>
              <span className="editor-window__saved"><FiCheck /> Saved</span>
            </div>
            <div className="editor-workspace">
              <aside className="editor-sidebar" aria-label="Editor sections">
                <strong>Build</strong>
                {editorTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      className={activeEditorTab === tab.id ? "is-active" : ""}
                      onClick={() => setActiveEditorTab(tab.id)}
                      type="button"
                    >
                      <Icon aria-hidden="true" /> {tab.label}
                    </button>
                  );
                })}
                <span className="editor-sidebar__spacer" />
                <Link href="/dashboard"><FiEye /> Open dashboard</Link>
              </aside>
              <div className="editor-controls">
                {activeEditorTab === "links" ? (
                  <>
                    <div className="editor-controls__heading">
                      <div><span>PAGE CONTENT</span><h3>Your links</h3></div>
                      <button type="button"><FiPlus /> Add link</button>
                    </div>
                    {profile.links.map((link, index) => (
                      <div className="editor-link-row" key={link.id}>
                        <FiMove aria-hidden="true" />
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div><strong>{link.title}</strong><small>{link.url}</small></div>
                        <i className={link.enabled ? "is-on" : ""} />
                      </div>
                    ))}
                  </>
                ) : null}
                {activeEditorTab === "profile" ? (
                  <div className="editor-form-demo">
                    <span>PROFILE DETAILS</span>
                    <label>Name<input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></label>
                    <label>Role<input value={profile.role} onChange={(event) => setProfile({ ...profile, role: event.target.value })} /></label>
                    <label>Bio<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
                  </div>
                ) : null}
                {activeEditorTab === "theme" ? (
                  <div className="editor-theme-demo">
                    <span>DEVELOPER THEMES</span>
                    <h3>Choose a starting point</h3>
                    <div className="theme-options">
                      {themes.map((theme) => (
                        <button
                          key={theme.id}
                          className={profile.theme === theme.id ? "is-active" : ""}
                          type="button"
                          onClick={() => setProfile({ ...profile, theme: theme.id, accent: theme.color })}
                        >
                          <i style={{ background: theme.color }} />
                          <strong>{theme.label}</strong>
                          {profile.theme === theme.id ? <FiCheck /> : null}
                        </button>
                      ))}
                    </div>
                    <div className="accent-readout">
                      <span>Accent</span><code>{activeTheme.color}</code>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="editor-preview-pane">
                <span className="editor-preview-pane__label"><i /> LIVE PREVIEW</span>
                <div className="editor-phone">
                  <ProfilePreview profile={profile} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="integrations-section section-pad">
          <div className="section-index" data-reveal>
            <span>04 / SIGNALS</span>
            <span>More proof. Less noise.</span>
          </div>
          <div className="integrations-heading" data-reveal>
            <h2>Your developer footprint, pulled into focus.</h2>
            <p>
              Socialize is designed for the work developers already publish across
              the web. Integrations can arrive as focused blocks—not an endless feed.
            </p>
          </div>
          <div className="signal-field" data-reveal>
            <article className="signal-card signal-card--github">
              <FiGithub />
              <span>GITHUB</span>
              <h3>Pin the work that deserves a second look.</h3>
              <div className="github-card-footer">
                <div className="repo-line"><i /> socialize <small>TypeScript</small></div>
                <div className="commit-grid" aria-hidden="true">
                  {Array.from({ length: 52 }).map((_, index) => <i key={index} />)}
                </div>
              </div>
            </article>
            <article className="signal-card signal-card--rss">
              <FiEdit3 />
              <span>WRITING</span>
              <h3>Latest field note</h3>
              <strong>Why the best infrastructure fades into the background</strong>
              <small>7 min read · 3 days ago</small>
            </article>
            <article className="signal-card signal-card--activity">
              <FiCode />
              <span>CODING LANGUAGES</span>
              <strong>TypeScript · Go · MDX</strong>
              <div className="language-bars"><i /><i /><i /></div>
              <small>TypeScript 54% · Go 31% · Other 15%</small>
            </article>
            <article className="signal-card signal-card--speed">
              <span>BY DEFAULT</span>
              <strong>Fast.</strong>
              <p>No autoplaying embeds. No advertising pixels in the profile renderer.</p>
              <FiArrowRight />
            </article>
          </div>
        </section>

        <section className="selfhost-strip">
          <div className="selfhost-strip__copy" data-reveal>
            <p className="eyebrow">05 / THE EXIT DOOR IS A FEATURE</p>
            <h2>Start hosted. Leave with your data whenever you want.</h2>
            <p>
              Export the same profile shape used by the open-source edition. No
              reverse-engineering your own bio page later.
            </p>
            <Link className="button button--cream" href="/self-host">
              See the architecture <FiArrowUpRight />
            </Link>
          </div>
          <div className="terminal-card" data-reveal>
            <div className="terminal-card__bar"><i /><i /><i /><span>socialize — zsh</span></div>
            <div className="terminal-card__body">
              <p><span>$</span> git clone github.com/Llewellyn500/socialize</p>
              <p className="terminal-muted">◇ Open self-hosted-template</p>
              <p className="terminal-success">◆ Cloud backend connected</p>
              <p className="terminal-success">◆ Owner account secured</p>
              <p className="terminal-success">◆ Ready at localhost:3000</p>
              <button type="button" onClick={copyInstallCommand}>
                {copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied" : "Copy command"}
              </button>
            </div>
          </div>
        </section>

        <section className="principles-section section-pad">
          <div className="section-index" data-reveal>
            <span>06 / PRINCIPLES</span>
            <span>Small decisions, felt everywhere</span>
          </div>
          <div className="principles-list">
            {(
              [
                [
                  "01",
                  "A page, not a platform trap",
                  "Hosted convenience and self-hosted control use the same data model.",
                  "/self-host",
                ],
                [
                  "02",
                  "Made for technical work",
                  "Projects, code, writing, and availability get the hierarchy they deserve.",
                  "/docs",
                ],
                [
                  "03",
                  "Privacy before dashboards",
                  "Optional aggregate analytics starts only after a clear yes.",
                  "/privacy",
                ],
                [
                  "04",
                  "Accessible motion",
                  "Cinematic where it helps, quiet for reduced-motion preferences.",
                  "/docs",
                ],
              ] as const
            ).map(([number, title, copy, href]) => (
              <Link href={href} key={number} data-reveal>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="sponsor-callout" data-reveal>
          <div className="sponsor-callout__copy">
            <p className="eyebrow">OPEN SOURCE NEEDS OXYGEN</p>
            <h2>Help keep the self-hosted path genuinely useful.</h2>
          </div>
          <div className="sponsor-callout__aside">
            <p>
              Sponsorship funds maintenance, documentation, accessibility work, and
              the parts that make owning your page less painful.
            </p>
            <ul className="sponsor-callout__points">
              <li>Keep the hosted and self-hosted paths aligned</li>
              <li>Ship docs and accessibility work that lasts</li>
              <li>Support the unglamorous maintenance that protects exits</li>
            </ul>
            <Link className="button button--ink" href="/sponsor">
              Sponsor the project <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="closing-section">
          <p data-reveal>Ready when your next project is.</p>
          <h2 data-reveal>
            Put your work<br />
            <em>within reach.</em>
          </h2>
          <div className="closing-actions" data-reveal>
            <Link className="button button--signal" href="/sign-up">
              Create your page <FiArrowUpRight />
            </Link>
            <Link href="/self-host">Or own the stack →</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
