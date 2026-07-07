<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Codex Project Guide

## App Context

This repo is the Finding Winners Launch OS: a Next.js SaaS-style CRM for the 60-day webinar launch plan. The main UI is a dense operating dashboard, not a landing page.

Core product areas:

- `/dashboard` command center and launch metrics
- `/plan` 60-day daily execution plan
- `/assets` launch asset checklist
- `/workflows` GHL automation build map
- `/milestones` launch gates
- `/intelligence` KPI targets, messaging guide, operating rules, and daily tracking metrics
- `/settings` account/workspace placeholder controls

## Important Files

- `components/LaunchCommandCenter.tsx` is the main app shell and all CRM views.
- `components/AuthFrontPage.tsx` is the login/sign-up front page placeholder.
- `data/launch-data.json` is the structured source of truth imported from the workbook.
- `convex/progress.ts` and `convex/schema.ts` are the starter Convex persistence layer.
- `app/ConvexClientProvider.tsx` wraps the app with Convex when `NEXT_PUBLIC_CONVEX_URL` exists.

## Data Rules

- Preserve workbook-provided values unless the user explicitly asks to correct them.
- The current workbook import contains a known date mismatch: dashboard `Target Webinar Date` is `2026-07-29`, while Day 60 in the daily plan is `2026-08-16`. Do not silently “fix” this.
- Keep status values compatible with the UI union: `Not Started`, `In Progress`, `Done`, `Blocked`, `Deferred`.
- When replacing workbook data, update `data/launch-data.json` first, then adjust UI/types only if the schema changes.
- Browser-local persistence is versioned by `storageKey` in `LaunchCommandCenter`; bump it when seed data changes materially so old local state does not override imports.

## Commands

Use these checks before handing off changes:

```bash
npm run lint
npm run build
```

Run locally:

```bash
npm run dev
```

Convex:

```bash
npm run convex:dev
npm run convex:dev:once
```

## Implementation Notes

- Keep the UI professional, clean, blue-accented, and CRM-like.
- Do not turn the product into a marketing landing page.
- Avoid unrelated refactors. This app is intentionally centralized around `LaunchCommandCenter.tsx` until the backend/state model is more mature.
- Frontend auth screens are placeholders; do not reintroduce Prisma or NextAuth unless the user explicitly asks.
- For Convex work, read `convex/_generated/ai/guidelines.md` before editing backend functions.
