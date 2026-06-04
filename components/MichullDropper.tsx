"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import BtcCoinIcon from "@/components/BtcCoinIcon";

/** Michull Sellor perched above the burning Plinko furnace, dropping BTC. */
export default function MichullDropper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col items-center">
      <motion.div
        className="relative z-20 flex shrink-0 flex-col items-center"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative">
          <Image
            src="/michull-saylor.png"
            alt="Michull Sellor"
            width={108}
            height={108}
            className="rounded-lg object-contain drop-shadow-[0_0_28px_rgba(247,147,26,0.55)]"
            priority
          />
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 36, 0], opacity: [0.2, 1, 0.15], scale: [0.85, 1, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <BtcCoinIcon size={22} glow />
          </motion.div>
        </div>
        <p
          className="mt-2 text-center text-[9px] font-bold uppercase tracking-[0.22em] text-[#f7931a]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Michull Sellor · Liquidating BTC
        </p>
      </motion.div>

      <div className="burn-furnace relative z-10 -mt-1 min-h-0 w-full flex-1">{children}</div>
    </div>
  );
}
