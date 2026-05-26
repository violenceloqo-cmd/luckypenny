"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import PaperAirplaneIcon from "@/components/PaperAirplaneIcon";

interface LoginCardProps {
  onLoggedIn: (user: { uid: string; username: string }) => void;
}

export default function LoginCard({ onLoggedIn }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setSubmitting(false);
        return;
      }
      onLoggedIn({ uid: data.uid, username: data.username });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#0f2744]/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="glass relative w-full max-w-md rounded-3xl p-7 text-white"
      >
        <div className="mb-5 flex flex-col items-center gap-3">
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [-8, 8, -8] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <PaperAirplaneIcon size={56} />
          </motion.div>
          <h1
            className="text-center text-2xl font-normal fold-text"
            style={{ fontFamily: "var(--font-bungee)" }}
          >
            National Paper Airplane Day
          </h1>
        </div>

        <p className="mb-6 text-center text-sm opacity-90">
          Pick a callsign, launch one paper airplane per minute, and watch each flight multiply
          SOL into a live pump.fun buy &amp; burn on Solana.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest opacity-80" htmlFor="username">
            Pilot name
          </label>
          <input
            id="username"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="3–16 letters, numbers, underscore"
            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-sky-300 focus:outline-none"
            maxLength={16}
            required
          />

          {error && (
            <div className="rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || username.length < 3}
            className="btn-launch mt-2 rounded-xl px-4 py-3 font-extrabold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Boarding…" : "Enter the Hangar"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] opacity-60">
          No password. Your pilot name is public — pick a unique one.
        </p>
      </motion.div>
    </div>
  );
}
