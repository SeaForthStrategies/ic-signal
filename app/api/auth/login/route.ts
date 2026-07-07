import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { createSessionToken, getSessionCookieName, getSessionDurationSeconds, verifyPassword } from "@/lib/session";

type LoginUser = {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "owner" | "admin" | "member" | "viewer";
};

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const client = convexServer();
  const serverSecret = getAuthServerSecret();
  const normalizedEmail = email.trim().toLowerCase();
  let user = (await client.query(api.auth.getUserForLogin, {
    email: normalizedEmail,
    serverSecret,
  })) as LoginUser | null;

  if (!user && process.env.AUTH_EMAIL?.toLowerCase() === normalizedEmail && process.env.AUTH_PASSWORD_HASH) {
    const legacyPasswordMatches = await verifyPassword(password, process.env.AUTH_PASSWORD_HASH);
    if (legacyPasswordMatches) {
      await client.mutation(api.auth.ensureAccount, {
        email: normalizedEmail,
        name: "Abby Lehr",
        passwordHash: process.env.AUTH_PASSWORD_HASH,
        serverSecret,
        workspaceName: "Finding Winners Launch CRM",
      });
      user = (await client.query(api.auth.getUserForLogin, {
        email: normalizedEmail,
        serverSecret,
      })) as LoginUser | null;
    }
  }

  const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
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
      email: user.email,
      name: user.name,
      role: user.role,
      userId: user._id,
      workspaceId: profile?.workspaceId ?? null,
      workspaceName: profile?.workspaceName ?? null,
    }),
  });

  return response;
}
