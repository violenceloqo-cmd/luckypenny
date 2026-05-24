"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
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
        <header className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
          {me.user && (
            <div className="flex items-center gap-2 text-sm text-white/90">
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
            </div>
          )}
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
