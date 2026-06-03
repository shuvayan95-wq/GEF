import { useState } from "react";
import { useLocation } from "wouter";
import { Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CeremonyStageBackdrop } from "@/components/ceremony/CeremonyStage";

export function CeremonyEntry() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/ceremony/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: name.trim() }),
      });
      sessionStorage.setItem("ceremony_user", name.trim());
      navigate("/ceremony/live");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <CeremonyStageBackdrop />

      <div className="relative z-10 text-center max-w-md w-full px-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-400/50" />
          <Star className="w-4 h-4 text-yellow-400" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-400/50" />
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-yellow-400/30 rounded-full" />
            <Trophy className="relative w-20 h-20 text-yellow-400 drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]" />
          </div>
        </div>

        <h1 className="text-5xl font-black uppercase tracking-widest text-yellow-400 drop-shadow-[0_0_30px_rgba(212,175,55,0.5)] mb-1">
          GEF
        </h1>
        <h2 className="text-xl font-semibold uppercase tracking-[0.3em] text-white/80 mb-1">Ballon d'Or</h2>
        <p className="text-sm uppercase tracking-widest text-yellow-400/60 mb-10">Award Ceremony</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="bg-white/5 border border-yellow-400/20 rounded-xl p-6 backdrop-blur-sm">
            <p className="text-white/60 text-sm uppercase tracking-widest mb-4">Enter Your Name to Join</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              className="bg-black/50 border-yellow-400/30 text-white placeholder:text-white/30 text-center text-lg h-12 focus:border-yellow-400/70 focus:ring-yellow-400/20"
              maxLength={30}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full h-12 text-base font-bold uppercase tracking-widest bg-gradient-to-r from-yellow-500 to-yellow-400 text-black hover:from-yellow-400 hover:to-yellow-300 border-0 shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            {loading ? "Entering..." : "Enter Ceremony"}
          </Button>
        </form>
      </div>
    </div>
  );
}
