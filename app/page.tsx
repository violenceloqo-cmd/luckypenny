"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Copy, LogOut } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import Board, { type DropEvent } from "@/components/Board";
import DropButton from "@/components/DropButton";
import LeprechaunCameo from "@/components/LeprechaunCameo";
import LiveFeed, { type FeedDrop, useLiveFeedTicker } from "@/components/LiveFeed";
import LoginCard from "@/components/LoginCard";
import StatsBar from "@/components/Stats";
import ThemeBackground from "@/components/ThemeBackground";
import { isBigWin } from "@/lib/game/multipliers";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Me {
  user: { uid: string; username: string } | null;
  cooldownRemainingMs: number;
  cooldownSeconds: number;
}

interface DropsResponse {
  drops: FeedDrop[];
  stats: {
    totalDrops: number;
    totalSolOut: number;
    totalTokensBurned: string;
    biggestMultiplier: number;
  };
}

const DEFAULT_COOLDOWN_SEC = 60;

const cluster: "mainnet-beta" | "devnet" =
  (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as "mainnet-beta" | "devnet" | undefined) ?? "devnet";

const TOKEN_MINT = "C4eMZ38U2K8gLAKHk6x3tU7NKnMP2RSSvMLWG5hUpump";
const TWITTER_URL = "https://x.com/luckypennyfun";

