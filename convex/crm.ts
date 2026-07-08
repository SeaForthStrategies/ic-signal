import { v } from "convex/values";
import { mutation, type MutationCtx, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const taskStatusValidator = v.union(
  v.literal("Not Started"),
  v.literal("In Progress"),
  v.literal("Needs Review"),
  v.literal("Complete"),
);
const priorityValidator = v.union(v.literal("Low"), v.literal("Medium"), v.literal("High"), v.literal("Urgent"));
const assetTypeValidator = v.union(
  v.literal("PDF"),
  v.literal("Image"),
  v.literal("Copy Doc"),
  v.literal("Deck"),
  v.literal("Creative"),
  v.literal("Link"),
  v.literal("Other"),
);
const assetStatusValidator = v.union(v.literal("Draft"), v.literal("Needs Review"), v.literal("Approved"), v.literal("Published"));

const seedPhaseValidator = v.object({
  description: v.optional(v.string()),
  endsAt: v.optional(v.string()),
  name: v.string(),
  order: v.number(),
  startsAt: v.optional(v.string()),
});

const seedTaskValidator = v.object({
  day: v.optional(v.number()),
  description: v.string(),
  dueDate: v.string(),
  notes: v.optional(v.string()),
  order: v.number(),
  ownerName: v.string(),
  phaseName: v.string(),
  priority: priorityValidator,
  section: v.string(),
  status: taskStatusValidator,
  title: v.string(),
});

const seedAssetValidator = v.object({
  notes: v.optional(v.string()),
  ownerName: v.string(),
  status: assetStatusValidator,
  title: v.string(),
  type: assetTypeValidator,
  url: v.optional(v.string()),
});

export const ensureSeedCampaign = mutation({
  args: {
    assets: v.array(seedAssetValidator),
    campaignName: v.string(),
    deadline: v.string(),
    description: v.string(),
    phases: v.array(seedPhaseValidator),
    tasks: v.array(seedTaskValidator),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const existing = await ctx.db
      .query("campaigns")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .first();

    if (existing) {
      await ensurePreferences(ctx, user._id, workspace._id, existing._id);
      return existing._id;
    }

    const now = Date.now();
    const campaignId = await ctx.db.insert("campaigns", {
      createdAt: now,
      deadline: args.deadline,
      description: args.description,
      name: args.campaignName,
      ownerUserId: user._id,
      status: "Active",
      updatedAt: now,
      workspaceId: workspace._id,
    });

    const phaseIds = new Map<string, Id<"campaignPhases">>();
    for (const phase of args.phases.slice(0, 30)) {
      const phaseId = await ctx.db.insert("campaignPhases", {
        campaignId,
        createdAt: now,
        description: phase.description,
        endsAt: phase.endsAt,
        name: phase.name,
        order: phase.order,
        startsAt: phase.startsAt,
        updatedAt: now,
      });
      phaseIds.set(phase.name, phaseId);
    }

    for (const task of args.tasks.slice(0, 200)) {
      await ctx.db.insert("campaignTasks", {
        assignedUserId: ownerMatchesUser(task.ownerName, user) ? user._id : undefined,
        campaignId,
        completedAt: task.status === "Complete" ? now : undefined,
        createdAt: now,
        createdBy: user._id,
        day: task.day,
        description: task.description,
        dueDate: task.dueDate,
        notes: task.notes,
        order: task.order,
        ownerName: task.ownerName,
        phaseId: phaseIds.get(task.phaseName),
        priority: task.priority,
        section: task.section,
        status: task.status,
        title: task.title,
        updatedAt: now,
      });
    }

    for (const asset of args.assets.slice(0, 150)) {
      await ctx.db.insert("campaignAssets", {
        campaignId,
        createdAt: now,
        notes: asset.notes,
        ownerName: asset.ownerName,
        ownerUserId: ownerMatchesUser(asset.ownerName, user) ? user._id : undefined,
        status: asset.status,
        title: asset.title,
        type: asset.type,
        updatedAt: now,
        uploadedBy: user._id,
        url: asset.url,
      });
    }

    await ensurePreferences(ctx, user._id, workspace._id, campaignId);
    await logActivity(ctx, campaignId, user, "created campaign", "campaign", campaignId, args.campaignName);
    return campaignId;
  },
});

export const dashboard = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspace._id))
      .order("desc")
      .take(25);
    const campaign = args.campaignId ? await ctx.db.get(args.campaignId) : campaigns[0] ?? null;

    if (!campaign || campaign.workspaceId !== workspace._id) {
      return {
        activity: [],
        assets: [],
        campaign: null,
        campaigns,
        comments: [],
        phases: [],
        preferences: await getPreferences(ctx, user._id, workspace._id),
        tasks: [],
        team: await listWorkspaceTeam(ctx, workspace._id),
        user: safeUser(user),
      };
    }

    const [phases, tasks, assets, comments, activity, preferences, team] = await Promise.all([
      ctx.db.query("campaignPhases").withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id)).take(50),
      ctx.db.query("campaignTasks").withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id)).take(250),
      ctx.db.query("campaignAssets").withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id)).take(200),
      ctx.db.query("campaignComments").withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id)).order("desc").take(80),
      ctx.db.query("campaignActivity").withIndex("by_campaignId", (q) => q.eq("campaignId", campaign._id)).order("desc").take(80),
      getPreferences(ctx, user._id, workspace._id),
      listWorkspaceTeam(ctx, workspace._id),
    ]);

    return {
      activity,
      assets,
      campaign,
      campaigns,
      comments,
      phases: phases.sort((a, b) => a.order - b.order),
      preferences,
      tasks: tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order),
      team,
      user: safeUser(user),
    };
  },
});

