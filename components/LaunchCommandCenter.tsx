"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Eye,
  EyeOff,
  Filter,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquareText,
  Rocket,
  Search,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import seedData from "@/data/launch-data.json";

type Status = "Not Started" | "In Progress" | "Done" | "Blocked" | "Deferred";
type Tab = "plan" | "assets" | "workflows" | "milestones";
type View = "dashboard" | Tab | "intelligence" | "settings";

type PlanItem = {
  Day: number;
  Date: string;
  Phase: string;
  Owner: string;
  "Primary Focus": string;
  "Action Steps": string;
  Deliverable: string;
  Status: Status;
  Notes: string | null;
};

type AssetItem = {
  Category: string;
  Asset: string;
  Owner: string;
  Status: Status;
  Notes: string | null;
  "Content Needed"?: string;
  "Upload Link"?: string;
  "Content Draft"?: string;
};

type WorkflowItem = {
  "#": number;
  Workflow: string;
  Trigger: string;
  "Primary Actions": string;
  Owner: string;
  "Build By Day": number;
  "Test By Day": number;
  "Suppress / Exit Rules": string;
  "Success Check": string;
  Status: Status;
  Notes: string | null;
};

type Milestone = {
  milestone: string;
  targetDay: number;
  owner: string;
  status: Status;
  notes: string;
};

type KpiItem = {
  section: string;
  metric: string;
  target: string;
  actual: string | number | null;
  status: string | null;
  notes: string;
  owner: string;
};

type MessagingItem = {
  element: string;
  guidance: string;
  placement: string;
  owner: string;
};

type MessagingSection = {
  title: string;
  items: MessagingItem[];
};

type MessagingGuide = {
  title: string;
  subtitle: string;
  promiseTitle: string;
  promise: string;
  promiseNotes: string;
  sections: MessagingSection[];
};

type DailyRegistrationMetric = {
  section: string;
  metric: string;
  target: string | number | null;
  values: Array<string | number | null>;
};

type DailyRegistrations = {
  title: string;
  subtitle: string;
  days: string[];
  metrics: DailyRegistrationMetric[];
};

type OperatingRule = {
  number: string;
  rule: string;
};

type PlanWeek = {
  weekNumber: number;
  daysLabel: string;
  dateLabel: string;
  phases: string[];
  rows: PlanItem[];
  done: number;
  total: number;
  blocked: number;
  progress: number;
};

type AppState = {
  plan: PlanItem[];
  assets: AssetItem[];
  workflows: WorkflowItem[];
  milestones: Milestone[];
  registrations: number;
};

type SessionProfile = {
  email: string;
  name?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  userId?: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
};

type TeamMember = {
  email: string;
  id: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
};

type LaunchMetricsData = {
  planDone: number;
  assetsDone: number;
  workflowsDone: number;
  milestonesDone: number;
  blockers: number;
  overallDone: number;
  overallTotal: number;
  overallPct: number;
  planPct: number;
  assetsPct: number;
  workflowsPct: number;
  milestonesPct: number;
  registrationPct: number;
};

type TabMeta = {
  id: Tab;
  label: string;
  eyebrow: string;
  description: string;
  unit: string;
  icon: React.ComponentType<{ size?: number }>;
};

const typedSeed = seedData as {
  plan: PlanItem[];
  assets: AssetItem[];
  workflows: WorkflowItem[];
  milestones: Milestone[];
  launchInputs: Array<{ label: string; value: string | number; notes: string; owner: string }>;
  kpis: KpiItem[];
  messaging: MessagingGuide;
  dailyRegistrations: DailyRegistrations;
  operatingRules: OperatingRule[];
  sourceWorkbook: { fileName: string; importedAt: string };
};

const statusOptions: Status[] = ["Not Started", "In Progress", "Done", "Blocked", "Deferred"];
const storageKey = "finding-winners-launch-os-webinar-v2";
const seedState: AppState = {
  plan: typedSeed.plan,
  assets: typedSeed.assets,
  workflows: typedSeed.workflows,
  milestones: typedSeed.milestones,
  registrations: 0,
};

const tabConfig: TabMeta[] = [
  {
    id: "plan",
    label: "Launch Plan",
    eyebrow: "Execution",
    description: "Run the launch week by week, surface blockers, and keep every owner aligned.",
    unit: "priorities",
    icon: CalendarDays,
  },
  {
    id: "assets",
    label: "Assets",
    eyebrow: "Creative",
    description: "Track pages, copy, emails, ads, and webinar collateral in one organized launch inventory.",
    unit: "assets",
    icon: ClipboardCheck,
  },
  {
    id: "workflows",
    label: "GHL System",
    eyebrow: "Automation",
    description: "Build the follow-up system: registration, reminders, hand raises, no-shows, and investor routing.",
    unit: "workflows",
    icon: Workflow,
  },
  {
    id: "milestones",
    label: "Milestones",
    eyebrow: "Targets",
    description: "Keep the launch gates visible so the team knows what is ready, blocked, and next.",
    unit: "milestones",
    icon: ListChecks,
  },
];

