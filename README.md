# Warren Dashboard

Tony's Chief of Staff personal operating system — a persistent, AI-assisted hub for task management, decision queues, and daily standups with Warren.

## What It Is

A static HTML/JS site deployed on Vercel with Supabase persistence. Warren (the AI Chief of Staff) uses this dashboard to track Tony's active work, surface stale items, and deliver a daily standup briefing to Tony's Slack DM.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Static HTML + vanilla JavaScript + CSS |
| Persistence | Supabase (`mmwbiogqmgmtxboipyko.supabase.co`) |
| Hosting | Vercel (auto-deploy on push to `main`) |
| Auth | Vercel Edge Middleware (Basic Auth) |
| Automation | OpenClaw cron jobs on DGX Spark |

## Pages

- `hub-tony.html` — Main hub (Tony's view)
- `hub-dukane.html` — Dukane family view
- `kanban-todo.html` — Kanban board for tasks (primary task surface)
- `todos.html` — List view for tasks
- `standup.html` — Daily standup display
- `kanban-family.html`, `kanban-health.html`, `kanban-marketing.html`, `kanban-meals.html`, `kanban-workout.html` — Board views by domain
- Additional pages: `finance.html`, `health.html`, `meals.html`, `notes.html`, `knowledge.html`, `stream.html`, and others

## Access

Protected by Basic Auth. Users: Tony (full access), Dukane, Joana, Victor (restricted).

## Deployment

Vercel auto-deploys on push to `main`. No build step required — plain file edits go live immediately after merge.

> **Note:** Vercel project rename requires human action by Tony/Charlie via the Vercel dashboard (`needs-human`).

## Database Schema

See `supabase-schema.sql` for the full schema. Key tables:
- `kanban_items` — canonical task store (board, column, position, data)
- `todos` — legacy task store (deprecated for task storage)
- `stream_items` — incoming stream of items
- `standups` — daily standup records
- `notes` — notes and observations
- `meal_checklist` — weekly meal tracking

## Docs

- `docs/architecture.md` — System architecture and ADRs
- `docs/product-backlog.md` — Product backlog
- `docs/sprint-backlog.md` — Sprint backlog
