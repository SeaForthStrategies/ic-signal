# Finding Winners Launch OS

Interactive Next.js SaaS dashboard generated from the Finding Winners launch workbook.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy To Vercel

This repo is Vercel-ready. Push it to GitHub, import the repository in Vercel, and use the default Next.js settings. The included `vercel.json` pins the standard install, build, and dev commands.

Add the environment variables from `.env.example` in Vercel. Do not commit real secrets.

## Product Surface

- Dashboard metrics for launch health, daily plan progress, assets, workflows, blockers, and registration goal.
- Editable statuses for plan items, assets, workflows, and milestones.
- Search, owner, status, and phase filters.
- Intelligence page for KPI targets, positioning/messaging guidance, operating rules, and daily launch tracking metrics.
- Convex-backed workspace persistence for dashboard edits, asset upload links, and content drafts.
- Account creation, login, password reset, account settings, and team management.
- Structured seed data extracted from the source workbook in `data/launch-data.json`.

## Convex

Convex is installed, linked, and configured for the dev deployment:

- Project URL: `https://shocking-swordfish-439.convex.cloud`
- Deployment name: `shocking-swordfish-439`
- Local deployment: `dev:shocking-swordfish-439`

Use:

```bash
npm run convex:dev
```

Dashboard progress is saved by workspace in Convex through `convex/progress.ts`. Users, workspaces, team members, and password reset tokens are stored through `convex/auth.ts`.

Convex JWT Auth is configured in `convex/auth.config.ts`. The app issues short-lived JWTs from `/api/auth/token`, and the React client uses `ConvexProviderWithAuth` so browser-side Convex calls can use `ctx.auth.getUserIdentity()`.

For production, set these Convex env vars on the target deployment:

```bash
AUTH_API_SECRET=
AUTH_JWKS=
AUTH_JWT_AUDIENCE=convex
AUTH_JWT_ISSUER=
```

For CI/deploys, set `CONVEX_DEPLOY_KEY` in the hosting provider or CI secret store.

## Auth

The app uses email/password login with signed HTTP-only cookies plus Convex JWT Auth. Local credentials and signing keys live only in `.env.local`:

```bash
AUTH_EMAIL=
AUTH_PASSWORD_HASH=
AUTH_SECRET=
AUTH_API_SECRET=
AUTH_JWT_PRIVATE_KEY=
AUTH_JWKS=
```

Do not commit `.env.local`. The checked-in auth routes are in `app/api/auth/`, route protection is handled by `proxy.ts`, and Convex JWT identity is exposed through `ctx.auth.getUserIdentity()`.

## Codex Notes

This repo includes `AGENTS.md`, Convex AI guidelines, and Convex agent skills so Codex-style agents have project context. Before changing Convex code, read `convex/_generated/ai/guidelines.md`.
