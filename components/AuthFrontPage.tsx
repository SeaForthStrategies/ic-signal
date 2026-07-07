"use client";

import { ArrowRight, CheckCircle2, Lock, Mail, Rocket, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthFrontPage({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState(mode);
  const [email, setEmail] = useState("abby@intersectioncapital.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = activeMode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to sign in.");
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <Rocket size={22} />
          </span>
          <div>
            <p>Finding Winners</p>
            <h1>Launch CRM</h1>
          </div>
        </div>

        <div className="auth-hero-copy">
          <p className="eyebrow">Marketing launch operating system</p>
          <h2>Run the campaign from one clean command center.</h2>
          <p>
            Sign in to manage the 60-day plan, creative assets, GHL workflows, milestone gates, and registration momentum.
          </p>
        </div>

        <div className="auth-proof-grid">
          {["Weekly execution", "Asset pipeline", "Workflow tracking", "Milestone gates"].map((item) => (
            <div key={item}>
              <CheckCircle2 size={17} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="auth-card" aria-label={isSignup ? "Create account" : "Sign in"}>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button className={!isSignup ? "active" : ""} type="button" onClick={() => setActiveMode("signin")}>
            Sign in
          </button>
          <button className={isSignup ? "active" : ""} type="button" onClick={() => setActiveMode("signup")}>
            Sign up
          </button>
        </div>

        <div>
          <p className="eyebrow">{isSignup ? "Create workspace access" : "Welcome back"}</p>
          <h2>{isSignup ? "Create your account" : "Sign in to Launch CRM"}</h2>
          <p className="quiet-copy">
            {isSignup
              ? "Workspace access is currently managed by the admin account. Use the sign-in tab to enter the app."
              : "Use your approved workspace account to access the launch command center."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              <span>Name</span>
              <div>
                <User size={17} />
                <input placeholder="Abby Lehr" type="text" />
              </div>
            </label>
          )}
          <label>
            <span>Email</span>
            <div>
              <Mail size={17} />
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
              />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div>
              <Lock size={17} />
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
              />
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" disabled={submitting || isSignup} type="submit">
            {submitting ? "Signing in..." : isSignup ? "Account managed" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-card-footer">
          <span>{isSignup ? "Already have access?" : "Need a workspace account?"}</span>
          <button type="button" onClick={() => setActiveMode(isSignup ? "signin" : "signup")}>
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </div>

        <p className="auth-preview-link">Protected workspace access is now enabled.</p>
      </section>
    </main>
  );
}
