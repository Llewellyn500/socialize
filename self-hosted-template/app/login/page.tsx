import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" size={16} weight="bold" />
          Public profile
        </Link>
        <div className="auth-grid">
          <section className="auth-intro" aria-labelledby="login-title">
            <p className="eyebrow">Owner access</p>
            <h1 id="login-title">Keep your profile current.</h1>
            <p>Sign in with the Firebase account on your private owner allowlist. Visitors never see this workspace.</p>
          </section>
          <Suspense fallback={<div className="auth-card auth-card-loading" aria-label="Loading sign-in form" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
