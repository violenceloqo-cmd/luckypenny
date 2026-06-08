"use client";

import { AnimatePresence, motion } from "framer-motion";

import PokeBallIcon from "@/components/PokeBallIcon";

interface CameoProps {
  show: boolean;
  multiplier: number;
}

function PokeCascade() {
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.1 }}
        >
          <PokeBallIcon size={36 + i * 8} />
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
          <PokeCascade />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="poke-badge mt-2 px-4 py-2 text-sm font-black"
          >
            {multiplier}x · LEGENDARY CATCH
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
