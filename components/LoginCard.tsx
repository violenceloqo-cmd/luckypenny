"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import BountyBagIcon from "@/components/BountyBagIcon";

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
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#060a06]/85 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="glass relative w-full max-w-md overflow-hidden rounded-2xl p-7 text-white"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4ade80] to-transparent"
          aria-hidden="true"
        />

        <div className="mb-5 flex flex-col items-center gap-3">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <BountyBagIcon size={72} />
          </motion.div>
          <h1
            className="text-center text-2xl font-bold bounty-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            BOUNTY DROP
          </h1>
          <p className="text-center text-[11px] uppercase tracking-[0.25em] text-white/45">
            Cash bags · Buy &amp; Burn
          </p>
        </div>

        <p className="mb-6 text-center text-sm text-white/65">
          Pick a handle and drop money bags through the board every minute. Where you land sets the
          multiplier on a live pump.fun buy &amp; on-chain burn.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-[10px] uppercase tracking-widest text-white/45" htmlFor="username">
            Bounty handle
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
            className="w-full rounded-lg border border-[#4ade80]/25 bg-[#0c140c]/80 px-4 py-3 font-mono text-sm text-white placeholder:text-white/25 focus:border-[#f5c518]/55 focus:outline-none focus:ring-1 focus:ring-[#f5c518]/30"
            maxLength={16}
            required
          />

          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || username.length < 3}
            className="btn-drop mt-2 rounded-lg px-4 py-3 font-extrabold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Entering…" : "Enter Vault"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-white/35">
          No password. Your handle is public — pick a unique one.
        </p>
      </motion.div>
    </div>
  );
}
