# Architecture — Warren Dashboard Overhaul

> **Issue:** [#4 — Overhaul Warren Dashboard — Chief of Staff Personal OS](https://github.com/t-and-c/warren-dashboard/issues/4)
> **Date:** 2026-03-30
> **Author:** Warren (Architecture Planning Agent)

---

## Overview

Overhaul the Warren Dashboard (formerly "Greg Dashboard") into Tony's Chief of Staff personal operating system. The dashboard is the persistent backend for Tony's task management, decision queue, and daily standup with Warren.

## Project State: Existing Codebase

This is **not** a greenfield project. The repository contains an established static HTML/JS site with:

- **33 HTML pages** (~22,472 lines total) — hub, kanban boards, todo list, standup, meals, health, finance, knowledge, marketing, and specialized views
- **Vercel deployment** at `greg-dashboard.vercel.app` (static hosting + Edge Middleware for auth)
- **Supabase persistence** at `mmwbiogqmgmtxboipyko.supabase.co` with two task-related tables (`todos`, `kanban_items`)
- **Basic auth** via `middleware.js` (Vercel Edge Middleware) with per-user access control
- **JSON data files** in `data/` (legacy fallback data)
- **No build step, no framework, no CI/CD pipeline**

### Reference Architecture Alignment

The T&C [Reference Architecture](https://github.com/t-and-c/ops/blob/main/docs/reference-architectures.md) specifies Next.js + Supabase + Cloudflare for "Interactive SaaS" projects. **This project is not an Interactive SaaS product** — it is a personal internal tool for a single user (Tony) with a small set of named users (Tony, Dukane, Joana, Victor). The reference architecture does not apply. The established pattern (static HTML/JS + Supabase + Vercel) is appropriate for the use case and will be preserved.

**No deviation from reference architecture required** — the reference architecture's scope ("web-based SaaS products") does not cover this project type.

---

## End-to-End Dependency Map

For each product requirement to be fulfilled end-to-end (from implementation to a real user accessing the capability):

| Dependency | Current Status | Required By | Action |
|-----------|---------------|-------------|--------|
| Vercel deployment pipeline | Exists — auto-deploys on push to `main` | R1, R2, R3, R4 | No action needed |
| Vercel project access (rename) | Exists — `vercel.json` configured, `.vercel/` directory present | R1 | Verify CLI access or use Vercel dashboard. If token unavailable, escalate as `needs-human` |
| Supabase database access | Exists — publishable key hardcoded in HTML files | R2, R4 | Schema changes require Supabase dashboard SQL Editor or CLI with DB password |
| Supabase schema migration capability | Needs verification — no migration tooling exists | R2 | Run SQL directly in Supabase dashboard or via `psql` with connection string |
| Authentication | Exists — `middleware.js` with Basic Auth | All | Already updated in PR #5 (realm: "Warren Dashboard") |
| OpenClaw cron scheduling | Exists — OpenClaw gateway on DGX Spark | R5, R6 | Create cron jobs via OpenClaw cron tool |
| Slack message delivery | Exists — OpenClaw message tool, Tony's DM ID: `D0AKEKPCRT8` | R5, R6 | No new setup needed |
| Supabase server-side query access | Needs creation — cron jobs need to query Supabase from server side | R5, R6 | Use publishable key (RLS allows public read) or obtain secret key for server queries |
| Domain/TLS | Exists — Vercel handles HTTPS | R1 | URL changes when project is renamed |
| CI/CD pipeline | Does not exist | Not in scope | Noted as future improvement, not required for this issue |
| Monitoring/error tracking | Does not exist | Not in scope | Noted as future improvement |

**Dependencies requiring creation:**
1. Supabase schema migration (SQL statements to alter `kanban_items` table)
2. OpenClaw cron jobs (2 new crons: daily standup, weekly patrol)

**Dependencies requiring decision:**
1. Vercel project rename method (CLI token vs. dashboard vs. escalate to human)

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Static HTML + vanilla JavaScript + CSS | Established pattern. No framework needed for this use case. |
| Persistence | Supabase (`mmwbiogqmgmtxboipyko.supabase.co`) | Already in use. PostgREST API accessed via `@supabase/supabase-js` CDN. |
| Hosting | Vercel (static site deployment) | Already in use. Auto-deploy on push to `main`. |
| Authentication | Vercel Edge Middleware (Basic Auth) | Already in use. Per-user access control with role-based page restrictions. |
| Drag-and-drop | SortableJS (CDN: `sortablejs@1.15.0`) | Already in use for kanban boards. |
| Cron/Automation | OpenClaw cron jobs on DGX Spark | Best fit for server-side scheduled tasks that need Slack integration. |

---

## Data Model

### Current State (Problem)

Two separate tables store task data with incompatible schemas:

**`todos` table:**
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
completed BOOLEAN DEFAULT FALSE
completed_at TIMESTAMPTZ
data JSONB  -- stores: description, category, priority, status, source, createdAt
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**`kanban_items` table:**
```sql
id UUID PRIMARY KEY
board TEXT NOT NULL        -- 'family', 'health', 'marketing', 'meals', 'todos', 'workouts'
column_id TEXT NOT NULL    -- 'backlog', 'today', 'progress', 'waiting', 'done'
item_id TEXT NOT NULL      -- Original item identifier (numeric string or "task-N")
position INTEGER DEFAULT 0
data JSONB NOT NULL        -- stores: title, description, priority, agent, category, source
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(board, item_id)
```

**Problems:** `todos.html` reads from `todos` table. `kanban-todo.html` reads from `kanban_items` table (board='todos'). Items exist in one but not the other. No sync mechanism.

### Target State (Solution)

**Single source of truth:** The `kanban_items` table becomes the canonical task store. The `todos` table is deprecated for task storage.

**Why `kanban_items` over `todos`:** The `kanban_items` table already has the richer schema (board, column, position, item_id) and is used by the kanban view which is the primary interaction surface. The `todos` table's schema is flat and would require more alteration.

**Schema changes to `kanban_items`:**

```sql
-- Add structured columns that are currently buried in the JSONB `data` field
-- This enables server-side querying (for cron jobs) without parsing JSONB
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS agent TEXT;
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure updated_at auto-updates (for stale item detection)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kanban_items_updated_at
  BEFORE UPDATE ON kanban_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index for cron queries
CREATE INDEX IF NOT EXISTS idx_kanban_items_updated_at ON kanban_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_kanban_items_priority ON kanban_items(priority);
```

**Data flow after migration:**
- `kanban-todo.html` → reads/writes `kanban_items` where `board='todos'` (no change)
- `todos.html` → reads `kanban_items` where `board='todos'` (changed from `todos` table)
- `standup.html` → reads `kanban_items` where `board='todos'` (changed from `todos` table)
- OpenClaw cron → queries `kanban_items` via Supabase API (new)
- All other kanban boards (family, health, marketing, meals, workouts) → unaffected

### Item ID Strategy

The current codebase has an `item_id` format mismatch that causes persistence failures:
- JS creates numeric IDs (e.g., `1`, `2`, `3`) but stores them as strings
- Supabase stores `item_id` as TEXT
- The `UNIQUE(board, item_id)` constraint prevents duplicates

**Resolution:** All new items will use a sequential string format: `"1"`, `"2"`, ..., `"36"` for the initial 36 items. New items created via the UI will use `"task-{timestamp}"` format (already partially implemented in the JS code). The `kanban-todo.html` JavaScript will be fixed to consistently use `String(id)` in all queries.

---

## Component Structure

```
warren-dashboard/
├── index.html                    # Redirect to hub-tony.html
├── hub-tony.html                 # Main hub (Tony's view)
├── hub-dukane.html              # Dukane family view
├── kanban-todo.html             # ← PRIMARY: Kanban board for tasks (R2, R3, R4)
├── todos.html                   # ← SECONDARY: List view for tasks (R2)
├── standup.html                 # Standup display page (R5)
├── middleware.js                # Vercel Edge Middleware (auth)
├── vercel.json                  # Vercel config
├── supabase-schema.sql          # Database schema reference
├── data/                        # Legacy JSON data (kept as reference only)
│   ├── kanban-todos.json
│   ├── todos.json
│   └── ...
├── docs/
│   ├── architecture.md          # ← THIS FILE
│   └── product-backlog.md
├── scripts/                     # Utility scripts
├── assets/                      # Static assets
└── images/                      # Image files
```

**Files modified by this overhaul:**
1. `kanban-todo.html` — Fix persistence bug, update to use enriched schema
2. `todos.html` — Repoint from `todos` table to `kanban_items` table
3. `standup.html` — Repoint to `kanban_items` table
4. `supabase-schema.sql` — Update schema reference, remove "Greg" comment
5. `hub-tony.html` — Verify zero Greg references (PR #5 should have handled this)

---

## Authentication and Authorization

**No changes required.** The existing Basic Auth middleware handles authentication:
- Tony: full access to all pages
- Dukane, Joana, Victor: restricted page access
- Realm name: "Warren Dashboard" (updated in PR #5)

**Supabase RLS:** All tables use permissive public access policies (`USING (true) WITH CHECK (true)`). This is acceptable because:
1. The Vercel middleware gates all HTTP access behind authentication
2. The Supabase publishable key is only exposed to authenticated users
3. This is a personal tool, not a multi-tenant SaaS application

---

## API Design

**No custom API endpoints.** All data access uses the Supabase PostgREST API via `@supabase/supabase-js` SDK loaded from CDN. The database schema IS the API contract.

**Contract-First design note:** Since this project has no custom backend and relies entirely on Supabase's auto-generated PostgREST API, the traditional Contract-First API pattern does not apply. The database schema serves as the contract — both the frontend JavaScript and the OpenClaw cron jobs query the same `kanban_items` table through the same Supabase client library.

**Cron job data access:** OpenClaw cron jobs will query Supabase using the publishable key (since RLS allows public read). This avoids needing to provision or store a secret key for this project.

---

## Cron Architecture (R5, R6)

### Daily Standup (R5)

**Trigger:** OpenClaw cron, `kind: "cron"`, expression: `"30 18 * * *"` (18:30 UTC = 8:30am Hawaii Standard Time)

**Session target:** `isolated` (ephemeral agent session)

**Logic:**
1. Query `kanban_items` where `board='todos'` and `column_id NOT IN ('done', 'archived')`
2. Group by priority (high → medium → low)
3. Identify items where `column_id` changed since last standup (track via `updated_at`)
4. Format standup message:
   - **What was handled** (items moved to 'done' in last 24h)
   - **What needs Tony's decision** (top 3-5 high-priority items in 'backlog' or 'today')
   - **What shifted** (items that changed column or priority)
5. Send to Tony's Slack DM (`D0AKEKPCRT8`) via OpenClaw message tool

**Delivery:** `announce` to Slack (Tony's DM channel)

### Stale Item Patrol (R6)

**Trigger:** OpenClaw cron, `kind: "cron"`, expression: `"47 1 * * 1"` (Monday 1:47am UTC = Sunday 3:47pm HST). Jittered per standing rules.

**Logic:**
1. Query `kanban_items` where `board='todos'` and `updated_at < NOW() - INTERVAL '7 days'` and `column_id NOT IN ('done', 'archived')`
2. Format list of stale items with their age and last status
3. Include in next standup message (store findings in a comment or flag items)

**Integration:** The stale patrol findings feed into the daily standup. The cron job will tag stale items by updating a field or posting to a known location that the standup cron reads.

---

## Kanban Persistence Bug Analysis (R3)

Based on code review of `kanban-todo.html` (lines 519-700):

**Root cause hypothesis:** The `item_id` stored in Supabase may not match what the JavaScript uses for updates. The code at line 572 shows: `supabaseId: item.id` (the UUID primary key) is stored on the task object, but updates at line 641 use `.eq('item_id', String(taskId))` where `taskId` comes from `task.id` — which is set to `item.item_id || item.id`. If `item_id` in the database doesn't match what JS expects, the `.update().eq('item_id', ...)` call matches zero rows and silently fails.

**Evidence:** The code includes extensive `console.log` debugging (prefixed `[v0]`) and an `alert()` call showing save results — this indicates active debugging of this exact problem.

**Fix approach:**
1. Ensure `item_id` values in the database exactly match what the JavaScript queries
2. Standardize on `String(item_id)` everywhere
3. After save, verify the returned `data` array is non-empty
4. Remove debug logging and alert after fix is confirmed

---

## Testing Strategy

**No automated test infrastructure exists.** Given the static HTML/JS architecture, adding a test framework is disproportionate to the project scope.

**Verification approach for each requirement:**

| Requirement | Verification Method |
|------------|-------------------|
| R1: Rebrand | `grep -ri "greg" --include="*.html" --include="*.js" --include="*.json" --include="*.sql"` returns zero results |
| R2: Unified data | Query `kanban_items` for `board='todos'` and verify all 36 items present. Open `todos.html` and `kanban-todo.html` — verify same items appear. |
| R3: Persistence | Manual test: create item → drag to new column → refresh page → verify item stayed in new column. Check browser console for zero-row warnings. |
| R4: Population | Count items in Supabase: `SELECT count(*) FROM kanban_items WHERE board='todos'` = 36. Verify priorities match spec. |
| R5: Standup cron | Trigger cron manually → verify message appears in Tony's Slack DM with correct format. |
| R6: Stale patrol | Backdate an item's `updated_at` → trigger patrol → verify it's flagged. |

---

## Architecture Decisions

### ADR-1: Preserve Static HTML/JS Architecture

**Status:** Accepted
**Context:** The reference architecture recommends Next.js for web applications. The existing dashboard is static HTML/JS.
**Decision:** Preserve the existing architecture. Do not migrate to Next.js.
**Rationale:** This is a personal tool for one primary user, not a SaaS product. The existing architecture works and is simple. Migration would cost 10-20x the effort of the fixes needed. The product requirements (rebrand, data unification, persistence fix, cron jobs) do not require a framework.
**Options considered:**
- Option A: Migrate to Next.js — Rejected. Disproportionate effort. Would require rewriting all 33 HTML pages.
- Option B: Preserve existing, fix targeted issues — Accepted. Minimal risk, fastest delivery.
**Consequences:** No server-side rendering, no TypeScript type safety, no automated testing framework. These are acceptable tradeoffs for a personal tool.

### ADR-2: Unify on `kanban_items` Table

**Status:** Accepted
**Context:** Two tables (`todos`, `kanban_items`) store overlapping task data with incompatible schemas.
**Decision:** Make `kanban_items` the single source of truth. Modify `todos.html` to read from `kanban_items`.
**Rationale:** `kanban_items` has the richer schema (board, column, position) and is used by the primary interaction surface (kanban board). Consolidating on `kanban_items` requires fewer changes than the reverse.
**Options considered:**
- Option A: Create a new unified `tasks` table — Rejected. Requires migrating data from both tables and updating all JavaScript in all pages. More risk.
- Option B: Unify on `kanban_items`, update `todos.html` — Accepted. Fewer moving parts.
- Option C: Keep both tables, add sync — Rejected. Sync mechanisms are fragile and hard to debug.
**Consequences:** The `todos` table becomes unused for task storage (but is not dropped — other data may reference it). The `todos.html` page needs JavaScript changes.

### ADR-3: OpenClaw Crons for Standup and Patrol

**Status:** Accepted
**Context:** Daily standup messages and weekly stale item patrols need to run on a schedule with Slack integration.
**Decision:** Use OpenClaw cron jobs (not Supabase Edge Functions, not OrgLoop crons).
**Rationale:** OpenClaw crons have direct access to the Slack message tool and can run agent sessions that query Supabase and compose rich messages. This is a Warren-specific automation, not a pipeline SOP.
**Options considered:**
- Option A: Supabase Edge Functions + Slack webhook — Rejected. Requires setting up Slack webhook URL, managing secrets in Supabase, and writing Deno code. More infrastructure for a simple use case.
- Option B: OrgLoop cron → SOP — Rejected. This is personal task management, not pipeline work. OrgLoop is for the development pipeline.
- Option C: OpenClaw cron → isolated agent session — Accepted. Simplest path. Warren can query Supabase and send Slack messages natively.
**Consequences:** Cron reliability depends on OpenClaw gateway uptime. If the gateway restarts, crons resume automatically.

### ADR-4: Publishable Key for Server-Side Queries

**Status:** Accepted
**Context:** OpenClaw cron jobs need to query Supabase for task data. Two options: publishable key (public, RLS-restricted) or secret key (admin, bypasses RLS).
**Decision:** Use the publishable key for cron queries.
**Rationale:** The RLS policies on `kanban_items` allow public read (`USING (true)`). The cron only needs to read task data — no admin operations needed. Using the publishable key avoids secret management complexity.
**Options considered:**
- Option A: Use secret key — Rejected. Unnecessary privilege escalation. Would require storing the secret key somewhere accessible to OpenClaw.
- Option B: Use publishable key — Accepted. Sufficient permissions for read queries.
**Consequences:** If RLS policies are tightened in the future, cron queries may break. This is unlikely for a personal tool.

---

## Delivery Plan

**Phase 1: Foundation** (Tasks 1-2)
- Schema migration
- Persistence fix

**Phase 2: Content and Polish** (Tasks 3-4)
- Rebrand completion
- Data population

**Phase 3: Automation** (Task 5)
- Daily standup cron
- Stale item patrol

**Critical path:** Task 1 (schema) → Task 2 (persistence fix) → Task 4 (populate items) → Task 5 (crons)

**Parallel track:** Task 3 (rebrand) can run independently at any time.
