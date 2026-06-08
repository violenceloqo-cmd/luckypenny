"use client";

import { motion } from "framer-motion";

import BountyBagIcon from "@/components/BountyBagIcon";

/** Bounty bag perched above the board — drops into the reward Plinko. */
export default function BountyDropper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col items-center">
      <motion.div
        className="relative z-20 flex shrink-0 flex-col items-center"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative h-14 w-14 sm:h-16 sm:w-16">
          <BountyBagIcon size={56} glow className="relative z-10 h-full w-full" />
          {/* Fall streak (matches canvas drop model) */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-full z-0 -translate-x-1/2"
            style={{
              width: 18,
              height: 48,
              background:
                "linear-gradient(to bottom, rgba(74,222,128,0), rgba(74,222,128,0.35) 35%, rgba(245,197,24,0.55) 70%, rgba(255,229,102,0.75))",
              borderRadius: "50% / 12%",
              filter: "blur(1px)",
            }}
            animate={{ height: [32, 52, 32], opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2"
            animate={{ y: [0, 44, 0], opacity: [0.12, 1, 0.08], scale: [0.75, 1.08, 0.75] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <BountyBagIcon size={22} glow />
          </motion.div>
        </div>
        <p
          className="mt-2 text-center text-[9px] font-bold uppercase tracking-[0.22em] text-[#4ade80]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bounty chute · Drop the bag
        </p>
      </motion.div>

      <div className="bounty-board relative z-10 -mt-1 min-h-0 w-full flex-1">{children}</div>
    </div>
  );
}
