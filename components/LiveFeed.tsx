"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { formatSol, formatTime, formatTokens, shortSig } from "@/lib/utils";
import { solscanTxUrl } from "@/lib/solana/cluster";

export interface FeedDrop {
  id: string;
  username: string;
  slot_index: number;
  multiplier: number;
  sol_in: number;
  sol_out: number;
  status: "pending" | "bought" | "burned" | "failed" | "skipped";
  buy_sig?: string | null;
  burn_sig?: string | null;
  tokens_burned?: string | null;
  error?: string | null;
  created_at: string;
}

function shortError(message: string | null | undefined): string | null {
  if (!message) return null;
  if (message.startsWith("Treasury underfunded")) return message;
  const insufficient = message.match(/insufficient lamports/i);
  if (insufficient) return "Treasury underfunded for this buy";
  return message.length > 96 ? `${message.slice(0, 96)}…` : message;
}

export interface LiveFeedProps {
  drops: FeedDrop[];
}

function statusBadge(status: FeedDrop["status"]) {
  switch (status) {
    case "burned":
      return "bg-[#4ade80]/20 text-[#86efac] border-[#4ade80]/35";
    case "bought":
      return "bg-[#f5c518]/15 text-[#f5c518] border-[#f5c518]/30";
    case "skipped":
      return "bg-slate-500/20 text-slate-300 border-slate-400/35";
    case "failed":
      return "bg-rose-500/20 text-rose-300 border-rose-400/35";
    default:
      return "bg-[#141f14]/50 text-[#4ade80]/80 border-[#4ade80]/20";
  }
}

function explorerHref(sig: string) {
  return solscanTxUrl(sig);
}

export default function LiveFeed({ drops }: LiveFeedProps) {
  return (
    <div className="glass flex h-full flex-col rounded-xl p-3 text-white">
      <div className="mb-2 flex items-center justify-between border-b border-white/8 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Live Bounties</h2>
        </div>
        <span className="font-mono text-[10px] text-white/40">{drops.length} claims</span>
      </div>
      <div className="feed-scroll -mr-1 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-none">
        <AnimatePresence initial={false}>
          {drops.slice(0, 50).map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-white/8 bg-black/40 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-white/90">{d.username}</span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${statusBadge(d.status)}`}
                >
                  {d.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <span>
                  <span className="font-extrabold text-[#f5c518]">{Number(d.multiplier)}x</span>
                  {" → "}
                  <span className="font-mono text-[#4ade80]">{formatSol(Number(d.sol_out))}</span>
                </span>
                <span className="text-white/40">{formatTime(d.created_at)} ago</span>
              </div>
              {d.status === "failed" && d.error && (
                <div className="mt-1 text-[10px] text-rose-300/90">{shortError(d.error)}</div>
              )}
              {(d.burn_sig || d.buy_sig) && (
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/50">
                  <span>
                    burned{" "}
                    <span className="font-mono text-[#22c55e]">{formatTokens(d.tokens_burned, 6)}</span>
                  </span>
                  {(d.burn_sig || d.buy_sig) && (
                    <a
                      href={explorerHref((d.burn_sig || d.buy_sig) as string)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#4ade80] hover:text-[#86efac]"
                      title={d.burn_sig ? "View burn on Solscan" : "View buy on Solscan"}
                    >
                      {d.burn_sig ? shortSig(d.burn_sig) : shortSig(d.buy_sig)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {drops.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#4ade80]/25 bg-[#0c140c]/50 py-8 text-center text-xs text-white/45">
            Waiting for the first bounty drop…
          </div>
        )}
      </div>
    </div>
  );
}

export function useLiveFeedTicker() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setT((x) => x + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
}
