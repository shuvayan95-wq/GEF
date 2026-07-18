import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("No database URL found");
  process.exit(1);
}

const useSupabase = !!process.env.SUPABASE_DATABASE_URL;

const client = new pg.Client({
  connectionString,
  ssl: useSupabase ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 15000,
});

const sqlFile = path.join(
  __dirname,
  "../lib/db/drizzle/0000_misty_night_nurse.sql"
);
const sql = fs.readFileSync(sqlFile, "utf-8");

console.log("Connecting to database...");
await client.connect();
console.log("Connected! Applying schema...");

// Split on --> statement-breakpoint and run each statement
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    await client.query(stmt);
    process.stdout.write(`\r[${i + 1}/${statements.length}] done`);
  } catch (err) {
    if (err.message.includes("already exists")) {
      process.stdout.write(`\r[${i + 1}/${statements.length}] skipped (exists)`);
    } else {
      console.error(`\nFailed on statement ${i + 1}:`, err.message);
      console.error("SQL:", stmt.slice(0, 200));
    }
  }
}

console.log("\nSchema applied successfully!");
await client.end();
