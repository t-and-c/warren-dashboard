#!/usr/bin/env node
/**
 * populate-items.mjs
 * Deletes all kanban_items where board='todos' and inserts 36 Chief of Staff items.
 * No npm dependencies — uses fetch() against the Supabase REST API.
 *
 * Usage: node scripts/populate-items.mjs
 */

const SUPABASE_URL = 'https://mmwbiogqmgmtxboipyko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r6q0-iEnygKZiZkaOuY-hg_Tvlb-66U';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=minimal',
};

// ─── Item definitions ────────────────────────────────────────────────────────

const HIGH = 'high';
const MED  = 'medium';
const LOW  = 'low';

const items = [
  // HIGH priority → column_id: 'today'
  { id: 1,  priority: HIGH, agent: 'warren', category: 'strategy',   source: 'Brain dump #7 + Trent transcript',   title: 'P1: Define the Trent Johnson Outlier Profile' },
  { id: 2,  priority: HIGH, agent: 'tony',   category: 'sales',      source: 'Trent transcript Mar 27',            title: 'URGENT: Follow up — Trent → Igor+Philip Slalom intro' },
  { id: 3,  priority: HIGH, agent: 'tony',   category: 'sales',      source: 'Trent transcript Mar 27',            title: 'URGENT: Follow up — Trent → Eric Manlunas Wavemaker VC' },
  { id: 4,  priority: HIGH, agent: 'tony',   category: 'sales',      source: 'Trent transcript Mar 27',            title: 'URGENT: Send Trent white paper + NDA' },
  { id: 5,  priority: HIGH, agent: 'tony',   category: 'sales',      source: 'Brain dump #4',                      title: 'Review revised case study for Liem' },
  { id: 6,  priority: HIGH, agent: 'warren', category: 'marketing',  source: 'Brain dump #9',                      title: 'Draft MVN email + videos + Deloitte mention' },
  { id: 7,  priority: HIGH, agent: 'warren', category: 'marketing',  source: 'Brain dump #9',                      title: 'Email Calcanis' },
  { id: 8,  priority: HIGH, agent: 'warren', category: 'marketing',  source: 'Brain dump #9',                      title: 'Email Scott Griest enterprise intro' },
  { id: 9,  priority: HIGH, agent: 'tony',   category: 'marketing',  source: 'Brain dump #9',                      title: 'Marketing strategy — how to market Warren' },
  { id: 10, priority: HIGH, agent: 'tony',   category: 'sales',      source: 'Brain dump #12',                     title: 'Codazen angle — Mike requirements + Burke coding' },
  { id: 11, priority: HIGH, agent: 'tony',   category: 'operations', source: 'Brain dump #10',                     title: 'Austin — flights decision + book RAMP room' },
  { id: 12, priority: HIGH, agent: 'tony',   category: 'operations', source: 'Brain dump #3',                      title: 'Austin — Training/LMS plan + portfolio/cadence plan' },

  // MEDIUM priority → column_id: 'backlog'
  { id: 13, priority: MED,  agent: 'warren', category: 'sales',      source: 'Trent supplement',                   title: 'Build PE operating partner pitch 1-pager' },
  { id: 14, priority: MED,  agent: 'warren', category: 'strategy',   source: 'Trent supplement',                   title: 'Map target PE firms' },
  { id: 15, priority: MED,  agent: 'warren', category: 'sales',      source: 'Trent supplement',                   title: 'Develop free margin consultancy pitch' },
  { id: 16, priority: MED,  agent: 'tony',   category: 'strategy',   source: 'Trent supplement',                   title: 'Stealth strategy — multi-consultancy' },
  { id: 17, priority: MED,  agent: 'tony',   category: 'operations', source: 'Trent transcript',                   title: 'Innovate UCLA August event planning' },
  { id: 18, priority: MED,  agent: 'tony',   category: 'sales',      source: 'Trent transcript',                   title: 'CLA OC board access' },
  { id: 19, priority: MED,  agent: 'warren', category: 'operations', source: 'Trent transcript',                   title: 'UCI/Nvidia supercomputer inquiry' },
  { id: 20, priority: MED,  agent: 'warren', category: 'operations', source: 'Trent supplement',                   title: 'WWTD pattern from Trent call → corpus' },
  { id: 21, priority: MED,  agent: 'tony',   category: 'marketing',  source: 'thread, reminder Mar 30',            title: 'Akira visuals — revisit sales material integration' },
  { id: 22, priority: MED,  agent: 'tony',   category: 'operations', source: 'Brain dump #6',                      title: 'Victor — confirm Claude chat exports' },
  { id: 23, priority: MED,  agent: 'warren', category: 'operations', source: 'Brain dump #6',                      title: 'Copy Warren to macstudio' },
  { id: 24, priority: MED,  agent: 'warren', category: 'operations', source: 'thread',                             title: 'Google Workspace access — service account' },
  { id: 25, priority: MED,  agent: 'tony',   category: 'operations', source: 'Brain dump #17',                     title: 'Buy XAi' },
  { id: 26, priority: MED,  agent: 'tony',   category: 'strategy',   source: 'Brain dump #19',                     title: 'White paper — Spiral Dynamics/Renaissance with Alec' },
  { id: 27, priority: MED,  agent: 'tony',   category: 'personal',   source: 'Brain dump #20',                     title: 'Blood test — schedule requisition' },

  // LOW priority → column_id: 'backlog'
  { id: 28, priority: LOW,  agent: 'tony',   category: 'operations', source: 'Brain dump #2',                      title: 'Brazil corp' },
  { id: 29, priority: LOW,  agent: 'tony',   category: 'personal',   source: 'Brain dump #5',                      title: 'Personal transformation timeline from ai-chat-history' },
  { id: 30, priority: LOW,  agent: 'warren', category: 'operations', source: 'Brain dump #7',                      title: 'WWTD agent build' },
  { id: 31, priority: LOW,  agent: 'warren', category: 'strategy',   source: 'Brain dump #7',                      title: 'Research topics — Innovate UCLA / scaling consciousness' },
  { id: 32, priority: LOW,  agent: 'tony',   category: 'operations', source: 'Brain dump #13',                     title: 'Applied Alpha v2' },
  { id: 33, priority: LOW,  agent: 'tony',   category: 'personal',   source: 'Brain dump #14',                     title: 'Review WWElonD' },
  { id: 34, priority: LOW,  agent: 'warren', category: 'operations', source: 'Brain dump #15',                     title: "Remove Ron's texts from Github" },
  { id: 35, priority: LOW,  agent: 'tony',   category: 'personal',   source: 'Brain dump #16',                     title: 'HMT inheritance matter' },
  { id: 36, priority: LOW,  agent: 'tony',   category: 'operations', source: 'Brain dump #18',                     title: 'Move crypto + OneNote docs to 1Password' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Delete all existing items for board='todos'
  console.log('Deleting existing todos board items...');
  await apiFetch('/kanban_items?board=eq.todos', { method: 'DELETE' });
  console.log('Deleted.');

  // 2. Build insert payload
  const rows = items.map((item, index) => {
    const columnId = item.priority === HIGH ? 'today' : 'backlog';
    // Within each priority group, position is sequential
    return {
      board: 'todos',
      column_id: columnId,
      item_id: String(item.id),
      position: index,  // global position; within-column order is preserved by insertion order
      data: {
        id: item.id,
        title: item.title,
        description: item.title,
        priority: item.priority,
        agent: item.agent,
        category: item.category,
        source: item.source,
      },
    };
  });

  // 3. Insert in batches of 12 to avoid request size limits
  const BATCH = 12;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    console.log(`Inserting items ${i + 1}–${Math.min(i + BATCH, rows.length)}...`);
    await apiFetch('/kanban_items', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    });
  }

  console.log(`\nDone! Inserted ${rows.length} items into kanban_items (board='todos').`);
  console.log(`  HIGH  (today):   ${rows.filter(r => r.column_id === 'today').length} items`);
  console.log(`  MED+LOW (backlog): ${rows.filter(r => r.column_id === 'backlog').length} items`);
}

main().catch(err => {
  console.error('populate-items failed:', err.message);
  process.exit(1);
});
