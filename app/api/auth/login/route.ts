import { NextResponse } from "next/server";
import { createSessionToken, getSessionCookieName, getSessionDurationSeconds, verifyPassword } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  const allowedEmail = process.env.AUTH_EMAIL;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;

  if (!allowedEmail || !passwordHash) {
    return NextResponse.json({ message: "Authentication is not configured." }, { status: 500 });
  }

  const emailMatches = email?.trim().toLowerCase() === allowedEmail.toLowerCase();
  const passwordMatches = password ? await verifyPassword(password, passwordHash) : false;

  if (!emailMatches || !passwordMatches) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ email: allowedEmail });
  response.cookies.set({
    httpOnly: true,
    maxAge: getSessionDurationSeconds(),
    name: getSessionCookieName(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: await createSessionToken(allowedEmail),
  });

  return response;
}
