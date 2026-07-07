import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { hashResetToken } from "@/lib/session";

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };
  if (!email) return NextResponse.json({ message: "Email is required." }, { status: 400 });

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const tokenHash = await hashResetToken(token);
  const url = new URL(request.url);
  const resetUrl = `${url.origin}/reset-password?token=${encodeURIComponent(token)}`;

  await convexServer().mutation(api.auth.createPasswordReset, {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + 1000 * 60 * 60,
    serverSecret: getAuthServerSecret(),
    tokenHash,
  });

  return NextResponse.json({
    message: "If an account exists, a password reset link has been prepared.",
    resetUrl,
  });
}