function shortenAddress(addr: string) {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function HomePage() {
  const [me, setMe] = useState<Me>({ user: null, cooldownRemainingMs: 0, cooldownSeconds: DEFAULT_COOLDOWN_SEC });
  const [loadingMe, setLoadingMe] = useState(true);
  const [feed, setFeed] = useState<FeedDrop[]>([]);
  const [stats, setStats] = useState<DropsResponse["stats"]>({
    totalDrops: 0,
    totalSolOut: 0,
    totalTokensBurned: "0",
    biggestMultiplier: 0,
  });
  const [pendingBalls, setPendingBalls] = useState<DropEvent[]>([]);
  const [dropping, setDropping] = useState(false);
  const [announce, setAnnounce] = useState<string>("");
  const [cameo, setCameo] = useState<{ show: boolean; multiplier: number }>({ show: false, multiplier: 0 });
  const [copied, setCopied] = useState(false);

  const onCopyCA = useCallback(async () => {
    if (!TOKEN_MINT) return;
    try {
      await navigator.clipboard.writeText(TOKEN_MINT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, []);

  const seenSeedsRef = useRef<Set<string>>(new Set());

  useLiveFeedTicker();

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me", { cache: "no-store" });
    const data = (await r.json()) as Me;
    setMe(data);
    setLoadingMe(false);
  }, []);

  const loadFeed = useCallback(async () => {
    const r = await fetch("/api/drops", { cache: "no-store" });
    const data = (await r.json()) as DropsResponse;
    setFeed(data.drops);
    setStats(data.stats);
    for (const d of data.drops) seenSeedsRef.current.add(d.id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadMe();
      if (cancelled) return;
      await loadFeed();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, loadFeed]);

  // Subscribe to realtime drops so the board animates everyone's drops.
  useEffect(() => {
    const supa = getSupabaseClient();
    const channel = supa
      .channel("public:drops")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "drops" },
        (payload) => {
          const row = payload.new as FeedDrop & { server_seed: string };
          if (!seenSeedsRef.current.has(row.id)) {
            seenSeedsRef.current.add(row.id);
            setFeed((cur) => [
              {
                id: row.id,
                username: row.username,
                slot_index: row.slot_index,
                multiplier: Number(row.multiplier),
                sol_in: Number(row.sol_in),
                sol_out: Number(row.sol_out),
                status: row.status,
                buy_sig: row.buy_sig ?? null,
                burn_sig: row.burn_sig ?? null,
                tokens_burned: row.tokens_burned ?? null,
                created_at: row.created_at,
              },
              ...cur,
            ].slice(0, 100));
            setPendingBalls((cur) => [...cur, { id: row.id, seed: row.server_seed, username: row.username }]);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drops" },
        (payload) => {
          const row = payload.new as FeedDrop;
          setFeed((cur) =>
            cur.map((d) =>
              d.id === row.id
                ? {
                    ...d,
                    status: row.status,
                    buy_sig: row.buy_sig ?? null,
                    burn_sig: row.burn_sig ?? null,
                    tokens_burned: row.tokens_burned ?? null,
                  }
                : d,
            ),
          );
          if (row.status === "burned" || row.status === "skipped") {
            setStats((s) => ({
              ...s,
              totalSolOut: s.totalSolOut + Number(row.sol_out),
              totalTokensBurned: (() => {
                try {
                  return (BigInt(s.totalTokensBurned) + BigInt(row.tokens_burned ?? "0")).toString();
                } catch {
                  return s.totalTokensBurned;
                }
              })(),
            }));
          }
        },
      )
      .subscribe();
    return () => {
      void supa.removeChannel(channel);
    };
  }, []);

  const onDrop = useCallback(async () => {
    if (dropping) return;
    setDropping(true);
    try {
      const r = await fetch("/api/drop", { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        if (typeof data.cooldownRemainingMs === "number") {
          setMe((cur) => ({ ...cur, cooldownRemainingMs: data.cooldownRemainingMs }));
        }
        setAnnounce(data.error ?? "Drop failed");
        return;
      }
      setMe((cur) => ({ ...cur, cooldownRemainingMs: cur.cooldownSeconds * 1000 }));
      setStats((s) => ({ ...s, totalDrops: s.totalDrops + 1 }));
      setAnnounce(`Penny dropped — landing in ${data.multiplier}x slot.`);
    } finally {
      setDropping(false);
    }
  }, [dropping]);

  const onBallLanded = useCallback(
    (ev: DropEvent, slot: number, multiplier: number) => {
      setPendingBalls((cur) => cur.filter((b) => b.id !== ev.id));
      setAnnounce(`Landed: ${multiplier}x`);
      if (isBigWin(slot)) {
        confetti({
          particleCount: 180,
          spread: 90,
          origin: { y: 0.7 },
          colors: ["#fde047", "#10b981", "#fbbf24", "#ffffff"],
          scalar: 1.1,
        });
      }
      if (multiplier >= 100) {
        setCameo({ show: true, multiplier });
        window.setTimeout(() => setCameo({ show: false, multiplier: 0 }), 5500);
      }
    },
    [],
  );

  const onLogout = useCallback(async () => {
    await fetch("/api/me", { method: "DELETE" });
    setMe({ user: null, cooldownRemainingMs: 0, cooldownSeconds: DEFAULT_COOLDOWN_SEC });
  }, []);

  // Keyboard: Space to drop when focus is on body
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      if (me.user && me.cooldownRemainingMs <= 0 && !dropping) void onDrop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dropping, me.cooldownRemainingMs, me.user, onDrop]);

  return (
    <>
      <ThemeBackground />

      {!loadingMe && !me.user && (
        <LoginCard
          onLoggedIn={(u) => setMe({ user: u, cooldownRemainingMs: 0, cooldownSeconds: DEFAULT_COOLDOWN_SEC })}
        />
      )}

      <main className="relative z-0 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[1400px] flex-col gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 220, damping: 14 }}
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-yellow-300/70 shadow-[0_0_18px_rgba(253,224,71,0.45)] sm:h-11 sm:w-11"
            >
              <Image
                src="/logo.png"
                alt="Lucky Penny logo"
                fill
                sizes="44px"
                priority
                className="object-cover"
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xl font-black gold-text sm:text-2xl"
            >
              Lucky Penny Day
            </motion.h1>
            <span className="hidden rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/80 sm:inline">
              Plinko · Burn · Solana
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/90">
            {TOKEN_MINT && (
              <button
                onClick={onCopyCA}
                title={`Copy contract address: ${TOKEN_MINT}`}
                aria-label="Copy contract address"
                className="group flex items-center gap-1.5 rounded-full border border-yellow-300/40 bg-black/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-yellow-200 transition hover:border-yellow-300/80 hover:bg-black/60 sm:text-xs"
              >
                <span className="hidden text-[10px] font-sans font-semibold uppercase tracking-widest text-white/60 sm:inline">
                  CA
                </span>
                <span>{shortenAddress(TOKEN_MINT)}</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                )}
              </button>
            )}

            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Lucky Penny on X"
              title="Follow @luckypennyfun on X"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/40 text-white/90 transition hover:border-white/40 hover:bg-black/60 sm:h-9 sm:w-9"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2H21.5l-7.51 8.58L23 22h-6.84l-5.36-7.01L4.6 22H1.34l8.04-9.19L1 2h6.99l4.84 6.39L18.244 2Zm-1.2 18h1.84L7.05 4H5.1l11.944 16Z" />
              </svg>
            </a>

            {me.user && (
              <>
                <span className="rounded-full bg-black/40 px-3 py-1 font-semibold">
                  {me.user.username}
                </span>
                <button
                  onClick={onLogout}
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/80 hover:bg-black/60"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </header>

        <div className="shrink-0">
          <StatsBar
            totalDrops={stats.totalDrops}
            totalSolOut={stats.totalSolOut}
            totalTokensBurned={stats.totalTokensBurned}
            biggestMultiplier={stats.biggestMultiplier}
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Board + drop button — stays inside its column with no scroll */}
          <section className="flex min-h-0 flex-col items-center justify-center gap-3">
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <div
                className="flex h-full max-h-full items-center justify-center"
                style={{ aspectRatio: "672 / 534" }}
              >
                <Board pending={pendingBalls} onBallLanded={onBallLanded} />
              </div>
            </div>
            <DropButton
              cooldownMs={me.cooldownRemainingMs}
              cooldownTotalMs={me.cooldownSeconds * 1000}
              onDrop={onDrop}
              disabled={!me.user}
              busy={dropping}
            />
          </section>

          {/* Live feed: side rail on desktop, hidden under lg (kept compact) */}
          <aside className="order-last hidden min-h-0 lg:order-none lg:block">
            <LiveFeed drops={feed} cluster={cluster} />
          </aside>
        </div>
      </main>

      {/* ARIA live region */}
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      <LeprechaunCameo show={cameo.show} multiplier={cameo.multiplier} />
    </>
  );
}
