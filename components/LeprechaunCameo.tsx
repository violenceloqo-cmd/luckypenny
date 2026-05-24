"use client";

import { AnimatePresence, motion } from "framer-motion";

interface CameoProps {
  show: boolean;
  multiplier: number;
}

function Leprechaun() {
  return (
    <svg width="160" height="200" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      {/* Hat */}
      <rect x="35" y="10" width="90" height="20" fill="#0f4d18" stroke="#000" />
      <rect x="20" y="30" width="120" height="10" fill="#0f4d18" stroke="#000" />
      <rect x="55" y="35" width="50" height="6" fill="#fde047" stroke="#000" />
      <rect x="68" y="20" width="24" height="8" fill="#fde047" stroke="#000" />
      {/* Hair */}
      <path d="M30 40 q-6 20 0 50" stroke="#b45309" strokeWidth="6" fill="none" />
      <path d="M130 40 q6 20 0 50" stroke="#b45309" strokeWidth="6" fill="none" />
      {/* Face */}
      <ellipse cx="80" cy="70" rx="38" ry="36" fill="#f4d4a8" stroke="#000" />
      {/* Beard */}
      <path d="M50 80 q30 40 60 0 q-5 30 -30 35 q-25 -5 -30 -35z" fill="#e07a3a" stroke="#000" />
      {/* Eyes */}
      <circle cx="68" cy="65" r="3" fill="#000" />
      <circle cx="92" cy="65" r="3" fill="#000" />
      {/* Smile */}
      <path d="M70 80 q10 10 20 0" stroke="#000" strokeWidth="2" fill="none" />
      {/* Body */}
      <rect x="55" y="110" width="50" height="60" fill="#1f6b27" stroke="#000" />
      <rect x="55" y="120" width="50" height="6" fill="#fde047" stroke="#000" />
      {/* Arms */}
      <rect x="30" y="115" width="25" height="10" fill="#1f6b27" stroke="#000" />
      <rect x="105" y="115" width="25" height="10" fill="#1f6b27" stroke="#000" />
      {/* Hands holding gold */}
      <circle cx="22" cy="120" r="8" fill="#f4d4a8" stroke="#000" />
      <circle cx="138" cy="120" r="8" fill="#f4d4a8" stroke="#000" />
      {/* Boots */}
      <rect x="55" y="170" width="22" height="15" fill="#4f2f15" stroke="#000" />
      <rect x="83" y="170" width="22" height="15" fill="#4f2f15" stroke="#000" />
    </svg>
  );
}

function PotOfGold() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="35" rx="50" ry="12" fill="#fbbf24" stroke="#000" />
      <circle cx="35" cy="25" r="10" fill="#fde047" stroke="#000" />
      <circle cx="60" cy="20" r="11" fill="#fde047" stroke="#000" />
      <circle cx="85" cy="25" r="10" fill="#fde047" stroke="#000" />
      <path d="M10 38 q10 60 50 60 q40 0 50 -60 z" fill="#1f2937" stroke="#000" strokeWidth="2" />
      <ellipse cx="60" cy="38" rx="50" ry="8" fill="#0f1117" />
    </svg>
  );
}

export default function LeprechaunCameo({ show, multiplier }: CameoProps) {
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
          <motion.div
            animate={{ rotate: [0, -4, 4, -4, 0] }}
            transition={{ duration: 1.2, repeat: 2 }}
          >
            <Leprechaun />
          </motion.div>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <PotOfGold />
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="-mt-2 rounded-xl border-2 border-amber-700 bg-gradient-to-b from-yellow-200 to-amber-500 px-3 py-1 text-sm font-black text-black shadow-lg"
          >
            {multiplier}x! POT O&apos; GOLD!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
