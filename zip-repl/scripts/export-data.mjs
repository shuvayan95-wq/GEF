/**
 * GEF DATA EXPORT SCRIPT
 * Run this on the ORIGINAL Replit to export all your data.
 *
 * Usage (in the original Replit Shell):
 *   node scripts/export-data.mjs > gef-data-export.json
 *
 * Then download gef-data-export.json and upload it to the new Replit.
 */

import pg from "pg";
import fs from "fs";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const TABLES = [
  // Order matters: parent tables first (foreign key dependencies)
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

async function exportAll() {
  const result = { exportedAt: new Date().toISOString(), tables: {} };
  const errors = [];

  for (const table of TABLES) {
    try {
      const { rows } = await pool.query(`SELECT * FROM "${table}"`);
      result.tables[table] = rows;
      process.stderr.write(`✓ ${table}: ${rows.length} rows\n`);
    } catch (e) {
      process.stderr.write(`⚠ ${table}: skipped (${e.message})\n`);
      errors.push({ table, error: e.message });
      result.tables[table] = [];
    }
  }

  if (errors.length) {
    result._skipped = errors;
  }

  // Print JSON to stdout so you can redirect it to a file
  process.stdout.write(JSON.stringify(result, null, 2));
  process.stderr.write(`\n✅ Export complete. Redirect output to a .json file.\n`);
}

exportAll()
  .catch((e) => { process.stderr.write("Fatal: " + e.message + "\n"); process.exit(1); })
  .finally(() => pool.end());
