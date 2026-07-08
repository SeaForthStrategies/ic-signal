"use client";

import {
  Activity,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileUp,
  Filter,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
  LogOut,
  MessageSquareText,
  Plus,
  Rocket,
  Search,
  Settings2,
  Share2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import seedData from "@/data/launch-data.json";

type View = "dashboard" | "plan" | "assets" | "workflows" | "milestones" | "intelligence" | "settings";
type TaskStatus = "Not Started" | "In Progress" | "Needs Review" | "Complete";
type Priority = "Low" | "Medium" | "High" | "Urgent";
type AssetStatus = "Draft" | "Needs Review" | "Approved" | "Published";
type AssetType = "PDF" | "Image" | "Copy Doc" | "Deck" | "Creative" | "Link" | "Other";

type CrmTask = {
  _id: Id<"campaignTasks">;
  assignedUserId?: Id<"users">;
  campaignId: Id<"campaigns">;
  day?: number;
  description: string;
  dueDate: string;
  notes?: string;
  ownerName: string;
  phaseId?: Id<"campaignPhases">;
  priority: Priority;
  section: string;
  status: TaskStatus;
  title: string;
  updatedAt: number;
};

type CrmAsset = {
  _id: Id<"campaignAssets">;
  campaignId: Id<"campaigns">;
  contentType?: string;
  fileName?: string;
  notes?: string;
  ownerName: string;
  status: AssetStatus;
  storageId?: Id<"_storage">;
  taskId?: Id<"campaignTasks">;
  title: string;
  type: AssetType;
  updatedAt: number;
  url?: string;
};

type CrmPhase = {
  _id: Id<"campaignPhases">;
  description?: string;
  endsAt?: string;
  name: string;
  order: number;
  startsAt?: string;
};

const navItems = [
  { href: "/dashboard", label: "Home", detail: "Today + progress", icon: LayoutDashboard },
  { href: "/plan", label: "Timeline", detail: "Phases + milestones", icon: CalendarDays },
  { href: "/workflows", label: "Daily Work", detail: "Checklist CRM", icon: ListChecks },
  { href: "/assets", label: "Assets", detail: "Uploads + links", icon: ClipboardCheck },
  { href: "/intelligence", label: "Team", detail: "Sharing + activity", icon: Users },
  { href: "/settings", label: "Profile", detail: "Preferences", icon: Settings2 },
];

const taskStatuses: TaskStatus[] = ["Not Started", "In Progress", "Needs Review", "Complete"];
const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
const assetStatuses: AssetStatus[] = ["Draft", "Needs Review", "Approved", "Published"];
const assetTypes: AssetType[] = ["PDF", "Image", "Copy Doc", "Deck", "Creative", "Link", "Other"];

const typedSeed = seedData as {
  assets: Array<{ Asset: string; Category: string; Notes: string | null; Owner: string; Status: string; "Upload Link"?: string }>;
  launchInputs: Array<{ label: string; value: string | number }>;
  plan: Array<{
    "Action Steps": string;
    Date: string;
    Day: number;
    Deliverable: string;
    Notes: string | null;
    Owner: string;
    Phase: string;
    "Primary Focus": string;
    Status: string;
  }>;
};

function seedPayload() {
  const phaseNames = Array.from(new Set(typedSeed.plan.map((item) => phaseBucket(item.Phase))));
  const phases = phaseNames.map((name, index) => {
    const rows = typedSeed.plan.filter((item) => phaseBucket(item.Phase) === name);
    return {
      description: `${name} workstream for the July 30 webinar campaign.`,
      endsAt: rows.at(-1)?.Date,
      name,
      order: index + 1,
      startsAt: rows[0]?.Date,
    };
  });
  const tasks = typedSeed.plan.map((item, index) => ({
    day: item.Day,
    description: `${item["Action Steps"]} Deliverable: ${item.Deliverable}`,
    dueDate: item.Date,
    notes: item.Notes ?? undefined,
    order: index + 1,
    ownerName: item.Owner,
    phaseName: phaseBucket(item.Phase),
    priority: priorityFor(item.Date, item.Status),
    section: item.Phase.replace("July 30 Sprint / ", ""),
    status: statusFor(item.Status),
    title: item["Primary Focus"],
  }));
  const assets = typedSeed.assets.map((item) => ({
    notes: item.Notes ?? undefined,
    ownerName: item.Owner,
    status: item.Status === "Done" ? "Approved" as AssetStatus : "Draft" as AssetStatus,
    title: item.Asset,
    type: assetTypeFor(item.Category),
    url: item["Upload Link"] || undefined,
  }));
  return {
    assets,
    campaignName: "Finding Winners July 30 Webinar",
    deadline: String(typedSeed.launchInputs.find((item) => item.label === "Target Webinar Date")?.value ?? "2026-07-30"),
    description: "Daily action CRM for the July 30 Finding Winners webinar campaign.",
    phases,
    tasks,
  };
}

export default function CampaignCommandCenter({ view = "dashboard" }: { view?: View }) {
  const pathname = usePathname();
  const dashboard = useQuery(api.crm.dashboard, {});
  const ensureSeedCampaign = useMutation(api.crm.ensureSeedCampaign);
  const updateTask = useMutation(api.crm.updateTask);
  const addTask = useMutation(api.crm.addTask);
  const addAsset = useMutation(api.crm.addAsset);
  const addComment = useMutation(api.crm.addComment);
  const updatePreferences = useMutation(api.crm.updatePreferences);
  const updatePhase = useMutation(api.crm.updatePhase);
  const generateUploadUrl = useMutation(api.crm.generateUploadUrl);
  const [seedRequested, setSeedRequested] = useState(false);
  const [filters, setFilters] = useState({ due: "all", owner: "all", priority: "all", query: "", status: "all" });
  const [quickPanel, setQuickPanel] = useState<"task" | "asset" | "comment" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (dashboard === undefined || dashboard.campaign || seedRequested) return;
    const timer = window.setTimeout(() => {
      setSeedRequested(true);
      ensureSeedCampaign(seedPayload()).catch(() => setSeedRequested(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [dashboard, ensureSeedCampaign, seedRequested]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (dashboard === undefined) {
    return <LoadingShell />;
  }

  if (!dashboard.campaign) {
    return (
      <main className="crm-shell">
        <section className="crm-empty-state">
          <Rocket size={34} />
          <h1>Preparing your campaign CRM</h1>
          <p>We are creating the July 30 campaign workspace in Convex.</p>
          {seedRequested && <span>Loading campaign data...</span>}
        </section>
      </main>
    );
  }

  const tasks = dashboard.tasks as CrmTask[];
  const assets = dashboard.assets as CrmAsset[];
  const phases = dashboard.phases as CrmPhase[];
  const todayIso = new Date().toISOString().slice(0, 10);
  const filteredTasks = filterTasks(tasks, filters, todayIso);
  const visibleView = view === "plan" ? "timeline" : view === "assets" ? "assets" : view === "settings" ? "profile" : view === "intelligence" ? "team" : view === "dashboard" ? "home" : "daily";
  const owners = Array.from(new Set([...tasks.map((task) => task.ownerName), ...dashboard.team.map((member) => member.name)])).filter(Boolean);
  const progress = percent(tasks.filter((task) => task.status === "Complete").length, tasks.length);
  const todaysTasks = tasks.filter((task) => task.dueDate === todayIso && task.status !== "Complete");
  const focusTasks = todaysTasks.length > 0 ? todaysTasks : tasks.filter((task) => task.dueDate >= todayIso && task.status !== "Complete").slice(0, 5);
  const overdueTasks = tasks.filter((task) => task.dueDate < todayIso && task.status !== "Complete").slice(0, 8);
  const upcomingTasks = tasks.filter((task) => task.dueDate > todayIso && task.status !== "Complete").slice(0, 8);
  const recentUploads = [...assets].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  return (
    <main className="crm-shell">
      <aside className="crm-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true"><Rocket size={22} /></div>
          <div>
            <p>Campaign CRM</p>
            <h1>IC Signal</h1>
          </div>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
            return (
              <Link className={active ? "side-link active" : "side-link"} href={item.href} key={item.href}>
                <Icon size={18} />
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-card">
          <span>Campaign progress</span>
          <strong>{progress}%</strong>
          <div className="progress-track" aria-hidden="true"><div style={{ width: `${progress}%` }} /></div>
        </div>
      </aside>

      <section className="crm-main">
        <header className="crm-topbar">
          <div>
            <p className="eyebrow">{dashboard.campaign.deadline} deadline</p>
            <h1>{dashboard.campaign.name}</h1>
          </div>
          <div className="crm-actions">
            <button type="button" onClick={() => setQuickPanel("task")}><Plus size={16} /> Add task</button>
            <button type="button" onClick={() => setQuickPanel("asset")}><Upload size={16} /> Upload asset</button>
            <button type="button" onClick={() => setQuickPanel("comment")}><Share2 size={16} /> Share update</button>
            <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>
          </div>
        </header>

        {message && <p className="crm-toast">{message}</p>}
        {quickPanel && (
          <QuickPanel
            campaignId={dashboard.campaign._id}
            generateUploadUrl={generateUploadUrl}
            onAddAsset={addAsset}
            onAddComment={addComment}
            onAddTask={addTask}
            onClose={() => setQuickPanel(null)}
            onMessage={setMessage}
            panel={quickPanel}
            phases={phases}
            tasks={tasks}
          />
        )}

        <Filters filters={filters} owners={owners} setFilters={setFilters} />

        {visibleView === "home" && (
          <DashboardHome
            activity={dashboard.activity}
            assets={recentUploads}
            campaignProgress={progress}
            comments={dashboard.comments}
            focusIsToday={todaysTasks.length > 0}
            focusTasks={focusTasks}
            overdueTasks={overdueTasks}
            team={dashboard.team}
            upcomingTasks={upcomingTasks}
            updateTask={updateTask}
          />
        )}
        {visibleView === "timeline" && <CampaignTimeline phases={phases} tasks={tasks} updatePhase={updatePhase} />}
        {visibleView === "daily" && <DailyWork tasks={filteredTasks} updateTask={updateTask} />}
        {visibleView === "assets" && <AssetLibrary assets={assets} tasks={tasks} />}
        {visibleView === "team" && <TeamSharing activity={dashboard.activity} comments={dashboard.comments} team={dashboard.team} />}
        {visibleView === "profile" && (
          <ProfilePanel
            assignedTasks={tasks.filter((task) => task.assignedUserId === dashboard.user.id || task.ownerName.includes(dashboard.user.name.split(" ")[0] ?? ""))}
            preferences={dashboard.preferences}
            updatePreferences={updatePreferences}
            user={dashboard.user}
          />
        )}
      </section>
    </main>
  );
}

function DashboardHome({
  activity,
  assets,
  campaignProgress,
  comments,
  focusIsToday,
  focusTasks,
  overdueTasks,
  team,
  upcomingTasks,
  updateTask,
}: {
  activity: Array<{ _id: string; action: string; actorName: string; createdAt: number; detail?: string }>;
  assets: CrmAsset[];
  campaignProgress: number;
  comments: Array<{ _id: string; body: string; createdByName: string }>;
  focusIsToday: boolean;
  focusTasks: CrmTask[];
  overdueTasks: CrmTask[];
  team: Array<{ id: Id<"users">; name: string; role: string }>;
  upcomingTasks: CrmTask[];
  updateTask: ReturnType<typeof useMutation<typeof api.crm.updateTask>>;
}) {
  return (
    <section className="crm-dashboard-layout">
      <div className="crm-dashboard-primary">
        <article className="crm-focus-card">
          <div className="crm-section-heading">
            <span><Clock3 size={18} /> {focusIsToday ? "What I need to do today" : "Next actionable work"}</span>
            <b>{focusTasks.length} open</b>
          </div>
          {!focusIsToday && <p className="quiet-copy crm-focus-note">No open tasks are due today. Here is the next work to move the campaign forward.</p>}
          <TaskList compact empty="No open work found." tasks={focusTasks} updateTask={updateTask} />
        </article>
        <article className="crm-card">
          <div className="crm-section-heading"><span><CircleAlert size={18} /> Overdue</span><b>{overdueTasks.length}</b></div>
          <TaskList compact empty="Nothing overdue." tasks={overdueTasks} updateTask={updateTask} />
        </article>
        <article className="crm-card">
          <div className="crm-section-heading"><span><FileUp size={18} /> Recent uploads</span><b>{assets.length}</b></div>
          <AssetList assets={assets} />
        </article>
      </div>
      <div className="crm-dashboard-side">
        <article className="crm-card">
          <MetricRing label="Campaign progress" value={campaignProgress} />
        </article>
        <article className="crm-card">
          <div className="crm-section-heading"><span><CalendarDays size={18} /> Upcoming</span><b>{upcomingTasks.length}</b></div>
          <TaskList compact empty="No upcoming tasks." tasks={upcomingTasks} updateTask={updateTask} />
        </article>
        <article className="crm-card">
          <div className="crm-section-heading"><span><Activity size={18} /> Team activity</span><b>{team.length} people</b></div>
          <ActivityList activity={activity} comments={comments} />
        </article>
      </div>
    </section>
  );
}

function CampaignTimeline({ phases, tasks, updatePhase }: { phases: CrmPhase[]; tasks: CrmTask[]; updatePhase: ReturnType<typeof useMutation<typeof api.crm.updatePhase>> }) {
  return (
    <section className="crm-stack">
      <div className="crm-page-title">
        <p className="eyebrow">Campaign Timeline</p>
        <h2>Pre-webinar, live webinar, and post-webinar phases</h2>
      </div>
      <div className="phase-board">
        {phases.map((phase, index) => {
          const phaseTasks = tasks.filter((task) => task.phaseId === phase._id);
          return (
            <article className="phase-column" key={phase._id}>
              <div className="phase-header">
                <div>
                  <span>Phase {index + 1}</span>
                  <h3>{phase.name}</h3>
                </div>
                <button aria-label="Move phase down" type="button" onClick={() => updatePhase({ order: phase.order + 1.5, phaseId: phase._id })}>
                  <ArrowUpDown size={16} />
                </button>
              </div>
              <p>{phase.description}</p>
              <small>{phase.startsAt} to {phase.endsAt}</small>
              <div className="phase-task-list">
                {phaseTasks.slice(0, 8).map((task) => <TaskMini key={task._id} task={task} />)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DailyWork({ tasks, updateTask }: { tasks: CrmTask[]; updateTask: ReturnType<typeof useMutation<typeof api.crm.updateTask>> }) {
  const grouped = groupByDate(tasks);
  return (
    <section className="crm-stack">
      <div className="crm-page-title">
        <p className="eyebrow">Daily Work View</p>
        <h2>Checklist by day</h2>
      </div>
      {Object.entries(grouped).map(([date, rows]) => (
        <article className="daily-section" key={date}>
          <div className="crm-section-heading"><span>{formatDate(date)}</span><b>{rows.length} tasks</b></div>
          <TaskList tasks={rows} updateTask={updateTask} />
        </article>
      ))}
    </section>
  );
}

function AssetLibrary({ assets, tasks }: { assets: CrmAsset[]; tasks: CrmTask[] }) {
  const [assetFilter, setAssetFilter] = useState("all");
  const visible = assetFilter === "all" ? assets : assets.filter((asset) => asset.status === assetFilter || asset.type === assetFilter);
  return (
    <section className="crm-stack">
      <div className="crm-page-title">
        <p className="eyebrow">Asset Library</p>
        <h2>Uploads, links, docs, decks, and creative</h2>
      </div>
      <div className="asset-filter-row">
        <select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}>
          <option value="all">All assets</option>
          {assetTypes.map((type) => <option key={type}>{type}</option>)}
          {assetStatuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>
      <div className="asset-library-grid">
        {visible.map((asset) => (
          <article className="asset-library-card" key={asset._id}>
            <div className="item-card-top"><span>{asset.type}</span><StatusPill value={asset.status} /></div>
            <h3>{asset.title}</h3>
            <p>{asset.notes || tasks.find((task) => task._id === asset.taskId)?.title || "No notes yet."}</p>
            <div className="meta-row">
              <span>{asset.ownerName}</span>
              {asset.url && <a href={asset.url} rel="noreferrer" target="_blank"><LinkIcon size={14} /> Open</a>}
              {asset.storageId && <span>{asset.fileName ?? "File uploaded"}</span>}
            </div>
          </article>
        ))}
        {visible.length === 0 && <EmptyState title="No assets yet" detail="Upload a file or add a link from the quick actions." />}
      </div>
    </section>
  );
}

function TeamSharing({ activity, comments, team }: { activity: Array<{ _id: string; action: string; actorName: string; createdAt: number; detail?: string }>; comments: Array<{ _id: string; body: string; createdByName: string }>; team: Array<{ email: string; id: Id<"users">; name: string; role: string }> }) {
  return (
    <section className="crm-home-grid">
      <article className="crm-card">
        <div className="crm-section-heading"><span><Users size={18} /> Team</span><b>{team.length}</b></div>
        <div className="team-list">{team.map((member) => <div key={member.id}><strong>{member.name}</strong><span>{member.email}</span><small>{member.role}</small></div>)}</div>
      </article>
      <article className="crm-card wide-panel">
        <div className="crm-section-heading"><span><MessageSquareText size={18} /> Shared updates</span><b>{comments.length}</b></div>
        <ActivityList activity={activity} comments={comments} />
      </article>
    </section>
  );
}

function ProfilePanel({ assignedTasks, preferences, updatePreferences, user }: { assignedTasks: CrmTask[]; preferences: { dashboardView: "compact" | "comfortable"; showCompletedTasks: boolean } | null; updatePreferences: ReturnType<typeof useMutation<typeof api.crm.updatePreferences>>; user: { email: string; id: Id<"users">; name: string; role: string } }) {
  return (
    <section className="crm-home-grid">
      <article className="crm-card">
        <p className="eyebrow">Profile</p>
        <h2>{user.name}</h2>
        <p className="quiet-copy">{user.email}</p>
        <StatusPill value={user.role} />
      </article>
      <article className="crm-card">
        <div className="crm-section-heading"><span><Settings2 size={18} /> Preferences</span></div>
        <label className="crm-toggle"><input checked={preferences?.showCompletedTasks ?? true} type="checkbox" onChange={(event) => updatePreferences({ showCompletedTasks: event.target.checked })} /> Show completed tasks</label>
        <label className="crm-field-label">Dashboard density
          <select value={preferences?.dashboardView ?? "comfortable"} onChange={(event) => updatePreferences({ dashboardView: event.target.value as "compact" | "comfortable" })}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </article>
      <article className="crm-card wide-panel">
        <div className="crm-section-heading"><span><ListChecks size={18} /> My assigned work</span><b>{assignedTasks.length}</b></div>
        <div className="profile-history">{assignedTasks.slice(0, 12).map((task) => <TaskMini key={task._id} task={task} />)}</div>
      </article>
    </section>
  );
}

function TaskList({ compact = false, empty, tasks, updateTask }: { compact?: boolean; empty?: string; tasks: CrmTask[]; updateTask: ReturnType<typeof useMutation<typeof api.crm.updateTask>> }) {
  if (tasks.length === 0) return <EmptyState title={empty ?? "No tasks found"} detail="Adjust filters or add a new task." />;
  return (
    <div className={compact ? "task-list compact" : "task-list"}>
      {tasks.map((task) => (
        <article className="task-row" key={task._id}>
          <button aria-label="Mark complete" className="task-check" type="button" onClick={() => updateTask({ status: task.status === "Complete" ? "In Progress" : "Complete", taskId: task._id })}>
            {task.status === "Complete" && <CheckCircle2 size={18} />}
          </button>
          <div className="task-main">
            <div className="task-title-line">
              <h3>{task.title}</h3>
              <PriorityPill value={task.priority} />
              <StatusPill value={task.status} />
            </div>
            {!compact && <p>{task.description}</p>}
            <div className="task-meta"><span>{formatDate(task.dueDate)}</span><span>{task.ownerName}</span><span>{task.section}</span></div>
            {!compact && (
              <textarea
                aria-label={`Notes for ${task.title}`}
                defaultValue={task.notes ?? ""}
                onBlur={(event) => updateTask({ notes: event.target.value, taskId: task._id })}
                placeholder="Add notes, blockers, links, or review details..."
              />
            )}
          </div>
          <div className="task-controls">
            <select value={task.status} onChange={(event) => updateTask({ status: event.target.value as TaskStatus, taskId: task._id })}>
              {taskStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            {!compact && <input type="date" value={task.dueDate} onChange={(event) => updateTask({ dueDate: event.target.value, taskId: task._id })} />}
          </div>
        </article>
      ))}
    </div>
  );
}

function QuickPanel({ campaignId, generateUploadUrl, onAddAsset, onAddComment, onAddTask, onClose, onMessage, panel, phases, tasks }: { campaignId: Id<"campaigns">; generateUploadUrl: ReturnType<typeof useMutation<typeof api.crm.generateUploadUrl>>; onAddAsset: ReturnType<typeof useMutation<typeof api.crm.addAsset>>; onAddComment: ReturnType<typeof useMutation<typeof api.crm.addComment>>; onAddTask: ReturnType<typeof useMutation<typeof api.crm.addTask>>; onClose: () => void; onMessage: (message: string) => void; panel: "task" | "asset" | "comment"; phases: CrmPhase[]; tasks: CrmTask[] }) {
  const [uploading, setUploading] = useState(false);

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onAddTask({
      campaignId,
      description: String(data.get("description") || ""),
      dueDate: String(data.get("dueDate") || new Date().toISOString().slice(0, 10)),
      ownerName: String(data.get("ownerName") || "Unassigned"),
      phaseId: data.get("phaseId") ? String(data.get("phaseId")) as Id<"campaignPhases"> : undefined,
      priority: String(data.get("priority") || "Medium") as Priority,
      section: String(data.get("section") || "General"),
      title: String(data.get("title") || "Untitled task"),
    });
    onMessage("Task added.");
    onClose();
  }

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    let storageId: Id<"_storage"> | undefined;
    let fileName: string | undefined;
    let contentType: string | undefined;
    if (file instanceof File && file.size > 0) {
      const uploadUrl = await generateUploadUrl({});
      const upload = await fetch(uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
        method: "POST",
      });
      const body = (await upload.json()) as { storageId: Id<"_storage"> };
      storageId = body.storageId;
      fileName = file.name;
      contentType = file.type;
    }
    await onAddAsset({
      campaignId,
      contentType,
      fileName,
      notes: String(data.get("notes") || ""),
      ownerName: String(data.get("ownerName") || "Unassigned"),
      status: String(data.get("status") || "Draft") as AssetStatus,
      storageId,
      taskId: data.get("taskId") ? String(data.get("taskId")) as Id<"campaignTasks"> : undefined,
      title: String(data.get("title") || fileName || "Campaign asset"),
      type: String(data.get("type") || "Other") as AssetType,
      url: String(data.get("url") || "") || undefined,
    });
    setUploading(false);
    onMessage("Asset saved.");
    onClose();
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onAddComment({
      body: String(data.get("body") || ""),
      campaignId,
      taskId: data.get("taskId") ? String(data.get("taskId")) as Id<"campaignTasks"> : undefined,
    });
    onMessage("Update shared with team.");
    onClose();
  }

  return (
    <section className="quick-panel">
      <div className="crm-section-heading"><span>{panel === "task" ? "Add task" : panel === "asset" ? "Upload asset" : "Share update"}</span><button type="button" onClick={onClose}>Close</button></div>
      {panel === "task" && (
        <form className="quick-form" onSubmit={submitTask}>
          <input name="title" placeholder="Task title" required />
          <textarea name="description" placeholder="Task details" />
          <div className="quick-form-grid">
            <input name="dueDate" type="date" required />
            <select name="priority">{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
            <input name="ownerName" placeholder="Assigned person" />
            <input name="section" placeholder="Section" />
            <select name="phaseId"><option value="">No phase</option>{phases.map((phase) => <option key={phase._id} value={phase._id}>{phase.name}</option>)}</select>
          </div>
          <button type="submit"><Plus size={16} /> Add task</button>
        </form>
      )}
      {panel === "asset" && (
        <form className="quick-form" onSubmit={submitAsset}>
          <input name="title" placeholder="Asset title" />
          <input name="url" placeholder="External link" type="url" />
          <input name="file" type="file" />
          <textarea name="notes" placeholder="Notes, review instructions, or share context" />
          <div className="quick-form-grid">
            <select name="type">{assetTypes.map((type) => <option key={type}>{type}</option>)}</select>
            <select name="status">{assetStatuses.map((status) => <option key={status}>{status}</option>)}</select>
            <input name="ownerName" placeholder="Owner" />
            <select name="taskId"><option value="">No linked task</option>{tasks.slice(0, 80).map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}</select>
          </div>
          <button disabled={uploading} type="submit"><Upload size={16} /> {uploading ? "Uploading..." : "Save asset"}</button>
        </form>
      )}
      {panel === "comment" && (
        <form className="quick-form" onSubmit={submitComment}>
          <textarea name="body" placeholder="Share a team update, blocker, review request, or completion note" required />
          <select name="taskId"><option value="">Campaign-level update</option>{tasks.slice(0, 80).map((task) => <option key={task._id} value={task._id}>{task.title}</option>)}</select>
          <button type="submit"><Share2 size={16} /> Share with team</button>
        </form>
      )}
    </section>
  );
}

function Filters({ filters, owners, setFilters }: { filters: { due: string; owner: string; priority: string; query: string; status: string }; owners: string[]; setFilters: (filters: { due: string; owner: string; priority: string; query: string; status: string }) => void }) {
  return (
    <section className="crm-filter-bar">
      <label><Search size={16} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search tasks, assets, notes" /></label>
      <label><Filter size={16} /><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">All statuses</option>{taskStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <select value={filters.owner} onChange={(event) => setFilters({ ...filters, owner: event.target.value })}><option value="all">All owners</option>{owners.map((owner) => <option key={owner}>{owner}</option>)}</select>
      <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="all">All priorities</option>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
      <select value={filters.due} onChange={(event) => setFilters({ ...filters, due: event.target.value })}><option value="all">All due dates</option><option value="today">Today</option><option value="overdue">Overdue</option><option value="upcoming">Upcoming</option></select>
    </section>
  );
}

function TaskMini({ task }: { task: CrmTask }) {
  return <div className="task-mini"><strong>{task.title}</strong><span>{formatDate(task.dueDate)} / {task.ownerName}</span><StatusPill value={task.status} /></div>;
}

function AssetList({ assets }: { assets: CrmAsset[] }) {
  if (assets.length === 0) return <EmptyState title="No uploads yet" detail="Upload a file or add a link." />;
  return <div className="asset-list">{assets.map((asset) => <div key={asset._id}><strong>{asset.title}</strong><span>{asset.type} / {asset.ownerName}</span><StatusPill value={asset.status} /></div>)}</div>;
}

function ActivityList({ activity, comments }: { activity: Array<{ _id: string; action: string; actorName: string; createdAt: number; detail?: string }>; comments: Array<{ _id: string; body: string; createdByName: string }> }) {
  const rows = [...activity.map((item) => ({ id: item._id, line: `${item.actorName} ${item.action}`, meta: item.detail ?? new Date(item.createdAt).toLocaleDateString() })), ...comments.map((item) => ({ id: item._id, line: item.body, meta: item.createdByName }))].slice(0, 8);
  if (rows.length === 0) return <EmptyState title="No team activity yet" detail="Share an update to start the activity feed." />;
  return <div className="activity-list">{rows.map((row) => <div key={row.id}><strong>{row.line}</strong><span>{row.meta}</span></div>)}</div>;
}

function MetricRing({ label, value }: { label: string; value: number }) {
  return <div className="metric-ring"><strong>{value}%</strong><span>{label}</span><div className="progress-track"><div style={{ width: `${value}%` }} /></div></div>;
}

function EmptyState({ detail, title }: { detail: string; title: string }) {
  return <div className="crm-empty-inline"><strong>{title}</strong><span>{detail}</span></div>;
}

function LoadingShell() {
  return <main className="crm-shell"><section className="crm-empty-state"><Rocket size={34} /><h1>Loading Campaign CRM</h1><p>Connecting to Convex and loading your workspace.</p></section></main>;
}

function PriorityPill({ value }: { value: Priority }) {
  return <span className={`priority-pill ${value.toLowerCase()}`}>{value}</span>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-badge ${value.toLowerCase().replace(/\s+/g, "-")}`}>{value}</span>;
}

function filterTasks(tasks: CrmTask[], filters: { due: string; owner: string; priority: string; query: string; status: string }, todayIso: string) {
  return tasks.filter((task) => {
    const haystack = `${task.title} ${task.description} ${task.ownerName} ${task.section} ${task.notes ?? ""}`.toLowerCase();
    return (
      haystack.includes(filters.query.toLowerCase()) &&
      (filters.status === "all" || task.status === filters.status) &&
      (filters.owner === "all" || task.ownerName === filters.owner) &&
      (filters.priority === "all" || task.priority === filters.priority) &&
      (filters.due === "all" || (filters.due === "today" && task.dueDate === todayIso) || (filters.due === "overdue" && task.dueDate < todayIso) || (filters.due === "upcoming" && task.dueDate > todayIso))
    );
  });
}

function groupByDate(tasks: CrmTask[]) {
  return tasks.reduce<Record<string, CrmTask[]>>((groups, task) => {
    groups[task.dueDate] = [...(groups[task.dueDate] ?? []), task];
    return groups;
  }, {});
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function percent(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function phaseBucket(value: string) {
  if (value.includes("Final Push") || value.includes("Live")) return "Live Webinar";
  if (value.includes("Final") || value.includes("Paid") || value.includes("Soft")) return "Pre-Webinar Push";
  if (value.includes("OWG")) return "Post-Webinar Follow-Up";
  return "Pre-Webinar Build";
}

function statusFor(value: string): TaskStatus {
  if (value === "Done") return "Complete";
  if (value === "In Progress") return "In Progress";
  if (value === "Blocked") return "Needs Review";
  return "Not Started";
}

function priorityFor(date: string, status: string): Priority {
  if (status === "Blocked") return "Urgent";
  if (date >= "2026-07-28") return "Urgent";
  if (date >= "2026-07-23") return "High";
  return "Medium";
}

function assetTypeFor(category: string): AssetType {
  const lower = category.toLowerCase();
  if (lower.includes("page") || lower.includes("link")) return "Link";
  if (lower.includes("deck") || lower.includes("webinar")) return "Deck";
  if (lower.includes("copy") || lower.includes("email")) return "Copy Doc";
  if (lower.includes("creative") || lower.includes("ad")) return "Creative";
  return "Other";
}
