"use client";

import { AnimatePresence, motion } from "framer-motion";

import SolanaBallIcon from "@/components/SolanaBallIcon";

interface CameoProps {
  show: boolean;
  multiplier: number;
}

function BallCascade() {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -10, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
        >
          <SolanaBallIcon size={40 + i * 10} />
        </motion.div>
      ))}
    </div>
  );
}

export default function WinCameo({ show, multiplier }: CameoProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 120, y: 40 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 120 }}
          transition={{ type: "spring", stiffness: 90, damping: 14 }}
          className="pointer-events-none fixed bottom-3 right-3 z-20 flex flex-col items-end"
          aria-hidden="true"
        >
          <BallCascade />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="sol-badge mt-2 px-4 py-2 text-sm font-black"
          >
            {multiplier}x · MEGA DROP
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
