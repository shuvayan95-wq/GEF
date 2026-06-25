import pg from 'pg';

const { Pool } = pg;

const TABLES = [
  "leagues", "teams", "players", "matches", "player_matchups",
  "awards", "trophies", "ballon_dor_results", "ceremony_state",
  "ceremony_messages", "ceremony_attendees", "ffp_settings",
  "ffp_income_log", "player_market_value_history", "team_financials",
  "transfers", "incidents", "cms_settings", "cms_posts", "cms_events",
  "cms_partners", "cms_admin_team", "budget_transactions",
  "efootball_cards", "efw_formations", "efw_posts", "efw_qna", "efw_tips",
  "gcc_entries", "gcc_fixtures", "gcc_tournaments", "knockout_cups",
  "knockout_fixtures", "league_fixtures", "league_participants",
  "lineup_changes", "match_analysis", "player_contracts", "potw_rounds",
  "potw_votes", "power_rankings", "ai_predictions", "ai_sports_desk"
];

const src = new Pool({
  connectionString: 'postgresql://postgres.vnidzmtmjyoncpvecact:Aitanabonmati@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const dst = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 3,
});

async function migrateTable(table) {
  const { rows } = await src.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const client = await dst.connect();
  let inserted = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const keys = Object.keys(row);
      if (keys.length === 0) continue;
      const cols = keys.map(k => `"${k}"`).join(', ');
      const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
      try {
        const r = await client.query(
          `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`,
          keys.map(k => row[k])
        );
        if (r.rowCount > 0) inserted++; else skipped++;
      } catch { skipped++; }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`  ERROR in ${table}:`, e.message);
  } finally {
    client.release();
  }
  return { inserted, skipped };
}

async function resetSequences() {
  const client = await dst.connect();
  try {
    const { rows } = await client.query(
      `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
    );
    for (const { sequence_name } of rows) {
      const tableName = sequence_name.replace(/_id_seq$/, '').replace(/_seq$/, '');
      try {
        await client.query(
          `SELECT setval('${sequence_name}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 1))`
        );
      } catch { /* skip */ }
    }
  } finally {
    client.release();
  }
}

let total = 0;
for (const table of TABLES) {
  process.stdout.write(`  ${table}... `);
  try {
    const { inserted, skipped } = await migrateTable(table);
    total += inserted;
    console.log(`${inserted} inserted, ${skipped} skipped`);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}

console.log('\nResetting sequences...');
await resetSequences();
console.log(`\nDone! Total rows inserted: ${total}`);
await src.end();
await dst.end();
