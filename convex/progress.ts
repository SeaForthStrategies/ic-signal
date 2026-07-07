import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { dashboard: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_dashboard", (q) => q.eq("dashboard", args.dashboard))
      .first();
  },
});

export const getForWorkspace = query({
  args: {
    dashboard: v.string(),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_workspaceId_and_dashboard", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("dashboard", args.dashboard),
      )
      .unique();
  },
});

export const save = mutation({
  args: {
    dashboard: v.string(),
    data: v.any(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_dashboard", (q) => q.eq("dashboard", args.dashboard))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        userId: args.userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("progress", args);
  },
});

export const saveForWorkspace = mutation({
  args: {
    dashboard: v.string(),
    data: v.any(),
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_workspaceId_and_dashboard", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("dashboard", args.dashboard),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        updatedAt: now,
        userId: args.userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("progress", {
      dashboard: args.dashboard,
      data: args.data,
      updatedAt: now,
      userId: args.userId,
      workspaceId: args.workspaceId,
    });
  },
});
