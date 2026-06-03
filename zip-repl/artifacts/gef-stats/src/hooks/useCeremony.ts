import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

export type CeremonyMusicMode = "auto" | "off" | "awards" | "rankings" | "winner";
export type CeremonyStageStyle = "subtle" | "normal" | "dramatic" | "max";
export type CeremonyFxKind = "confetti" | "sweep" | "fireworks";

export interface CeremonyFxBurst {
  type: CeremonyFxKind;
  /** Monotonically increasing counter; live page fires effect when it changes. */
  counter: number;
}

export interface CeremonyData {
  intro: { title: string; message: string };
  awards: Array<{
    name: string;
    description: string;
    winner: { name?: string; team?: string; image?: string; stats?: Record<string, any> } | null;
  }>;
  rankings: Array<{
    playerId?: string;
    name: string;
    team: string;
    image?: string;
    stats: { goals: number; assists: number; trophies: number; rating: number };
    points: number;
    rank: number;
  }>;
  winner: {
    name?: string;
    team?: string;
    image?: string;
    stats?: { goals: number; assists: number; trophies: number; rating: number };
    points?: number;
  } | null;
  /** Broadcast-able stage / FX controls set by admin. */
  musicMode?: CeremonyMusicMode;
  stageStyle?: CeremonyStageStyle;
  fxBurst?: CeremonyFxBurst;
}

export interface CeremonyState {
  id: number;
  status: string;
  phase: string;
  currentStep: string;
  revealIndex: string;
  isPaused: boolean;
  animationSpeed: string;
  data: CeremonyData;
  updatedAt: string;
}

export interface CeremonyMessage {
  id: number;
  userName: string;
  message: string;
  createdAt: string;
}

export function useCeremonySocket() {
  const [state, setState] = useState<CeremonyState | null>(null);
  const [messages, setMessages] = useState<CeremonyMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("ceremony:state", (s: CeremonyState) => {
      setState(s);
    });

    socket.on("ceremony:message", (msg: CeremonyMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("ceremony:messages:cleared", () => {
      setMessages([]);
    });

    socket.on("ceremony:viewers", (count: number) => {
      setViewerCount(count);
    });

    fetch("/api/ceremony/state", { credentials: "include" })
      .then((r) => r.json())
      .then((s) => setState(s))
      .catch(() => {});

    fetch("/api/ceremony/messages", { credentials: "include" })
      .then((r) => r.json())
      .then((m) => setMessages(Array.isArray(m) ? m : []))
      .catch(() => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = useCallback(async (userName: string, message: string) => {
    await fetch("/api/ceremony/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, message }),
    });
  }, []);

  const updateState = useCallback(async (updates: Partial<CeremonyState>) => {
    const res = await fetch("/api/ceremony/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  }, []);

  return { state, messages, connected, viewerCount, sendMessage, updateState };
}
