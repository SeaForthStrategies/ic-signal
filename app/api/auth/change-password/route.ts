import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer, getAuthServerSecret } from "@/lib/convex-server";
import { getSessionFromRequest, hashPassword, verifyPassword } from "@/lib/session";

type LoginUser = {
  passwordHash: string;
};

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { currentPassword, newPassword } = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ message: "Enter your current password and a new password with at least 8 characters." }, { status: 400 });
  }

  const client = convexServer();
  const serverSecret = getAuthServerSecret();
  const user = (await client.query(api.auth.getUserForLogin, {
    email: session.email,
    serverSecret,
  })) as LoginUser | null;

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ message: "Current password is incorrect." }, { status: 400 });
  }

  await client.mutation(api.auth.updatePassword, {
    email: session.email,
    passwordHash: await hashPassword(newPassword),
    serverSecret,
  });

  return NextResponse.json({ ok: true });
}
