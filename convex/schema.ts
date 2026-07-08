import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member"), v.literal("viewer")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),
  workspaces: defineTable({
    name: v.string(),
    ownerUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ownerUserId", ["ownerUserId"]),
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member"), v.literal("viewer")),
    createdAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"]),
  passwordResetTokens: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"]),
  progress: defineTable({
    dashboard: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    data: v.any(),
    userId: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  })
    .index("by_dashboard", ["dashboard"])
    .index("by_workspaceId_and_dashboard", ["workspaceId", "dashboard"]),
  campaigns: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("Planning"), v.literal("Active"), v.literal("Paused"), v.literal("Complete")),
    deadline: v.string(),
    ownerUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_status", ["workspaceId", "status"]),
  campaignPhases: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    startsAt: v.optional(v.string()),
    endsAt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),
  campaignTasks: defineTable({
    campaignId: v.id("campaigns"),
    phaseId: v.optional(v.id("campaignPhases")),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("Not Started"), v.literal("In Progress"), v.literal("Needs Review"), v.literal("Complete")),
    priority: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High"), v.literal("Urgent")),
    dueDate: v.string(),
    assignedUserId: v.optional(v.id("users")),
    ownerName: v.string(),
    section: v.string(),
    day: v.optional(v.number()),
    order: v.number(),
    notes: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_campaignId_and_dueDate", ["campaignId", "dueDate"])
    .index("by_campaignId_and_status", ["campaignId", "status"])
    .index("by_assignedUserId", ["assignedUserId"]),
  campaignAssets: defineTable({
    campaignId: v.id("campaigns"),
    taskId: v.optional(v.id("campaignTasks")),
    title: v.string(),
    type: v.union(v.literal("PDF"), v.literal("Image"), v.literal("Copy Doc"), v.literal("Deck"), v.literal("Creative"), v.literal("Link"), v.literal("Other")),
    status: v.union(v.literal("Draft"), v.literal("Needs Review"), v.literal("Approved"), v.literal("Published")),
    ownerUserId: v.optional(v.id("users")),
    ownerName: v.string(),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    notes: v.optional(v.string()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_taskId", ["taskId"])
    .index("by_ownerUserId", ["ownerUserId"]),
  campaignComments: defineTable({
    campaignId: v.id("campaigns"),
    taskId: v.optional(v.id("campaignTasks")),
    assetId: v.optional(v.id("campaignAssets")),
    body: v.string(),
    createdBy: v.id("users"),
    createdByName: v.string(),
    createdAt: v.number(),
  })
    .index("by_campaignId", ["campaignId"])
    .index("by_taskId", ["taskId"])
    .index("by_assetId", ["assetId"]),
  campaignActivity: defineTable({
    campaignId: v.id("campaigns"),
    actorUserId: v.id("users"),
    actorName: v.string(),
    action: v.string(),
    targetType: v.union(v.literal("campaign"), v.literal("phase"), v.literal("task"), v.literal("asset"), v.literal("comment")),
    targetId: v.optional(v.string()),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_campaignId", ["campaignId"]),
  userPreferences: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    dashboardView: v.union(v.literal("compact"), v.literal("comfortable")),
    defaultOwnerFilter: v.optional(v.string()),
    defaultCampaignId: v.optional(v.id("campaigns")),
    showCompletedTasks: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_workspaceId", ["userId", "workspaceId"]),
});
