import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStat(value: number | undefined | null): string {
  if (value === undefined || value === null) return "-";
  return value.toString();
}

export function formatOvr(ovr: number | undefined | null): string {
  if (!ovr) return "N/A";
  return ovr.toFixed(1);
}

export function getOvrColorClass(ovr: number): string {
  if (ovr >= 90) return "text-primary neon-text";
  if (ovr >= 80) return "text-green-400";
  if (ovr >= 70) return "text-yellow-400";
  if (ovr >= 60) return "text-orange-400";
  return "text-red-400";
}
