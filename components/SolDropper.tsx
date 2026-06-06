"use client";

import { motion } from "framer-motion";

import SolanaBallIcon from "@/components/SolanaBallIcon";

/** Solana orb above the board — drops into the Plinko field. */
export default function SolDropper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col items-center">
      <motion.div
        className="relative z-20 flex shrink-0 flex-col items-center"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative h-14 w-14 sm:h-16 sm:w-16">
          <SolanaBallIcon size={56} glow className="relative z-10 h-full w-full" />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-full z-0 -translate-x-1/2"
            style={{
              width: 16,
              height: 44,
              background:
                "linear-gradient(to bottom, rgba(153,69,255,0), rgba(0,209,255,0.45) 40%, rgba(20,241,149,0.65))",
              borderRadius: "50% / 14%",
              filter: "blur(1px)",
            }}
            animate={{ height: [28, 48, 28], opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2"
            animate={{ y: [0, 42, 0], opacity: [0.12, 1, 0.08], scale: [0.75, 1.08, 0.75] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <SolanaBallIcon size={22} glow />
          </motion.div>
        </div>
        <p
          className="mt-2 text-center text-[9px] font-bold uppercase tracking-[0.22em] text-[#00D1FF]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          SOL chute · Drop to burn
        </p>
      </motion.div>

      <div className="sol-board relative z-10 -mt-1 min-h-0 w-full flex-1">{children}</div>
    </div>
  );
}
