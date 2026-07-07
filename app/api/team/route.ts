import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { getSessionFromRequest, hashPassword } from "@/lib/session";

const allowedRoles = new Set(["admin", "member", "viewer"]);

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const members = await convexServer().query(api.auth.listTeam, {
    email: session.email,
    serverSecret: getAuthServerSecret(),
  });

  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (session.role !== "owner" && session.role !== "admin") {
    return NextResponse.json({ message: "Only owners and admins can manage team members." }, { status: 403 });
  }

  const { email, name, role, temporaryPassword } = (await request.json()) as {
    email?: string;
    name?: string;
    role?: "admin" | "member" | "viewer";
    temporaryPassword?: string;
  };

  if (!email || !temporaryPassword || temporaryPassword.length < 8 || !role || !allowedRoles.has(role)) {
    return NextResponse.json({ message: "Enter an email, role, and temporary password with at least 8 characters." }, { status: 400 });
  }

  await convexServer().mutation(api.auth.inviteTeamMember, {
    email: email.trim().toLowerCase(),
    inviterEmail: session.email,
    name: name?.trim() || email.trim().toLowerCase(),
    passwordHash: await hashPassword(temporaryPassword),
    role,
    serverSecret: getAuthServerSecret(),
  });

  const members = await convexServer().query(api.auth.listTeam, {
    email: session.email,
    serverSecret: getAuthServerSecret(),
  });

  return NextResponse.json({ members });
}
