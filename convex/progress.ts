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

export const save = mutation({
  args: {
    dashboard: v.string(),
    data: v.any(),
    userId: v.optional(v.string()),
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
