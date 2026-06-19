"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Filter,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Search,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import seedData from "@/data/launch-data.json";

type Status = "Not Started" | "In Progress" | "Done" | "Blocked";
type Tab = "plan" | "assets" | "workflows" | "milestones";

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

type AppState = {
  plan: PlanItem[];
  assets: AssetItem[];
  workflows: WorkflowItem[];
  milestones: Milestone[];
  registrations: number;
};

const typedSeed = seedData as {
  plan: PlanItem[];
  assets: AssetItem[];
  workflows: WorkflowItem[];
  milestones: Milestone[];
  launchInputs: Array<{ label: string; value: string | number; notes: string; owner: string }>;
};

const statusOptions: Status[] = ["Not Started", "In Progress", "Done", "Blocked"];
const storageKey = "finding-winners-launch-os";
const seedState: AppState = {
  plan: typedSeed.plan,
  assets: typedSeed.assets,
  workflows: typedSeed.workflows,
  milestones: typedSeed.milestones,
  registrations: 0,
};

const tabConfig: Array<{ id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "plan", label: "Daily Plan", icon: CalendarDays },
  { id: "assets", label: "Assets", icon: ClipboardCheck },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "milestones", label: "Milestones", icon: ListChecks },
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

export default function LaunchCommandCenter() {
  const [appState, setAppState] = useState<AppState>(() => {
    if (typeof window === "undefined") {
      return seedState;
    }

    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as AppState) : seedState;
  });
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState("All");

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(appState));
  }, [appState]);

  const registrationGoal = Number(typedSeed.launchInputs.find((item) => item.label === "Registration Goal")?.value ?? 500);
  const webinarDate = String(typedSeed.launchInputs.find((item) => item.label === "Target Webinar Date")?.value ?? "");

  const metrics = useMemo(() => {
    const planDone = appState.plan.filter((item) => item.Status === "Done").length;
    const assetsDone = appState.assets.filter((item) => item.Status === "Done").length;
    const workflowsDone = appState.workflows.filter((item) => item.Status === "Done").length;
    const blockers =
      appState.plan.filter((item) => item.Status === "Blocked").length +
      appState.assets.filter((item) => item.Status === "Blocked").length +
      appState.workflows.filter((item) => item.Status === "Blocked").length;
    const overallDone = planDone + assetsDone + workflowsDone;
    const overallTotal = appState.plan.length + appState.assets.length + appState.workflows.length;

    return {
      planDone,
      assetsDone,
      workflowsDone,
      blockers,
      overallDone,
      overallTotal,
      overallPct: pct(overallDone, overallTotal),
      planPct: pct(planDone, appState.plan.length),
      assetsPct: pct(assetsDone, appState.assets.length),
      workflowsPct: pct(workflowsDone, appState.workflows.length),
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
        ...appState.plan.map((item) => item.Owner),
        ...appState.assets.map((item) => item.Owner),
        ...appState.workflows.map((item) => item.Owner),
      ]),
    [appState],
  );
  const phases = useMemo(() => unique(appState.plan.map((item) => item.Phase)), [appState.plan]);

  const filteredPlan = appState.plan.filter((item) => {
    const haystack = `${item.Day} ${item.Phase} ${item.Owner} ${item["Primary Focus"]} ${item["Action Steps"]} ${item.Deliverable}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.Status === statusFilter) &&
      (ownerFilter === "All" || item.Owner === ownerFilter) &&
      (phaseFilter === "All" || item.Phase === phaseFilter)
    );
  });

  const filteredAssets = appState.assets.filter((item) => {
    const haystack = `${item.Category} ${item.Asset} ${item.Owner} ${item.Notes ?? ""}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.Status === statusFilter) &&
      (ownerFilter === "All" || item.Owner === ownerFilter)
    );
  });

  const filteredWorkflows = appState.workflows.filter((item) => {
    const haystack = `${item.Workflow} ${item.Trigger} ${item["Primary Actions"]} ${item.Owner} ${item["Success Check"]}`.toLowerCase();
    return (
      haystack.includes(query.toLowerCase()) &&
      (statusFilter === "All" || item.Status === statusFilter) &&
      (ownerFilter === "All" || item.Owner === ownerFilter)
    );
  });

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
    setOwnerFilter("All");
    setPhaseFilter("All");
  }

  return (
    <main>
      <section className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Rocket size={22} />
          </div>
          <div>
            <p>Finding Winners</p>
            <h1>Launch OS</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={resetWorkspace} aria-label="Reset workspace">
            <Settings2 size={18} />
          </button>
        </div>
      </section>

      <section className="summary-band">
        <div className="summary-copy">
          <p className="eyebrow">60-day webinar command center</p>
          <h2>Turn the launch plan into a live operating room.</h2>
          <p>
            Track daily execution, asset readiness, workflow buildout, blockers, and registration progress from the
            workbook in one Vercel-ready SaaS interface.
          </p>
        </div>
        <div className="today-panel">
          <div className="panel-heading">
            <Activity size={18} />
            <span>Current Priority</span>
          </div>
          <h3>Day {todayItem.Day}: {todayItem["Primary Focus"]}</h3>
          <p>{todayItem["Action Steps"]}</p>
          <div className="meta-row">
            <span>{formatDate(todayItem.Date)}</span>
            <span>{todayItem.Owner}</span>
            <StatusBadge status={todayItem.Status} />
          </div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Launch metrics">
        <MetricCard icon={LayoutDashboard} label="Launch Health" value={`${metrics.overallPct}%`} detail={`${metrics.overallDone} of ${metrics.overallTotal} tracked items done`} progress={metrics.overallPct} />
        <MetricCard icon={CalendarDays} label="Daily Plan" value={`${metrics.planPct}%`} detail={`${metrics.planDone} of ${appState.plan.length} priorities complete`} progress={metrics.planPct} />
        <MetricCard icon={ClipboardCheck} label="Assets Ready" value={`${metrics.assetsPct}%`} detail={`${metrics.assetsDone} of ${appState.assets.length} assets done`} progress={metrics.assetsPct} />
        <MetricCard icon={Workflow} label="GHL Workflows" value={`${metrics.workflowsPct}%`} detail={`${metrics.workflowsDone} of ${appState.workflows.length} workflows done`} progress={metrics.workflowsPct} />
      </section>

      <section className="registration-band">
        <div>
          <div className="panel-heading">
            <Users size={18} />
            <span>Registration Goal</span>
          </div>
          <h3>{appState.registrations.toLocaleString()} / {registrationGoal.toLocaleString()}</h3>
          <p>Target webinar date: {webinarDate ? formatDate(webinarDate.slice(0, 10)) : "TBD"}. Blockers open: {metrics.blockers}.</p>
        </div>
        <div className="registration-controls">
          <input
            aria-label="Current registrations"
            min="0"
            max={registrationGoal}
            type="range"
            value={Math.min(appState.registrations, registrationGoal)}
            onChange={(event) => setAppState((current) => ({ ...current, registrations: Number(event.target.value) }))}
          />
          <input
            aria-label="Registration count"
            min="0"
            type="number"
            value={appState.registrations}
            onChange={(event) => setAppState((current) => ({ ...current, registrations: Number(event.target.value) }))}
          />
        </div>
      </section>

      <section className="workspace">
        <div className="tabs" role="tablist" aria-label="Launch views">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "tab active" : "tab"}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plan, assets, workflows" />
          </label>
          <label>
            <Filter size={16} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | "All")}>
              <option>All</option>
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            <Users size={16} />
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option>All</option>
              {owners.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
          </label>
          {activeTab === "plan" && (
            <label>
              <BarChart3 size={16} />
              <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
                <option>All</option>
                {phases.map((phase) => (
                  <option key={phase}>{phase}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {activeTab === "plan" && <PlanTable rows={filteredPlan} onStatusChange={updatePlanStatus} />}
        {activeTab === "assets" && <AssetGrid rows={filteredAssets} onStatusChange={updateAssetStatus} />}
        {activeTab === "workflows" && <WorkflowGrid rows={filteredWorkflows} onStatusChange={updateWorkflowStatus} />}
        {activeTab === "milestones" && <MilestoneRail rows={appState.milestones} onStatusChange={updateMilestoneStatus} />}
      </section>
    </main>
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

function PlanTable({ rows, onStatusChange }: { rows: PlanItem[]; onStatusChange: (day: number, status: Status) => void }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th>Phase</th>
            <th>Focus</th>
            <th>Owner</th>
            <th>Deliverable</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.Day}>
              <td className="day-cell">{item.Day}</td>
              <td>{formatDate(item.Date)}</td>
              <td>{item.Phase}</td>
              <td>
                <strong>{item["Primary Focus"]}</strong>
                <p>{item["Action Steps"]}</p>
                {item.Notes && <small>{item.Notes}</small>}
              </td>
              <td>{item.Owner}</td>
              <td>{item.Deliverable}</td>
              <td>
                <StatusSelect value={item.Status} onChange={(status) => onStatusChange(item.Day, status)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssetGrid({ rows, onStatusChange }: { rows: AssetItem[]; onStatusChange: (asset: string, status: Status) => void }) {
  return (
    <div className="card-grid">
      {rows.map((item) => (
        <article className="item-card" key={item.Asset}>
          <div className="item-card-top">
            <span>{item.Category}</span>
            <StatusSelect value={item.Status} onChange={(status) => onStatusChange(item.Asset, status)} />
          </div>
          <h3>{item.Asset}</h3>
          <p>{item.Notes}</p>
          <div className="meta-row">
            <span>{item.Owner}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkflowGrid({ rows, onStatusChange }: { rows: WorkflowItem[]; onStatusChange: (id: number, status: Status) => void }) {
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
