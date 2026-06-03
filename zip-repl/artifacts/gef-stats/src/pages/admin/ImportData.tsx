import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Upload, Database, CheckCircle, AlertCircle, RefreshCw, FileJson } from "lucide-react";

interface DbStatus {
  isSupabase: boolean;
  counts: Record<string, number>;
}

interface ImportResult {
  ok: boolean;
  totalInserted: number;
  totalSkipped: number;
  results: Record<string, { inserted: number; skipped: number; error?: string }>;
}

export function ImportData() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any | null>(null);

  const { data: status, refetch: refetchStatus, isLoading } = useQuery<DbStatus>({
    queryKey: ["db-status"],
    queryFn: async () => {
      const r = await fetch("/api/admin/db-status", { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: false,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setFileData(parsed);
        setImportResult(null);
      } catch {
        toast({ variant: "destructive", title: "Invalid file", description: "The file is not valid JSON." });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileData) return;
    setImporting(true);
    try {
      const r = await fetch("/api/admin/import-data", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileData),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Import failed");
      setImportResult(data);
      refetchStatus();
      toast({ title: `Import complete — ${data.totalInserted} rows added`, description: `${data.totalSkipped} already existed (skipped)` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import failed", description: e.message });
    } finally {
      setImporting(false);
    }
  };

  const tables = status?.counts ? Object.entries(status.counts) : [];

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Database className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-display font-bold uppercase">Data Migration</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Import your data from a previous GEF installation into this database.
          </p>
        </div>

        {/* DB Connection Status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Current Database</h3>
            <Button size="sm" variant="ghost" onClick={() => refetchStatus()} className="h-7 gap-1 text-xs">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Checking connection…</p>
          ) : status ? (
            <>
              <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full mb-4 ${
                status.isSupabase
                  ? "bg-green-500/15 text-green-400 border border-green-500/30"
                  : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
              }`}>
                {status.isSupabase ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.isSupabase ? "Connected to Supabase" : "Connected to Replit Postgres (local)"}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {tables.map(([table, count]) => (
                  <div key={table} className="bg-background border border-border rounded-lg px-4 py-3">
                    <div className={`text-xl font-black ${count > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {count < 0 ? "—" : count}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">{table}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-destructive">Could not connect to database</p>
          )}
        </div>

        {/* Step 1 — Export from original */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Step 1 — Export from original Replit</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Open your <span className="text-foreground font-semibold">original Replit</span> and run this command in the Shell:
          </p>
          <div className="bg-black/60 rounded-lg px-4 py-3 font-mono text-sm text-green-400 border border-white/10 select-all">
            node scripts/export-data.mjs &gt; gef-data-export.json
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Then download <span className="text-foreground">gef-data-export.json</span> from the Files panel in the original Replit.
          </p>
        </div>

        {/* Step 2 — Upload and import */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Step 2 — Upload &amp; Import</h3>

          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
            <FileJson className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            {fileName ? (
              <>
                <p className="font-semibold text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fileData?.tables
                    ? `${Object.values(fileData.tables).reduce((s: number, r: any) => s + r.length, 0)} total rows ready to import`
                    : "Click to change file"}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-muted-foreground">Click to select gef-data-export.json</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
              </>
            )}
          </div>

          <Button
            onClick={handleImport}
            disabled={!fileData || importing}
            className="w-full gap-2"
            size="lg"
          >
            {importing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</>
            ) : (
              <><Upload className="w-4 h-4" /> Import All Data</>
            )}
          </Button>
        </div>

        {/* Import Results */}
        {importResult && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="font-bold text-green-400">Import Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-black text-green-400">{importResult.totalInserted}</div>
                <div className="text-xs text-muted-foreground mt-0.5">rows inserted</div>
              </div>
              <div className="bg-white/5 border border-border rounded-lg p-3 text-center">
                <div className="text-2xl font-black text-muted-foreground">{importResult.totalSkipped}</div>
                <div className="text-xs text-muted-foreground mt-0.5">already existed</div>
              </div>
            </div>
            <div className="space-y-1">
              {Object.entries(importResult.results)
                .filter(([, r]) => r.inserted > 0 || r.error)
                .map(([table, r]) => (
                  <div key={table} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground capitalize">{table}</span>
                    {r.error ? (
                      <span className="text-destructive text-xs">{r.error}</span>
                    ) : (
                      <span className="text-green-400 font-semibold">+{r.inserted}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
