import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  progress: defineTable({
    dashboard: v.string(),
    data: v.any(),
    userId: v.optional(v.string()),
  }).index("by_dashboard", ["dashboard"]),
});
