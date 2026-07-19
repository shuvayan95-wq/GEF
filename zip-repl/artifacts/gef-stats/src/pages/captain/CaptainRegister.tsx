import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Shield, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";

export function CaptainRegister() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm)
      return toast({ variant: "destructive", title: "Passwords don't match" });
    if (form.password.length < 8)
      return toast({ variant: "destructive", title: "Password must be at least 8 characters" });

    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/captain/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setDone(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-10 w-full max-w-md text-center shadow-2xl">
          <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-black uppercase tracking-wide mb-2">Registration Submitted</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account is pending admin review. The admin will assign you a club and approve your account. You'll be able to log in once approved.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setLocation("/captain/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-black uppercase tracking-wide">Captain Registration</h1>
            <p className="text-sm text-muted-foreground mt-2">Create your club management account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
              <Input value={form.name} onChange={set("name")} placeholder="Your name" required className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email</label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="your@email.com" required className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Phone (Optional)</label>
              <Input value={form.phone} onChange={set("phone")} placeholder="+1 234 567 8900" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Password</label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")}
                  placeholder="Min. 8 characters" required className="bg-background pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Confirm Password</label>
              <Input type="password" value={form.confirm} onChange={set("confirm")}
                placeholder="Repeat password" required className="bg-background" />
            </div>

            <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 text-xs text-amber-400/80">
              ⚠️ Do not choose your own club. The admin will assign your club after reviewing your registration.
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit Registration"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5 pt-4 border-t border-border">
            Already approved?{" "}
            <Link href="/captain/login" className="text-primary hover:underline font-medium">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
