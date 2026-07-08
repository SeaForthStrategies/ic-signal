"use client";

import { ArrowRight, Eye, EyeOff, Lock, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const response = await fetch("/api/auth/reset-password", {
      body: JSON.stringify({ password, token }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to reset password.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="auth-shell single-auth">
      <section className="auth-card" aria-label="Reset password">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <Rocket size={22} />
          </span>
          <div>
            <p>Finding Winners</p>
            <h1>Launch CRM</h1>
          </div>
        </div>
        <div>
          <p className="eyebrow">Security</p>
          <h2>Reset password</h2>
          <p className="quiet-copy">Choose a new password for your workspace account.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>New password</span>
            <div>
              <Lock size={17} />
              <input
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit" disabled={submitting || !token} type="submit">
            {submitting ? "Resetting..." : "Reset password"}
            <ArrowRight size={17} />
          </button>
        </form>
        <Link className="auth-preview-link" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
