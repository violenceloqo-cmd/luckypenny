import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd === 0) return "$0";
  if (usd >= 100) return `$${Math.round(usd).toLocaleString()}`;
  if (usd >= 1) return `$${usd.toFixed(2).replace(/\.00$/, "")}`;
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(rawAmount: bigint | string | null | undefined, decimals = 6): string {
  if (rawAmount == null) return "0";
  let n: bigint;
  try {
    n = typeof rawAmount === "bigint" ? rawAmount : BigInt(rawAmount);
  } catch {
    return "0";
  }
  if (n === 0n) return "0";
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString()}.${fracStr.slice(0, 4)}`;
}

export function shortSig(sig: string | null | undefined): string {
  if (!sig) return "";
  if (sig.length <= 12) return sig;
  return `${sig.slice(0, 6)}…${sig.slice(-4)}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
