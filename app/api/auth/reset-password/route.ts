import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { hashPassword, hashResetToken } from "@/lib/session";

export async function POST(request: Request) {
  const { password, token } = (await request.json()) as { password?: string; token?: string };
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ message: "Use a valid reset link and a password with at least 8 characters." }, { status: 400 });
  }

  try {
    await convexServer().mutation(api.auth.resetPassword, {
      passwordHash: await hashPassword(password),
      serverSecret: getAuthServerSecret(),
      tokenHash: await hashResetToken(token),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to reset password." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
