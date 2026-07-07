# Finding Winners Launch OS

Interactive Next.js SaaS dashboard generated from the Finding Winners 60-day launch workbook.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy To Vercel

This repo is Vercel-ready. Push it to GitHub, import the repository in Vercel, and use the default Next.js settings. The included `vercel.json` pins the standard install, build, and dev commands.

## Product Surface

- Dashboard metrics for launch health, daily plan progress, assets, workflows, blockers, and registration goal.
- Editable statuses for plan items, assets, workflows, and milestones.
- Search, owner, status, and phase filters.
- Intelligence page for KPI targets, positioning/messaging guidance, operating rules, and daily launch tracking metrics.
- Browser-local persistence for working-session updates.
- Structured seed data extracted from the source workbook in `data/launch-data.json`.

## Convex

Convex is installed and linked. Use:

```bash
npm run convex:dev
```

The current app still uses browser-local state for dashboard edits. Convex starter functions live in `convex/progress.ts` and are ready for the next persistence wiring pass.

## Codex Notes

This repo includes `AGENTS.md`, Convex AI guidelines, and Convex agent skills so Codex-style agents have project context. Before changing Convex code, read `convex/_generated/ai/guidelines.md`.
