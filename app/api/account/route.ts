import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { createSessionToken, getSessionCookieName, getSessionDurationSeconds, getSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const profile = await convexServer().query(api.auth.getUserByEmail, {
    email: session.email,
    serverSecret: getAuthServerSecret(),
  });

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { name, workspaceName } = (await request.json()) as { name?: string; workspaceName?: string };
  if (!name || !workspaceName) {
    return NextResponse.json({ message: "Name and workspace name are required." }, { status: 400 });
  }

  const client = convexServer();
  const serverSecret = getAuthServerSecret();
  await client.mutation(api.auth.updateProfile, {
    email: session.email,
    name,
    serverSecret,
    workspaceName,
  });
  const profile = await client.query(api.auth.getUserByEmail, {
    email: session.email,
    serverSecret,
  });

  const response = NextResponse.json({ profile });
  response.cookies.set({
    httpOnly: true,
    maxAge: getSessionDurationSeconds(),
    name: getSessionCookieName(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: await createSessionToken({
      email: session.email,
      name: profile?.name,
      role: profile?.role,
      userId: profile?.id,
      workspaceId: profile?.workspaceId ?? null,
      workspaceName: profile?.workspaceName ?? null,
    }),
  });

  return response;
}
