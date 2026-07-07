import { v } from "convex/values";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const roleValidator = v.union(v.literal("owner"), v.literal("admin"), v.literal("member"), v.literal("viewer"));
const serverArgs = { serverSecret: v.string() };

function requireServerSecret(serverSecret: string) {
  if (!process.env.AUTH_API_SECRET || serverSecret !== process.env.AUTH_API_SECRET) {
    throw new Error("Not authorized.");
  }
}

export const getUserForLogin = query({
  args: { ...serverArgs, email: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const email = args.email.trim().toLowerCase();
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
  },
});

export const getUserByEmail = query({
  args: { ...serverArgs, email: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) return null;
    const workspace = await getPrimaryWorkspace(ctx, user._id);
    return {
      email: user.email,
      id: user._id,
      name: user.name,
      role: user.role,
      workspaceId: workspace?._id ?? null,
      workspaceName: workspace?.name ?? null,
    };
  },
});

export const createAccount = mutation({
  args: {
    ...serverArgs,
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    workspaceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const now = Date.now();
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("An account already exists for this email.");
    }

    const userId = await ctx.db.insert("users", {
      createdAt: now,
      email,
      name: args.name.trim() || email,
      passwordHash: args.passwordHash,
      role: "owner",
      updatedAt: now,
    });
    const workspaceId = await ctx.db.insert("workspaces", {
      createdAt: now,
      name: args.workspaceName?.trim() || "Finding Winners Launch CRM",
      ownerUserId: userId,
      updatedAt: now,
    });
    await ctx.db.insert("workspaceMembers", {
      createdAt: now,
      role: "owner",
      userId,
      workspaceId,
    });

    return { userId, workspaceId };
  },
});

export const ensureAccount = mutation({
  args: {
    ...serverArgs,
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    workspaceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      const workspace = await getPrimaryWorkspace(ctx, existing._id);
      return { userId: existing._id, workspaceId: workspace?._id ?? null };
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      createdAt: now,
      email,
      name: args.name.trim() || email,
      passwordHash: args.passwordHash,
      role: "owner",
      updatedAt: now,
    });
    const workspaceId = await ctx.db.insert("workspaces", {
      createdAt: now,
      name: args.workspaceName?.trim() || "Finding Winners Launch CRM",
      ownerUserId: userId,
      updatedAt: now,
    });
    await ctx.db.insert("workspaceMembers", {
      createdAt: now,
      role: "owner",
      userId,
      workspaceId,
    });

    return { userId, workspaceId };
  },
});

export const updateProfile = mutation({
  args: {
    ...serverArgs,
    email: v.string(),
    name: v.string(),
    workspaceName: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const user = await requireUserByEmail(ctx, args.email);
    const workspace = await getPrimaryWorkspace(ctx, user._id);
    const now = Date.now();

    await ctx.db.patch(user._id, {
      name: args.name.trim() || user.email,
      updatedAt: now,
    });

    if (workspace) {
      await ctx.db.patch(workspace._id, {
        name: args.workspaceName.trim() || workspace.name,
        updatedAt: now,
      });
    }

    return true;
  },
});

export const updatePassword = mutation({
  args: {
    ...serverArgs,
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const user = await requireUserByEmail(ctx, args.email);
    await ctx.db.patch(user._id, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const listTeam = query({
  args: { ...serverArgs, email: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const user = await requireUserByEmail(ctx, args.email);
    const workspace = await getPrimaryWorkspace(ctx, user._id);
    if (!workspace) return [];

    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .take(100);

    const rows = [];
    for (const member of members) {
      const memberUser = await ctx.db.get(member.userId);
      if (memberUser) {
        rows.push({
          email: memberUser.email,
          id: memberUser._id,
          name: memberUser.name,
          role: member.role,
        });
      }
    }
    return rows;
  },
});

export const inviteTeamMember = mutation({
  args: {
    ...serverArgs,
    inviterEmail: v.string(),
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const inviter = await requireUserByEmail(ctx, args.inviterEmail);
    const workspace = await getPrimaryWorkspace(ctx, inviter._id);
    if (!workspace) throw new Error("Workspace not found.");

    const now = Date.now();
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    let userId = user?._id;

    if (!userId) {
      userId = await ctx.db.insert("users", {
        createdAt: now,
        email,
        name: args.name.trim() || email,
        passwordHash: args.passwordHash,
        role: args.role,
        updatedAt: now,
      });
    }

    const existingMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_and_userId", (q) => q.eq("workspaceId", workspace._id).eq("userId", userId))
      .unique();

    if (existingMember) {
      await ctx.db.patch(existingMember._id, { role: args.role });
      return existingMember._id;
    }

    return await ctx.db.insert("workspaceMembers", {
      createdAt: now,
      role: args.role,
      userId,
      workspaceId: workspace._id,
    });
  },
});

export const createPasswordReset = mutation({
  args: {
    ...serverArgs,
    email: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (!user) return null;

    return await ctx.db.insert("passwordResetTokens", {
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      tokenHash: args.tokenHash,
      userId: user._id,
    });
  },
});

export const resetPassword = mutation({
  args: {
    ...serverArgs,
    passwordHash: v.string(),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const reset = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();

    if (!reset || reset.usedAt || reset.expiresAt < Date.now()) {
      throw new Error("This reset link is invalid or expired.");
    }

    await ctx.db.patch(reset.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(reset._id, { usedAt: Date.now() });
    return true;
  },
});

async function requireUserByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
    .unique();
  if (!user) throw new Error("User not found.");
  return user;
}

async function getPrimaryWorkspace(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const owned = await ctx.db
    .query("workspaces")
    .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
    .first();
  if (owned) return owned;

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  return membership ? await ctx.db.get(membership.workspaceId) : null;
}
