"use client";

import { ArrowRight, CheckCircle2, Lock, Mail, Rocket, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthFrontPage({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState(mode);
  const [email, setEmail] = useState("abby@intersectioncapital.com");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Finding Winners Launch CRM");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = activeMode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    const response = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
      body: JSON.stringify(isSignup ? { email, name, password, workspaceName } : { email, password }),
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

  async function requestReset() {
    setError("");
    setNotice("");
    setSubmitting(true);
    const response = await fetch("/api/auth/request-reset", {
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as { message?: string; resetUrl?: string } | null;
    setSubmitting(false);
    if (!response.ok) {
      setError(body?.message ?? "Unable to start password reset.");
      return;
    }
    setNotice(body?.resetUrl ? `Reset link: ${body.resetUrl}` : (body?.message ?? "Reset link prepared."));
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
              ? "Create a workspace, invite your team, and save the launch dashboard to Convex."
              : "Use your workspace account to access the saved launch command center."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label>
                <span>Name</span>
                <div>
                  <User size={17} />
                  <input
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Abby Lehr"
                    required
                    type="text"
                    value={name}
                  />
                </div>
              </label>
              <label>
                <span>Workspace</span>
                <div>
                  <Rocket size={17} />
                  <input
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    placeholder="Finding Winners Launch CRM"
                    required
                    type="text"
                    value={workspaceName}
                  />
                </div>
              </label>
            </>
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
          {notice && <p className="auth-success">{notice}</p>}

          <button className="auth-submit" disabled={submitting} type="submit">
            {submitting ? "Working..." : isSignup ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-card-footer">
          <span>{isSignup ? "Already have access?" : "Need a workspace account?"}</span>
          <button type="button" onClick={() => setActiveMode(isSignup ? "signin" : "signup")}>
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </div>

        {!isSignup && (
          <button className="auth-preview-link" disabled={submitting} type="button" onClick={requestReset}>
            Forgot password?
          </button>
        )}
      </section>
    </main>
  );
}
