"use client";

import { AnimatePresence, motion } from "framer-motion";

import PaperAirplaneIcon from "@/components/PaperAirplaneIcon";

interface CameoProps {
  show: boolean;
  multiplier: number;
}

function Squadron() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -8, 0], rotate: [-12 + i * 8, 12 - i * 8, -12 + i * 8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
        >
          <PaperAirplaneIcon size={48 + i * 8} />
        </motion.div>
      ))}
    </div>
  );
}

export default function FlightCameo({ show, multiplier }: CameoProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 200, y: 50 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 200 }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
          className="pointer-events-none fixed bottom-2 right-2 z-20 flex flex-col items-end"
          aria-hidden="true"
        >
          <Squadron />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-2 rounded-xl border-2 border-blue-700 bg-gradient-to-b from-sky-100 to-blue-500 px-4 py-2 text-sm font-black text-blue-950 shadow-lg"
          >
            {multiplier}x! ACE FLIGHT!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
