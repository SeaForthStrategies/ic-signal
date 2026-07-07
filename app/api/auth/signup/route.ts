import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { createSessionToken, getSessionCookieName, getSessionDurationSeconds, hashPassword } from "@/lib/session";

export async function POST(request: Request) {
  const { email, name, password, workspaceName } = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
    workspaceName?: string;
  };

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ message: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
  }

  const client = convexServer();
  const serverSecret = getAuthServerSecret();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  try {
    await client.mutation(api.auth.createAccount, {
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail,
      passwordHash,
      serverSecret,
      workspaceName: workspaceName?.trim() || "Finding Winners Launch CRM",
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create account." },
      { status: 400 },
    );
  }

  const profile = await client.query(api.auth.getUserByEmail, {
    email: normalizedEmail,
    serverSecret,
  });

  const response = NextResponse.json({ authenticated: true, profile });
  response.cookies.set({
    httpOnly: true,
    maxAge: getSessionDurationSeconds(),
    name: getSessionCookieName(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: await createSessionToken({
      email: normalizedEmail,
      name: profile?.name,
      role: profile?.role,
      userId: profile?.id,
      workspaceId: profile?.workspaceId ?? null,
      workspaceName: profile?.workspaceName ?? null,
    }),
  });

  return response;
}
