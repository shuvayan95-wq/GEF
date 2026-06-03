import { useState } from "react";
import { useAppAuth } from "@/hooks/use-app-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn } = useAppAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const from = (() => {
    try {
      const p = new URLSearchParams(search).get("from");
      return p && p.startsWith("/") ? p : "/admin";
    } catch {
      return "/admin";
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast({ title: "Access Granted", description: "Welcome to the Admin Panel" });
      setLocation(from);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Access Denied", description: err.message || "Invalid credentials" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-2xl relative z-10 glass-panel">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Identity</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Access Code</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="bg-background"
            />
          </div>

          <Button type="submit" variant="gaming" className="w-full h-12 mt-4" disabled={isLoggingIn}>
            {isLoggingIn ? "Authenticating..." : "Initialize Session"}
          </Button>
        </form>
        
        <div className="mt-8 text-center">
          <button onClick={() => setLocation("/")} className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
            ← Return to Public Hub
          </button>
        </div>
      </div>
    </div>
  );
}
