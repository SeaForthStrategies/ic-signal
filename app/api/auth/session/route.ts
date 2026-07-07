import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  return NextResponse.json({ authenticated: Boolean(session), session });
}
