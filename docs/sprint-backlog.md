# Sprint Backlog — Warren Dashboard Sprint 1

**Sprint goal:** Deliver Tony's complete Chief of Staff personal OS — unified data model, working persistence, 36 populated action items, daily standup cron, and full Warren rebrand.
**Sprint start:** 2026-03-30
**Sprint end:** 2026-04-06
**Total committed effort:** 16.5 agent-hours

## Committed Deliverables

| # | Deliverable | Outcome Delivered | Effort | Runner | Status |
|---|-------------|------------------|:------:|--------|:------:|
| #7 | Migrate Supabase schema: enrich kanban_items + updated_at trigger | Unified data model with queryable columns and stale detection | 3h | Runner 1 | ⬜ Not Started |
| #8 | Fix kanban drag-and-drop persistence: item_id mismatch | Drag-and-drop changes persist across page refresh | 5h | Runner 1 | ⬜ Not Started |
| #9 | Complete Greg to Warren rebrand: zero references | Clean Warren identity — zero Greg references in code, schema, data | 2.5h | Runner 2 | ⬜ Not Started |
| #10 | Populate kanban board with 36 current action items | All 36 Tony action items visible and categorized on the board | 2h | Runner 1 | ⬜ Not Started |
| #11 | Create OpenClaw cron jobs: daily standup + stale patrol | Automated 8:30am HST standup to Tony's DM + weekly stale item alerts | 4h | Runner 3 | ⬜ Not Started |

## Promise Items
All 5 deliverables are Promise-level — this is a small sprint well within capacity.

## Stretch Items
None — scope is tight and complete.

## Ground Rules
- Definition of Done: All acceptance criteria checked, changes pushed, PR opened (repo changes) or cron verified by manual trigger (infra changes)
- Review turnaround: 2 hours
- Escalation channel: #agent-warren (Slack)
- Blockers must be surfaced within: 1 hour
