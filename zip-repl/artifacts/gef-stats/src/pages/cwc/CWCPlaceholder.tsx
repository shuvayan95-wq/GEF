import { CWCLayout } from "./CWCLayout";
import { useParams } from "wouter";

export function CWCPlaceholder() {
  const params = useParams();
  const section = params.section || "section";

  return (
    <CWCLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center px-4">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-[#0066FF]/20 rounded-full" />
          <h1 className="relative font-display font-black text-6xl md:text-8xl tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {section}
          </h1>
        </div>
        <p className="mt-6 text-[#FFB800] font-display tracking-[0.3em] font-bold md:text-xl">
          COMING SOON TO THE GLOBAL STAGE
        </p>
        
        <div className="mt-12 w-24 h-px bg-gradient-to-r from-transparent via-[#0066FF] to-transparent" />
      </div>
    </CWCLayout>
  );
}
