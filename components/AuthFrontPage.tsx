"use client";

import { ArrowRight, CheckCircle2, Lock, Mail, Rocket, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AuthFrontPage({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [activeMode, setActiveMode] = useState(mode);
  const isSignup = activeMode === "signup";

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
          <p className="quiet-copy">Frontend only for now. We will connect Convex authentication and persistence next.</p>
        </div>

        <form className="auth-form">
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
              <input placeholder="you@company.com" type="email" />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div>
              <Lock size={17} />
              <input placeholder="••••••••" type="password" />
            </div>
          </label>

          <button className="auth-submit" type="button">
            {isSignup ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-card-footer">
          <span>{isSignup ? "Already have access?" : "Need a workspace account?"}</span>
          <button type="button" onClick={() => setActiveMode(isSignup ? "signin" : "signup")}>
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </div>

        <Link className="auth-preview-link" href="/dashboard">
          Continue to dashboard preview
        </Link>
      </section>
    </main>
  );
}
