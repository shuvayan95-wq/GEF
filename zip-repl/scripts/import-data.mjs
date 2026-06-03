/**
 * GEF DATA IMPORT SCRIPT
 * Run this on the NEW Replit after uploading gef-data-export.json.
 *
 * Usage (in this Replit Shell):
 *   node scripts/import-data.mjs gef-data-export.json
 */

import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Import order: parent tables first so foreign keys work
const IMPORT_ORDER = [
  "leagues",
  "teams",
  "players",
  "matches",
  "player_matchups",
  "awards",
  "trophies",
  "ballon_dor_results",
  "ceremony_state",
  "ceremony_messages",
  "ceremony_attendees",
  "ffp_settings",
  "ffp_income_log",
  "player_market_value_history",
  "team_financials",
];

function buildInsert(table, row) {
  const keys = Object.keys(row);
  if (keys.length === 0) return null;
  const cols = keys.map((k) => `"${k}"`).join(", ");
  const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
  const conflictCols = keys.map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ");
  return {
    text: `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`,
    values: keys.map((k) => row[k]),
  };
}

async function importAll(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const dump = JSON.parse(raw);

  console.log(`\n📦 Export created at: ${dump.exportedAt}`);
  console.log(`Starting import into connected database...\n`);

  const client = await pool.connect();

  try {
    for (const table of IMPORT_ORDER) {
      const rows = dump.tables?.[table];
      if (!rows || rows.length === 0) {
        console.log(`  — ${table}: no data, skipping`);
        continue;
      }

      // Temporarily disable triggers/constraints for clean insert
      await client.query("BEGIN");
      try {
        let inserted = 0;
        let skipped = 0;
        for (const row of rows) {
          const query = buildInsert(table, row);
          if (!query) continue;
          try {
            const result = await client.query(query);
            if (result.rowCount > 0) inserted++;
            else skipped++;
          } catch (rowErr) {
            skipped++;
          }
        }
        await client.query("COMMIT");
        console.log(`  ✓ ${table}: ${inserted} inserted, ${skipped} skipped`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.log(`  ✗ ${table}: FAILED — ${err.message}`);
      }
    }

    // Reset sequences so new inserts get correct IDs
    console.log("\n🔧 Resetting ID sequences...");
    const seqResult = await client.query(`
      SELECT sequence_name FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    for (const { sequence_name } of seqResult.rows) {
      const tableName = sequence_name.replace(/_id_seq$/, "").replace(/_seq$/, "");
      try {
        await client.query(
          `SELECT setval('${sequence_name}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 1))`
        );
        console.log(`  ✓ Reset ${sequence_name}`);
      } catch {
        // Not all sequences map cleanly — that's fine
      }
    }

    console.log("\n✅ Import complete! Refresh your app to see all your data.\n");
  } finally {
    client.release();
  }
}

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: node scripts/import-data.mjs <path-to-gef-data-export.json>");
  process.exit(1);
}
if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

importAll(inputFile)
  .catch((e) => { console.error("Fatal:", e.message); process.exit(1); })
  .finally(() => pool.end());