const navItems: Array<{
  href: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { href: "/dashboard", label: "Overview", detail: "Command center", icon: LayoutDashboard },
  { href: "/plan", label: "Launch Plan", detail: "Weekly execution", icon: CalendarDays },
  { href: "/assets", label: "Assets", detail: "Creative inventory", icon: ClipboardCheck },
  { href: "/workflows", label: "Workflows", detail: "GHL system", icon: Workflow },
  { href: "/milestones", label: "Milestones", detail: "Launch gates", icon: ListChecks },
  { href: "/intelligence", label: "Intelligence", detail: "KPIs + messaging", icon: Gauge },
  { href: "/settings", label: "Settings", detail: "Workspace setup", icon: Settings2 },
];

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function statusClass(status: Status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function unique(values: string[]) {
  return Array.from(new Set(values)).filter(Boolean).sort();
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = keyFn(item) || "General";
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function splitOwners(owner: string) {
  return owner
    .split("+")
    .map((person) => person.trim())
    .filter((person) => person && person.toLowerCase() !== "all");
}

function buildPlanWeeks(rows: PlanItem[]): PlanWeek[] {
  const groups = new Map<number, PlanItem[]>();

  [...rows]
    .sort((a, b) => a.Day - b.Day)
    .forEach((item) => {
      const weekNumber = Math.floor((item.Day - 1) / 7) + 1;
      groups.set(weekNumber, [...(groups.get(weekNumber) ?? []), item]);
    });

  return Array.from(groups.entries()).map(([weekNumber, weekRows]) => {
    const first = weekRows[0];
    const last = weekRows[weekRows.length - 1];
    const done = weekRows.filter((item) => item.Status === "Done").length;
    const blocked = weekRows.filter((item) => item.Status === "Blocked").length;

    return {
      weekNumber,
      daysLabel: `Days ${first.Day}-${last.Day}`,
      dateLabel: `${formatDate(first.Date)} - ${formatDate(last.Date)}`,
      phases: unique(weekRows.map((item) => item.Phase)),
      rows: weekRows,
      done,
      total: weekRows.length,
      blocked,
      progress: pct(done, weekRows.length),
    };
  });
}

export default function LaunchCommandCenter({ view = "dashboard" }: { view?: View }) {
  const pathname = usePathname();
  const [appState, setAppState] = useState<AppState>(seedState);
  const [stateReady, setStateReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading");
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [phaseFilter, setPhaseFilter] = useState("All");

  useEffect(() => {
    let active = true;

    async function loadWorkspaceState() {
      try {
        const sessionResponse = await fetch("/api/auth/session");
        if (sessionResponse.ok) {
          const sessionBody = (await sessionResponse.json()) as { session?: SessionProfile | null };
          if (active) setSession(sessionBody.session ?? null);
        }

        const response = await fetch("/api/progress");
        if (response.ok) {
          const body = (await response.json()) as { data?: AppState | null };
          if (active && body.data) {
            setAppState(body.data);
            setSaveStatus("Saved");
          }
        } else {
          const saved = window.localStorage.getItem(storageKey);
          if (active && saved) {
            setAppState(JSON.parse(saved) as AppState);
            setSaveStatus("Local");
          }
        }
      } catch {
        const saved = window.localStorage.getItem(storageKey);
        if (active && saved) {
          setAppState(JSON.parse(saved) as AppState);
          setSaveStatus("Local");
        }
      } finally {
        if (active) setStateReady(true);
      }
    }

    void loadWorkspaceState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!stateReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(appState));
    const timer = window.setTimeout(async () => {
      try {
        setSaveStatus("Saving");
        const response = await fetch("/api/progress", {
          body: JSON.stringify({ data: appState }),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        });
        setSaveStatus(response.ok ? "Saved" : "Local");
      } catch {
        setSaveStatus("Local");
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [appState, stateReady]);

  const registrationGoal = Number(typedSeed.launchInputs.find((item) => item.label === "Registration Goal")?.value ?? 500);
  const webinarDate = String(typedSeed.launchInputs.find((item) => item.label === "Target Webinar Date")?.value ?? "");

  const metrics = useMemo(() => {
    const planDone = appState.plan.filter((item) => item.Status === "Done").length;
    const assetsDone = appState.assets.filter((item) => item.Status === "Done").length;
    const workflowsDone = appState.workflows.filter((item) => item.Status === "Done").length;
    const milestonesDone = appState.milestones.filter((item) => item.status === "Done").length;
    const blockers =
      appState.plan.filter((item) => item.Status === "Blocked").length +
      appState.assets.filter((item) => item.Status === "Blocked").length +
      appState.workflows.filter((item) => item.Status === "Blocked").length +
      appState.milestones.filter((item) => item.status === "Blocked").length;
    const overallDone = planDone + assetsDone + workflowsDone + milestonesDone;
    const overallTotal = appState.plan.length + appState.assets.length + appState.workflows.length + appState.milestones.length;

    return {
      planDone,
      assetsDone,
      workflowsDone,
      milestonesDone,
      blockers,
      overallDone,
      overallTotal,
      overallPct: pct(overallDone, overallTotal),
      planPct: pct(planDone, appState.plan.length),
      assetsPct: pct(assetsDone, appState.assets.length),
      workflowsPct: pct(workflowsDone, appState.workflows.length),
      milestonesPct: pct(milestonesDone, appState.milestones.length),
      registrationPct: pct(appState.registrations, registrationGoal),
    };
  }, [appState, registrationGoal]);

  const todayItem = useMemo(() => {
    const today = new Date();
    return (
      appState.plan.find((item) => {
        const itemDate = new Date(`${item.Date}T12:00:00`);
        return itemDate.toDateString() === today.toDateString();
      }) ?? appState.plan.find((item) => item.Status !== "Done") ?? appState.plan[0]
    );
  }, [appState.plan]);

  const owners = useMemo(
    () =>
      unique([
        ...appState.plan.flatMap((item) => splitOwners(item.Owner)),
        ...appState.assets.flatMap((item) => splitOwners(item.Owner)),
        ...appState.workflows.flatMap((item) => splitOwners(item.Owner)),
        ...appState.milestones.flatMap((item) => splitOwners(item.owner)),
      ]),
    [appState],
  );
  const phases = useMemo(() => unique(appState.plan.map((item) => item.Phase)), [appState.plan]);
  const ownerMatches = (owner: string) => ownerFilter.length === 0 || splitOwners(owner).some((person) => ownerFilter.includes(person));

  const filteredPlan = appState.plan.filter((item) => {
    const haystack = `${item.Day} ${item.Phase} ${item.Owner} ${item["Primary Focus"]} ${item["Action Steps"]} ${item.Deliverable}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.Status === statusFilter) &&
      ownerMatches(item.Owner) &&
      (phaseFilter === "All" || item.Phase === phaseFilter)
    );
  });

  const filteredAssets = appState.assets.filter((item) => {
    const haystack = `${item.Category} ${item.Asset} ${item.Owner} ${item.Notes ?? ""}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.Status === statusFilter) &&
      ownerMatches(item.Owner)
    );
  });

  const filteredWorkflows = appState.workflows.filter((item) => {
    const haystack = `${item.Workflow} ${item.Trigger} ${item["Primary Actions"]} ${item.Owner} ${item["Success Check"]}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.Status === statusFilter) &&
      ownerMatches(item.Owner)
    );
  });

  const filteredMilestones = appState.milestones.filter((item) => {
    const haystack = `${item.milestone} ${item.owner} ${item.notes}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.status === statusFilter) &&
      ownerMatches(item.owner)
    );
  });

  const tabStats: Record<Tab, { total: number; done: number; visible: number; progress: number }> = {
    plan: { total: appState.plan.length, done: metrics.planDone, visible: filteredPlan.length, progress: metrics.planPct },
    assets: { total: appState.assets.length, done: metrics.assetsDone, visible: filteredAssets.length, progress: metrics.assetsPct },
    workflows: {
      total: appState.workflows.length,
      done: metrics.workflowsDone,
      visible: filteredWorkflows.length,
      progress: metrics.workflowsPct,
    },
    milestones: {
      total: appState.milestones.length,
      done: metrics.milestonesDone,
      visible: filteredMilestones.length,
      progress: metrics.milestonesPct,
    },
  };
  const activeTab: Tab = view === "assets" || view === "workflows" || view === "milestones" ? view : "plan";
  const activeTabMeta = tabConfig.find((tab) => tab.id === activeTab) ?? tabConfig[0];
  const activeStats = tabStats[activeTab];
  const filtersActive = query !== "" || statusFilter !== "All" || ownerFilter.length > 0 || phaseFilter !== "All";
  const pageTitle =
    view === "dashboard"
      ? "Launch Command Center"
      : view === "settings"
        ? "Workspace Settings"
        : view === "intelligence"
          ? "Launch Intelligence"
          : activeTabMeta.label;

  function updatePlanStatus(day: number, status: Status) {
    setAppState((current) => ({
      ...current,
      plan: current.plan.map((item) => (item.Day === day ? { ...item, Status: status } : item)),
    }));
  }

  function updateAssetStatus(asset: string, status: Status) {
    setAppState((current) => ({
      ...current,
      assets: current.assets.map((item) => (item.Asset === asset ? { ...item, Status: status } : item)),
    }));
  }

  function updateAssetField(asset: string, field: "Content Needed" | "Upload Link" | "Content Draft", value: string) {
    setAppState((current) => ({
      ...current,
      assets: current.assets.map((item) => (item.Asset === asset ? { ...item, [field]: value } : item)),
    }));
  }

  function updateWorkflowStatus(id: number, status: Status) {
    setAppState((current) => ({
      ...current,
      workflows: current.workflows.map((item) => (item["#"] === id ? { ...item, Status: status } : item)),
    }));
  }

  function updateMilestoneStatus(name: string, status: Status) {
    setAppState((current) => ({
      ...current,
      milestones: current.milestones.map((item) => (item.milestone === name ? { ...item, status } : item)),
    }));
  }

  function resetWorkspace() {
    setAppState(seedState);
    setQuery("");
    setStatusFilter("All");
    setOwnerFilter([]);
    setPhaseFilter("All");
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("All");
    setOwnerFilter([]);
    setPhaseFilter("All");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="saas-shell">
      <aside className="sidebar" aria-label="Product navigation">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <Rocket size={22} />
          </div>
          <div>
            <p>Finding Winners</p>
            <h1>Launch CRM</h1>
          </div>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
            return (
              <Link className={active ? "side-link active" : "side-link"} href={item.href} key={item.href}>
                <Icon size={18} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-card">
          <span>Launch health</span>
          <strong>{metrics.overallPct}%</strong>
          <div className="progress-track" aria-hidden="true">
            <div style={{ width: `${metrics.overallPct}%` }} />
          </div>
        </div>
      </aside>

      <section className="app-main">
        <section className="topbar">
          <div className="brand page-brand">
            <div>
              <p>Oren Klaff / Finding Winners</p>
              <h1>{pageTitle}</h1>
            </div>
          </div>
          <div className="topbar-signal">
            <span>{saveStatus === "Saved" ? "Convex synced" : saveStatus === "Saving" ? "Saving" : "CRM Mode"}</span>
            <strong>{session?.workspaceName ?? "Launch Ready"}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" onClick={resetWorkspace} aria-label="Reset workspace">
              <Settings2 size={18} />
            </button>
            <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </section>

        {view === "dashboard" && (
          <>
            <section className="summary-band">
              <div className="summary-copy">
                <p className="eyebrow">60-day marketing launch CRM</p>
                <h2>Organized execution for a high-stakes launch.</h2>
                <p>
                  A polished operating plane for the July 30 Finding Winners deadline: weekly execution, creative assets,
                  content uploads, GHL automation, milestone gates, and registration momentum in one clean command center.
                </p>
                <div className="hero-actions" aria-label="Launch posture">
                  <span>Pipeline clarity</span>
                  <span>Marketing operations</span>
                  <span>Executive cadence</span>
                </div>
              </div>
              <TodayPanel todayItem={todayItem} />
            </section>

            <LaunchMetrics metrics={metrics} appState={appState} />
            <RegistrationPanel
              registrations={appState.registrations}
              registrationGoal={registrationGoal}
              registrationPct={metrics.registrationPct}
              webinarDate={webinarDate}
              blockers={metrics.blockers}
              onRegistrationsChange={(registrations) => setAppState((current) => ({ ...current, registrations }))}
            />
            <DashboardGrid
              milestones={appState.milestones}
              workflows={appState.workflows}
              assets={appState.assets}
              phases={phases}
            />
          </>
        )}

        {view !== "dashboard" && view !== "settings" && view !== "intelligence" && (
          <section className="workspace page-workspace">
            <WorkspaceHeading activeTabMeta={activeTabMeta} activeStats={activeStats} />
            <Filters
              activeTab={activeTab}
              filtersActive={filtersActive}
              ownerFilter={ownerFilter}
              owners={owners}
              phaseFilter={phaseFilter}
              phases={phases}
              query={query}
              resetFilters={resetFilters}
              setOwnerFilter={setOwnerFilter}
              setPhaseFilter={setPhaseFilter}
              setQuery={setQuery}
              setStatusFilter={setStatusFilter}
              statusFilter={statusFilter}
            />

            {activeTab === "plan" && <PlanWeekList rows={filteredPlan} onStatusChange={updatePlanStatus} />}
            {activeTab === "assets" && (
              <AssetGrid rows={filteredAssets} onAssetFieldChange={updateAssetField} onStatusChange={updateAssetStatus} />
            )}
            {activeTab === "workflows" && <WorkflowGrid rows={filteredWorkflows} onStatusChange={updateWorkflowStatus} />}
            {activeTab === "milestones" && <MilestoneRail rows={filteredMilestones} onStatusChange={updateMilestoneStatus} />}
          </section>
        )}

        {view === "intelligence" && (
          <IntelligencePage
            dailyRegistrations={typedSeed.dailyRegistrations}
            kpis={typedSeed.kpis}
            messaging={typedSeed.messaging}
            operatingRules={typedSeed.operatingRules}
          />
        )}

        {view === "settings" && (
          <SettingsPage
            launchInputs={typedSeed.launchInputs}
            resetWorkspace={resetWorkspace}
            registrationGoal={registrationGoal}
            session={session}
            webinarDate={webinarDate}
          />
        )}
      </section>
    </main>
  );
}

function TodayPanel({ todayItem }: { todayItem: PlanItem }) {
  return (
    <div className="today-panel">
      <div className="panel-heading">
        <Activity size={18} />
        <span>Next Priority</span>
      </div>
      <h3>Day {todayItem.Day}: {todayItem["Primary Focus"]}</h3>
      <p>{todayItem["Action Steps"]}</p>
      <div className="meta-row">
        <span>{formatDate(todayItem.Date)}</span>
        <span>{todayItem.Owner}</span>
        <StatusBadge status={todayItem.Status} />
      </div>
    </div>
  );
}

function LaunchMetrics({ metrics, appState }: { metrics: LaunchMetricsData; appState: AppState }) {
  return (
    <section className="metrics-grid" aria-label="Launch metrics">
      <MetricCard icon={LayoutDashboard} label="Launch Health" value={`${metrics.overallPct}%`} detail={`${metrics.overallDone} of ${metrics.overallTotal} tracked items complete`} progress={metrics.overallPct} />
      <MetricCard icon={CalendarDays} label="Launch Plan" value={`${metrics.planPct}%`} detail={`${metrics.planDone} of ${appState.plan.length} priorities complete`} progress={metrics.planPct} />
      <MetricCard icon={ClipboardCheck} label="Assets Ready" value={`${metrics.assetsPct}%`} detail={`${metrics.assetsDone} of ${appState.assets.length} assets ready`} progress={metrics.assetsPct} />
      <MetricCard icon={Workflow} label="GHL System" value={`${metrics.workflowsPct}%`} detail={`${metrics.workflowsDone} of ${appState.workflows.length} workflows live`} progress={metrics.workflowsPct} />
    </section>
  );
}

function RegistrationPanel({
  blockers,
  onRegistrationsChange,
  registrationGoal,
  registrationPct,
  registrations,
  webinarDate,
}: {
  blockers: number;
  onRegistrationsChange: (registrations: number) => void;
  registrationGoal: number;
  registrationPct: number;
  registrations: number;
  webinarDate: string;
}) {
  return (
    <section className="registration-band">
      <div>
        <div className="panel-heading">
          <Users size={18} />
          <span>Registration Momentum</span>
        </div>
        <h3>{registrations.toLocaleString()} / {registrationGoal.toLocaleString()}</h3>
        <p>Target webinar date: {webinarDate ? formatDate(webinarDate.slice(0, 10)) : "TBD"}. Open blockers: {blockers}.</p>
        <div className="progress-track" aria-hidden="true">
          <div style={{ width: `${Math.min(registrationPct, 100)}%` }} />
        </div>
      </div>
      <div className="registration-controls">
        <input
          aria-label="Current registrations"
          min="0"
          max={registrationGoal}
          type="range"
          value={Math.min(registrations, registrationGoal)}
          onChange={(event) => onRegistrationsChange(Number(event.target.value))}
        />
        <input
          aria-label="Registration count"
          min="0"
          type="number"
          value={registrations}
          onChange={(event) => onRegistrationsChange(Number(event.target.value))}
        />
      </div>
    </section>
  );
}

function DashboardGrid({
  assets,
  milestones,
  phases,
  workflows,
}: {
  assets: AssetItem[];
  milestones: Milestone[];
  phases: string[];
  workflows: WorkflowItem[];
}) {
  const blockedAssets = assets.filter((item) => item.Status === "Blocked").slice(0, 4);
  const nextMilestones = milestones.filter((item) => item.status !== "Done").slice(0, 5);
  const criticalWorkflows = workflows.slice(0, 4);

  return (
    <section className="dashboard-grid" aria-label="Launch overview">
      <article className="overview-card">
        <div className="panel-heading">
          <BarChart3 size={18} />
          <span>Pipeline Phases</span>
        </div>
        <div className="phase-list">
          {phases.map((phase) => (
            <span key={phase}>{phase}</span>
          ))}
        </div>
      </article>

      <article className="overview-card">
        <div className="panel-heading">
          <ListChecks size={18} />
          <span>Upcoming Gates</span>
        </div>
        <div className="compact-list">
          {nextMilestones.map((item) => (
            <div key={item.milestone}>
              <strong>Day {item.targetDay}</strong>
              <span>{item.milestone}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="overview-card">
        <div className="panel-heading">
          <Workflow size={18} />
          <span>Core Automations</span>
        </div>
        <div className="compact-list">
          {criticalWorkflows.map((item) => (
            <div key={item["#"]}>
              <strong>{item.Workflow}</strong>
              <span>Build day {item["Build By Day"]} / Test day {item["Test By Day"]}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="overview-card">
        <div className="panel-heading">
          <CircleAlert size={18} />
          <span>Asset Blockers</span>
        </div>
        {blockedAssets.length === 0 ? (
          <p className="quiet-copy">No blocked assets right now.</p>
        ) : (
          <div className="compact-list">
            {blockedAssets.map((item) => (
              <div key={item.Asset}>
                <strong>{item.Owner}</strong>
                <span>{item.Asset}</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function IntelligencePage({
  dailyRegistrations,
  kpis,
  messaging,
  operatingRules,
}: {
  dailyRegistrations: DailyRegistrations;
  kpis: KpiItem[];
  messaging: MessagingGuide;
  operatingRules: OperatingRule[];
}) {
  const groupedKpis = groupBy(kpis, (item) => item.section);
  const metricGroups = groupBy(dailyRegistrations.metrics, (item) => item.section);

  return (
    <section className="intelligence-page">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Workbook intelligence</p>
          <h2>KPIs, messaging, and daily launch tracking</h2>
          <p>Imported from the updated webinar workbook so execution, performance targets, and positioning stay together.</p>
        </div>
        <div className="workspace-stats">
          <strong>{kpis.length}</strong>
          <span>KPI targets</span>
          <span>{dailyRegistrations.metrics.length} daily metrics</span>
        </div>
      </div>

      <section className="promise-band">
        <div className="panel-heading">
          <MessageSquareText size={18} />
          <span>{messaging.promiseTitle}</span>
        </div>
        <h3>{messaging.promise.replace(/^"|"$/g, "")}</h3>
        <p>{messaging.promiseNotes}</p>
      </section>

      <section className="dashboard-grid intelligence-grid">
        <article className="overview-card wide-card">
          <div className="panel-heading">
            <Gauge size={18} />
            <span>KPI Targets</span>
          </div>
          <div className="kpi-table">
            {Object.entries(groupedKpis).map(([section, rows]) => (
              <div className="kpi-section" key={section}>
                <h3>{section}</h3>
                {rows.map((item) => (
                  <div className="kpi-row" key={`${section}-${item.metric}`}>
                    <div>
                      <strong>{item.metric}</strong>
                      <span>{item.notes}</span>
                    </div>
                    <b>{item.target}</b>
                    <small>{item.owner}</small>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>

        <article className="overview-card">
          <div className="panel-heading">
            <ListChecks size={18} />
            <span>Operating Rules</span>
          </div>
          <div className="compact-list">
            {operatingRules.map((item) => (
              <div key={item.number}>
                <strong>Rule {item.number}</strong>
                <span>{item.rule}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="messaging-grid">
        {messaging.sections.map((section) => (
          <article className="overview-card" key={section.title}>
            <div className="panel-heading">
              <MessageSquareText size={18} />
              <span>{section.title}</span>
            </div>
            <div className="compact-list">
              {section.items.map((item) => (
                <div key={`${section.title}-${item.element}`}>
                  <strong>{item.element}</strong>
                  <span>{item.guidance}</span>
                  <small>{item.placement} / {item.owner}</small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="overview-card wide-card">
        <div className="panel-heading">
          <BarChart3 size={18} />
          <span>{dailyRegistrations.title}</span>
        </div>
        <p className="quiet-copy">{dailyRegistrations.subtitle}</p>
        <div className="daily-metric-grid">
          {Object.entries(metricGroups).map(([section, rows]) => (
            <div className="daily-metric-section" key={section}>
              <h3>{section}</h3>
              {rows.map((item) => (
                <div className="daily-metric-row" key={`${section}-${item.metric}`}>
                  <span>{item.metric}</span>
                  <strong>{item.target ?? "Track daily"}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function WorkspaceHeading({
  activeStats,
  activeTabMeta,
}: {
  activeStats: { total: number; done: number; visible: number; progress: number };
  activeTabMeta: TabMeta;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <p className="eyebrow">{activeTabMeta.eyebrow}</p>
        <h2>{activeTabMeta.label}</h2>
        <p>{activeTabMeta.description}</p>
      </div>
      <div className="workspace-stats" aria-label={`${activeTabMeta.label} progress`}>
        <strong>{activeStats.progress}%</strong>
        <span>{activeStats.done} of {activeStats.total} complete</span>
        <span>{activeStats.visible} visible {activeTabMeta.unit}</span>
      </div>
    </div>
  );
}

function Filters({
  activeTab,
  filtersActive,
  ownerFilter,
  owners,
  phaseFilter,
  phases,
  query,
  resetFilters,
  setOwnerFilter,
  setPhaseFilter,
  setQuery,
  setStatusFilter,
  statusFilter,
}: {
  activeTab: Tab;
  filtersActive: boolean;
  ownerFilter: string[];
  owners: string[];
  phaseFilter: string;
  phases: string[];
  query: string;
  resetFilters: () => void;
  setOwnerFilter: Dispatch<SetStateAction<string[]>>;
  setPhaseFilter: (phase: string) => void;
  setQuery: (query: string) => void;
  setStatusFilter: (status: Status | "All") => void;
  statusFilter: Status | "All";
}) {
  return (
    <div className="filters">
      <label className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the launch CRM" />
      </label>
      <label className="field-control">
        <Filter size={16} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | "All")}>
          <option>All</option>
          {statusOptions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <div className="owner-filter" aria-label="Assignee filter">
        <Users size={16} />
        <div className="owner-filter-options">
          {owners.map((owner) => {
            const selected = ownerFilter.includes(owner);
            return (
              <button
                aria-pressed={selected}
                className={selected ? "owner-chip selected" : "owner-chip"}
                key={owner}
                type="button"
                onClick={() =>
                  setOwnerFilter((current) =>
                    current.includes(owner) ? current.filter((person) => person !== owner) : [...current, owner],
                  )
                }
              >
                {owner}
              </button>
            );
          })}
        </div>
      </div>
      {activeTab === "plan" && (
        <label className="field-control">
          <BarChart3 size={16} />
          <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
            <option>All</option>
            {phases.map((phase) => (
              <option key={phase}>{phase}</option>
            ))}
          </select>
        </label>
      )}
      {filtersActive && (
        <button className="clear-filters" type="button" onClick={resetFilters}>
          Reset view
        </button>
      )}
    </div>
  );
}

function SettingsPage({
  launchInputs,
  registrationGoal,
  resetWorkspace,
  session,
  webinarDate,
}: {
  launchInputs: Array<{ label: string; value: string | number; notes: string; owner: string }>;
  registrationGoal: number;
  resetWorkspace: () => void;
  session: SessionProfile | null;
  webinarDate: string;
}) {
  const [profile, setProfile] = useState({
    email: session?.email ?? "",
    name: session?.name ?? "",
    workspaceName: session?.workspaceName ?? "",
  });
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    invite: false,
    next: false,
  });
  const [invite, setInvite] = useState({
    email: "",
    name: "",
    role: "member" as "admin" | "member" | "viewer",
    temporaryPassword: "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      const [accountResponse, teamResponse] = await Promise.all([fetch("/api/account"), fetch("/api/team")]);
      if (accountResponse.ok) {
        const body = (await accountResponse.json()) as {
          profile?: { email: string; name: string; workspaceName: string | null };
        };
        if (active && body.profile) {
          setProfile({
            email: body.profile.email,
            name: body.profile.name,
            workspaceName: body.profile.workspaceName ?? "Finding Winners Launch CRM",
          });
        }
      }
      if (teamResponse.ok) {
        const body = (await teamResponse.json()) as { members?: TeamMember[] };
        if (active) setTeam(body.members ?? []);
      }
    }
    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsMessage("");
    const response = await fetch("/api/account", {
      body: JSON.stringify({ name: profile.name, workspaceName: profile.workspaceName }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    const body = (await response.json().catch(() => null)) as { message?: string; profile?: typeof profile } | null;
    if (!response.ok) {
      setSettingsError(body?.message ?? "Unable to save profile.");
      return;
    }
    if (body?.profile) {
      setProfile({
        email: body.profile.email,
        name: body.profile.name,
        workspaceName: body.profile.workspaceName ?? "Finding Winners Launch CRM",
      });
    }
    setSettingsMessage("Profile saved.");
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsMessage("");
    const response = await fetch("/api/auth/change-password", {
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setSettingsError(body?.message ?? "Unable to update password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setSettingsMessage("Password updated.");
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError("");
    setSettingsMessage("");
    const response = await fetch("/api/team", {
      body: JSON.stringify(invite),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = (await response.json().catch(() => null)) as { members?: TeamMember[]; message?: string } | null;
    if (!response.ok) {
      setSettingsError(body?.message ?? "Unable to add team member.");
      return;
    }
    setTeam(body?.members ?? []);
    setInvite({ email: "", name: "", role: "member", temporaryPassword: "" });
    setSettingsMessage("Team member added.");
  }

  return (
    <section className="settings-grid">
      <article className="overview-card">
        <p className="eyebrow">Account</p>
        <h2>Profile settings</h2>
        <p className="quiet-copy">Your profile and workspace name are stored in Convex.</p>
        <form className="account-form" onSubmit={saveProfile}>
          <label>
            <span>Display name</span>
            <input
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              placeholder="Abby Lehr"
              type="text"
              value={profile.name}
            />
          </label>
          <label>
            <span>Email</span>
            <input disabled placeholder="abby@intersectioncapital.com" type="email" value={profile.email} />
          </label>
          <label>
            <span>Workspace</span>
            <input
              onChange={(event) => setProfile((current) => ({ ...current, workspaceName: event.target.value }))}
              placeholder="Finding Winners Launch CRM"
              type="text"
              value={profile.workspaceName}
            />
          </label>
          <button className="clear-filters settings-action" type="submit">
            Save profile
          </button>
        </form>
      </article>
      <article className="overview-card">
        <p className="eyebrow">Security</p>
        <h2>Password</h2>
        <p className="quiet-copy">Update your password using the current signed-in account.</p>
        <form className="account-form" onSubmit={savePassword}>
          <label>
            <span>Current password</span>
            <div className="password-field">
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                type={visiblePasswords.current ? "text" : "password"}
                value={currentPassword}
              />
              <button
                aria-label={visiblePasswords.current ? "Hide current password" : "Show current password"}
                className="password-toggle"
                onClick={() => setVisiblePasswords((current) => ({ ...current, current: !current.current }))}
                type="button"
              >
                {visiblePasswords.current ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <label>
            <span>New password</span>
            <div className="password-field">
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                type={visiblePasswords.next ? "text" : "password"}
                value={newPassword}
              />
              <button
                aria-label={visiblePasswords.next ? "Hide new password" : "Show new password"}
                className="password-toggle"
                onClick={() => setVisiblePasswords((current) => ({ ...current, next: !current.next }))}
                type="button"
              >
                {visiblePasswords.next ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <button className="clear-filters settings-action" type="submit">
            Update password
          </button>
        </form>
        {settingsError && <p className="auth-error settings-message">{settingsError}</p>}
        {settingsMessage && <p className="auth-success settings-message">{settingsMessage}</p>}
      </article>
      <article className="overview-card">
        <p className="eyebrow">Team</p>
        <h2>User management</h2>
        <p className="quiet-copy">Add teammates to this workspace with a temporary password.</p>
        <form className="account-form" onSubmit={inviteMember}>
          <label>
            <span>Name</span>
            <input
              onChange={(event) => setInvite((current) => ({ ...current, name: event.target.value }))}
              placeholder="Team member"
              type="text"
              value={invite.name}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))}
              placeholder="teammate@company.com"
              required
              type="email"
              value={invite.email}
            />
          </label>
          <label>
            <span>Role</span>
            <select
              value={invite.role}
              onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value as "admin" | "member" | "viewer" }))}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label>
            <span>Temporary password</span>
            <div className="password-field">
              <input
                onChange={(event) => setInvite((current) => ({ ...current, temporaryPassword: event.target.value }))}
                placeholder="At least 8 characters"
                required
                type={visiblePasswords.invite ? "text" : "password"}
                value={invite.temporaryPassword}
              />
              <button
                aria-label={visiblePasswords.invite ? "Hide temporary password" : "Show temporary password"}
                className="password-toggle"
                onClick={() => setVisiblePasswords((current) => ({ ...current, invite: !current.invite }))}
                type="button"
              >
                {visiblePasswords.invite ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <button className="clear-filters settings-action" type="submit">
            Add team member
          </button>
        </form>
      </article>
      <article className="overview-card">
        <p className="eyebrow">Workspace users</p>
        <h2>Team roster</h2>
        <div className="settings-list">
          {team.map((member) => (
            <div key={member.id}>
              <strong>{member.name}</strong>
              <span>{member.email}</span>
              <small>{member.role}</small>
            </div>
          ))}
          {team.length === 0 && (
            <div>
              <strong>No team members loaded</strong>
              <span>Sign in and refresh settings to load the roster.</span>
            </div>
          )}
        </div>
      </article>
      <article className="overview-card">
        <p className="eyebrow">Workspace</p>
        <h2>Launch configuration</h2>
        <p className="quiet-copy">Core launch inputs imported from the original workbook. Dashboard progress now syncs to Convex by workspace.</p>
        <div className="settings-list">
          {launchInputs.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{String(item.value).replace("T00:00:00", "")}</strong>
              <small>{item.owner}</small>
            </div>
          ))}
        </div>
      </article>
      <article className="overview-card">
        <p className="eyebrow">Controls</p>
        <h2>Data management</h2>
        <p className="quiet-copy">Registration goal: {registrationGoal.toLocaleString()}. Webinar date: {webinarDate ? formatDate(webinarDate.slice(0, 10)) : "TBD"}.</p>
        <button className="clear-filters settings-action" type="button" onClick={resetWorkspace}>
          Reset workspace dashboard
        </button>
      </article>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  detail: string;
  progress: number;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <Icon size={18} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
      <div className="progress-track" aria-hidden="true">
        <div style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const Icon = status === "Blocked" ? CircleAlert : status === "Done" ? CheckCircle2 : Activity;
  return (
    <span className={`status-badge ${statusClass(status)}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (status: Status) => void }) {
  return (
    <select className={`status-select ${statusClass(value)}`} value={value} onChange={(event) => onChange(event.target.value as Status)}>
      {statusOptions.map((status) => (
        <option key={status}>{status}</option>
      ))}
    </select>
  );
}

function PlanWeekList({ rows, onStatusChange }: { rows: PlanItem[]; onStatusChange: (day: number, status: Status) => void }) {
  const weeks = buildPlanWeeks(rows);

  if (weeks.length === 0) {
    return <EmptyState title="No weekly tasks found" detail="Try clearing filters or searching for another focus area." />;
  }

  return (
    <div className="week-list">
      {weeks.map((week) => (
        <article className="week-card" key={week.weekNumber}>
          <div className="week-card-header">
            <div>
              <p className="eyebrow">Week {week.weekNumber}</p>
              <h3>{week.daysLabel}</h3>
              <p>{week.dateLabel}</p>
            </div>
            <div className="week-progress">
              <strong>{week.progress}%</strong>
              <span>
                {week.done}/{week.total} done
              </span>
            </div>
          </div>
          <div className="week-meta">
            <span>{week.phases.join(" + ")}</span>
            {week.blocked > 0 && <span className="blocked-note">{week.blocked} blocked</span>}
          </div>
          <div className="progress-track" aria-hidden="true">
            <div style={{ width: `${week.progress}%` }} />
          </div>
          <div className="week-days">
            {week.rows.map((item) => (
              <div className="week-day-row" key={item.Day}>
                <div className="day-pill">Day {item.Day}</div>
                <div className="week-day-copy">
                  <div>
                    <strong>{item["Primary Focus"]}</strong>
                    <span>{formatDate(item.Date)} / {item.Owner}</span>
                  </div>
                  <p>{item["Action Steps"]}</p>
                  <small>{item.Deliverable}</small>
                  {item.Notes && <small className="note">{item.Notes}</small>}
                </div>
                <StatusSelect value={item.Status} onChange={(status) => onStatusChange(item.Day, status)} />
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function AssetGrid({
  rows,
  onAssetFieldChange,
  onStatusChange,
}: {
  rows: AssetItem[];
  onAssetFieldChange: (asset: string, field: "Content Needed" | "Upload Link" | "Content Draft", value: string) => void;
  onStatusChange: (asset: string, status: Status) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No assets found" detail="Try clearing filters or searching for another asset category." />;
  }

  return (
    <div className="card-grid">
      {rows.map((item) => (
        <article className="item-card asset-card" key={item.Asset}>
          <div className="item-card-top">
            <span>{item.Category}</span>
            <StatusSelect value={item.Status} onChange={(status) => onStatusChange(item.Asset, status)} />
          </div>
          <h3>{item.Asset}</h3>
          <p>{item.Notes}</p>
          <div className="asset-content-fields">
            <label>
              <span>Content needed</span>
              <textarea
                aria-label={`Content needed for ${item.Asset}`}
                onChange={(event) => onAssetFieldChange(item.Asset, "Content Needed", event.target.value)}
                placeholder="Brief, copy, creative requirements, approval checklist..."
                value={item["Content Needed"] ?? ""}
              />
            </label>
            <label>
              <span>Upload / file link</span>
              <input
                aria-label={`Upload or file link for ${item.Asset}`}
                onChange={(event) => onAssetFieldChange(item.Asset, "Upload Link", event.target.value)}
                placeholder="Drive, Canva, Figma, Vercel, GHL, BigMarker, or asset URL"
                type="url"
                value={item["Upload Link"] ?? ""}
              />
            </label>
            <label>
              <span>Draft / final content</span>
              <textarea
                aria-label={`Draft or final content for ${item.Asset}`}
                onChange={(event) => onAssetFieldChange(item.Asset, "Content Draft", event.target.value)}
                placeholder="Paste the working copy, final caption, email, page copy, notes, or approval details here."
                value={item["Content Draft"] ?? ""}
              />
            </label>
          </div>
          <div className="meta-row">
            <span>{item.Owner}</span>
            {item["Upload Link"] && (
              <a href={item["Upload Link"]} rel="noreferrer" target="_blank">
                Open upload
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkflowGrid({ rows, onStatusChange }: { rows: WorkflowItem[]; onStatusChange: (id: number, status: Status) => void }) {
  if (rows.length === 0) {
    return <EmptyState title="No workflows found" detail="Try clearing filters or searching for another automation." />;
  }

  return (
    <div className="card-grid workflows">
      {rows.map((item) => (
        <article className="item-card" key={item["#"]}>
          <div className="item-card-top">
            <span>Build day {item["Build By Day"]} / Test day {item["Test By Day"]}</span>
            <StatusSelect value={item.Status} onChange={(status) => onStatusChange(item["#"], status)} />
          </div>
          <h3>{item.Workflow}</h3>
          <p>{item["Primary Actions"]}</p>
          <dl>
            <dt>Trigger</dt>
            <dd>{item.Trigger}</dd>
            <dt>Success</dt>
            <dd>{item["Success Check"]}</dd>
          </dl>
          <div className="meta-row">
            <span>{item.Owner}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function MilestoneRail({ rows, onStatusChange }: { rows: Milestone[]; onStatusChange: (name: string, status: Status) => void }) {
  if (rows.length === 0) {
    return <EmptyState title="No milestones found" detail="Try clearing filters or searching for another launch target." />;
  }

  return (
    <div className="milestone-rail">
      {rows.map((item) => (
        <article className="milestone" key={item.milestone}>
          <div className="day-pill">Day {item.targetDay}</div>
          <div>
            <h3>{item.milestone}</h3>
            <p>{item.notes}</p>
            <div className="meta-row">
              <span>{item.owner}</span>
              <StatusSelect value={item.status} onChange={(status) => onStatusChange(item.milestone, status)} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <Search size={24} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
