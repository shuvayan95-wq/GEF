import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) return res.status(401).json({ error: "Unauthorized" });
  next();
}

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

function buildInsert(table: string, row: Record<string, any>) {
  const keys = Object.keys(row);
  if (keys.length === 0) return null;
  const cols = keys.map((k) => `"${k}"`).join(", ");
  const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
  return {
    text: `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`,
    values: keys.map((k) => row[k]),
  };
}

router.post("/admin/import-data", requireAdmin, async (req, res) => {
  try {
    const dump = req.body;
    if (!dump || !dump.tables) {
      return res.status(400).json({ error: "Invalid export file — missing 'tables' field" });
    }

    const results: Record<string, { inserted: number; skipped: number; error?: string }> = {};
    const client = await pool.connect();

    try {
      for (const table of IMPORT_ORDER) {
        const rows: any[] = dump.tables[table];
        if (!rows || rows.length === 0) {
          results[table] = { inserted: 0, skipped: 0 };
          continue;
        }

        let inserted = 0;
        let skipped = 0;

        await client.query("BEGIN");
        try {
          for (const row of rows) {
            const query = buildInsert(table, row);
            if (!query) continue;
            try {
              const result = await client.query(query);
              if (result.rowCount && result.rowCount > 0) inserted++;
              else skipped++;
            } catch {
              skipped++;
            }
          }
          await client.query("COMMIT");
          results[table] = { inserted, skipped };
        } catch (err: any) {
          await client.query("ROLLBACK");
          results[table] = { inserted: 0, skipped: rows.length, error: err.message };
        }
      }

      // Reset sequences after import so new inserts get correct IDs
      try {
        const seqResult = await client.query(
          `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
        );
        for (const { sequence_name } of seqResult.rows) {
          const tableName = sequence_name.replace(/_id_seq$/, "").replace(/_seq$/, "");
          try {
            await client.query(
              `SELECT setval('${sequence_name}', COALESCE((SELECT MAX(id) FROM "${tableName}"), 1))`
            );
          } catch {
            // Sequence may not map to a simple table — skip
          }
        }
      } catch {
        // Sequence reset failure is non-fatal
      }
    } finally {
      client.release();
    }

    const totalInserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
    const totalSkipped  = Object.values(results).reduce((s, r) => s + r.skipped, 0);

    res.json({ ok: true, totalInserted, totalSkipped, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/db-status", requireAdmin, async (_req, res) => {
  try {
    const tables = [
      "leagues", "teams", "players", "matches",
      "trophies", "ballon_dor_results",
    ];
    const counts: Record<string, number> = {};
    for (const t of tables) {
      try {
        const r = await pool.query(`SELECT COUNT(*) FROM "${t}"`);
        counts[t] = parseInt(r.rows[0].count);
      } catch {
        counts[t] = -1;
      }
    }
    const isSupabase = !!process.env.SUPABASE_DATABASE_URL;
    const connected = Object.values(counts).some(c => c >= 0);
    res.json({ isSupabase, connected, counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
