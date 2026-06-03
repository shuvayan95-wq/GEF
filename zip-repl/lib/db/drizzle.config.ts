import { defineConfig } from "drizzle-kit";
import path from "path";

let url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (url && url.includes("pooler.supabase.com:6543")) {
  url = url.replace(":6543/", ":5432/");
}

if (!url) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: process.env.SUPABASE_DATABASE_URL ? "require" : undefined,
  } as any,
});
