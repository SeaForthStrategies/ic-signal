import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convexServer } from "@/lib/convex-server";
import { getSessionFromRequest } from "@/lib/session";

const dashboard = "launch-command-center";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.workspaceId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const progress = await convexServer().query(api.progress.getForWorkspace, {
    dashboard,
    workspaceId: session.workspaceId as Id<"workspaces">,
  });

  return NextResponse.json({ data: progress?.data ?? null, updatedAt: progress?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.workspaceId || !session.userId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { data } = (await request.json()) as { data?: unknown };
  if (!data || typeof data !== "object") {
    return NextResponse.json({ message: "Dashboard data is required." }, { status: 400 });
  }

  await convexServer().mutation(api.progress.saveForWorkspace, {
    dashboard,
    data,
    userId: session.userId as Id<"users">,
    workspaceId: session.workspaceId as Id<"workspaces">,
  });

  return NextResponse.json({ ok: true });
}
