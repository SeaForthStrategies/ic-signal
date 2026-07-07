import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/session";

export async function GET(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${getSessionCookieName()}=`));
  const token = cookie?.split("=")[1];
  const session = await verifySessionToken(token);

  return NextResponse.json({ authenticated: Boolean(session), email: session?.email ?? null });
}