export const addTask = mutation({
  args: {
    campaignId: v.id("campaigns"),
    description: v.string(),
    dueDate: v.string(),
    ownerName: v.string(),
    phaseId: v.optional(v.id("campaignPhases")),
    priority: priorityValidator,
    section: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const campaign = await requireCampaign(ctx, args.campaignId, workspace._id);
    const now = Date.now();
    const taskId = await ctx.db.insert("campaignTasks", {
      assignedUserId: ownerMatchesUser(args.ownerName, user) ? user._id : undefined,
      campaignId: campaign._id,
      createdAt: now,
      createdBy: user._id,
      description: args.description,
      dueDate: args.dueDate,
      order: now,
      ownerName: args.ownerName,
      phaseId: args.phaseId,
      priority: args.priority,
      section: args.section,
      status: "Not Started",
      title: args.title,
      updatedAt: now,
    });
    await logActivity(ctx, campaign._id, user, "added task", "task", taskId, args.title);
    return taskId;
  },
});

export const updateTask = mutation({
  args: {
    assignedUserId: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    status: v.optional(taskStatusValidator),
    taskId: v.id("campaignTasks"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found.");
    const campaign = await requireCampaign(ctx, task.campaignId, workspace._id);
    const now = Date.now();
    await ctx.db.patch(task._id, {
      assignedUserId: args.assignedUserId,
      completedAt: args.status === "Complete" ? now : args.status ? undefined : task.completedAt,
      dueDate: args.dueDate,
      notes: args.notes,
      ownerName: args.ownerName,
      priority: args.priority,
      status: args.status,
      title: args.title,
      updatedAt: now,
    });
    await logActivity(ctx, campaign._id, user, args.status ? `marked ${args.status.toLowerCase()}` : "updated task", "task", task._id, task.title);
    return true;
  },
});

export const addAsset = mutation({
  args: {
    campaignId: v.id("campaigns"),
    contentType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    notes: v.optional(v.string()),
    ownerName: v.string(),
    status: assetStatusValidator,
    storageId: v.optional(v.id("_storage")),
    taskId: v.optional(v.id("campaignTasks")),
    title: v.string(),
    type: assetTypeValidator,
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const campaign = await requireCampaign(ctx, args.campaignId, workspace._id);
    const now = Date.now();
    const assetId = await ctx.db.insert("campaignAssets", {
      campaignId: campaign._id,
      contentType: args.contentType,
      createdAt: now,
      fileName: args.fileName,
      notes: args.notes,
      ownerName: args.ownerName,
      ownerUserId: ownerMatchesUser(args.ownerName, user) ? user._id : undefined,
      status: args.status,
      storageId: args.storageId,
      taskId: args.taskId,
      title: args.title,
      type: args.type,
      updatedAt: now,
      uploadedBy: user._id,
      url: args.url,
    });
    await logActivity(ctx, campaign._id, user, "uploaded asset", "asset", assetId, args.title);
    return assetId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addComment = mutation({
  args: {
    assetId: v.optional(v.id("campaignAssets")),
    body: v.string(),
    campaignId: v.id("campaigns"),
    taskId: v.optional(v.id("campaignTasks")),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const campaign = await requireCampaign(ctx, args.campaignId, workspace._id);
    const now = Date.now();
    const commentId = await ctx.db.insert("campaignComments", {
      assetId: args.assetId,
      body: args.body,
      campaignId: campaign._id,
      createdAt: now,
      createdBy: user._id,
      createdByName: user.name,
      taskId: args.taskId,
    });
    await logActivity(ctx, campaign._id, user, "commented", "comment", commentId, args.body.slice(0, 120));
    return commentId;
  },
});

export const updatePreferences = mutation({
  args: {
    dashboardView: v.optional(v.union(v.literal("compact"), v.literal("comfortable"))),
    defaultCampaignId: v.optional(v.id("campaigns")),
    defaultOwnerFilter: v.optional(v.string()),
    showCompletedTasks: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const existing = await getPreferences(ctx, user._id, workspace._id);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        dashboardView: args.dashboardView,
        defaultCampaignId: args.defaultCampaignId,
        defaultOwnerFilter: args.defaultOwnerFilter,
        showCompletedTasks: args.showCompletedTasks,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("userPreferences", {
      createdAt: now,
      dashboardView: args.dashboardView ?? "comfortable",
      defaultCampaignId: args.defaultCampaignId,
      defaultOwnerFilter: args.defaultOwnerFilter,
      showCompletedTasks: args.showCompletedTasks ?? true,
      updatedAt: now,
      userId: user._id,
      workspaceId: workspace._id,
    });
  },
});

export const updatePhase = mutation({
  args: {
    description: v.optional(v.string()),
    endsAt: v.optional(v.string()),
    name: v.optional(v.string()),
    order: v.optional(v.number()),
    phaseId: v.id("campaignPhases"),
    startsAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, workspace } = await requireViewer(ctx);
    const phase = await ctx.db.get(args.phaseId);
    if (!phase) throw new Error("Phase not found.");
    const campaign = await requireCampaign(ctx, phase.campaignId, workspace._id);
    await ctx.db.patch(phase._id, {
      description: args.description,
      endsAt: args.endsAt,
      name: args.name,
      order: args.order,
      startsAt: args.startsAt,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, campaign._id, user, "updated phase", "phase", phase._id, args.name ?? phase.name);
    return true;
  },
});

async function requireViewer(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new Error("Not authenticated.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email!.trim().toLowerCase()))
    .unique();
  if (!user) throw new Error("User not found.");
  const workspace = await getPrimaryWorkspace(ctx, user._id);
  if (!workspace) throw new Error("Workspace not found.");
  return { identity, user, workspace };
}

async function getPrimaryWorkspace(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const owned = await ctx.db
    .query("workspaces")
    .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
    .first();
  if (owned) return owned;
  const membership = await ctx.db.query("workspaceMembers").withIndex("by_userId", (q) => q.eq("userId", userId)).first();
  return membership ? await ctx.db.get(membership.workspaceId) : null;
}

async function requireCampaign(ctx: QueryCtx | MutationCtx, campaignId: Id<"campaigns">, workspaceId: Id<"workspaces">) {
  const campaign = await ctx.db.get(campaignId);
  if (!campaign || campaign.workspaceId !== workspaceId) throw new Error("Campaign not found.");
  return campaign;
}

async function getPreferences(ctx: QueryCtx | MutationCtx, userId: Id<"users">, workspaceId: Id<"workspaces">) {
  return await ctx.db
    .query("userPreferences")
    .withIndex("by_userId_and_workspaceId", (q) => q.eq("userId", userId).eq("workspaceId", workspaceId))
    .unique();
}

async function ensurePreferences(ctx: MutationCtx, userId: Id<"users">, workspaceId: Id<"workspaces">, campaignId: Id<"campaigns">) {
  const existing = await getPreferences(ctx, userId, workspaceId);
  if (existing) return existing._id;
  const now = Date.now();
  return await ctx.db.insert("userPreferences", {
    createdAt: now,
    dashboardView: "comfortable",
    defaultCampaignId: campaignId,
    showCompletedTasks: true,
    updatedAt: now,
    userId,
    workspaceId,
  });
}

async function listWorkspaceTeam(ctx: QueryCtx | MutationCtx, workspaceId: Id<"workspaces">) {
  const members = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
    .take(100);
  const rows: Array<{ email: string; id: Id<"users">; name: string; role: Doc<"workspaceMembers">["role"] }> = [];
  for (const member of members) {
    const user = await ctx.db.get(member.userId);
    if (user) rows.push({ email: user.email, id: user._id, name: user.name, role: member.role });
  }
  return rows;
}

async function logActivity(
  ctx: MutationCtx,
  campaignId: Id<"campaigns">,
  user: Doc<"users">,
  action: string,
  targetType: "campaign" | "phase" | "task" | "asset" | "comment",
  targetId: string,
  detail?: string,
) {
  await ctx.db.insert("campaignActivity", {
    action,
    actorName: user.name,
    actorUserId: user._id,
    campaignId,
    createdAt: Date.now(),
    detail,
    targetId,
    targetType,
  });
}

function safeUser(user: Doc<"users">) {
  return { email: user.email, id: user._id, name: user.name, role: user.role };
}

function ownerMatchesUser(ownerName: string, user: Doc<"users">) {
  const haystack = `${ownerName} ${user.name} ${user.email}`.toLowerCase();
  return haystack.includes(user.name.split(" ")[0]?.toLowerCase() ?? "") || ownerName.toLowerCase().includes("abby");
}
