import { cn } from "@/lib/utils";

/** Money-bag icon — matches the 3D Plinko drop sprite. */
export default function BountyBagIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn(
        glow &&
          "drop-shadow-[0_0_16px_rgba(74,222,128,0.4)] drop-shadow-[0_0_8px_rgba(245,197,24,0.5)]",
        className,
      )}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="bag-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(74,222,128,0.35)" />
          <stop offset="100%" stopColor="rgba(74,222,128,0)" />
        </radialGradient>
        <linearGradient id="bag-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe566" />
          <stop offset="40%" stopColor="#f5c518" />
          <stop offset="100%" stopColor="#5c3d1e" />
        </linearGradient>
        <linearGradient id="bag-neck" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#a67c2e" />
          <stop offset="100%" stopColor="#5c3d1e" />
        </linearGradient>
        <radialGradient id="bag-spec" cx="30%" cy="35%" r="25%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bag-glow)" />
      <ellipse cx="32" cy="54" rx="22" ry="6" fill="rgba(0,0,0,0.35)" />
      <path
        d="M18 22 C14 30 12 44 32 50 C52 44 50 30 46 22 C44 18 36 16 32 16 C28 16 20 18 18 22 Z"
        fill="url(#bag-body)"
        stroke="#5c3d1e"
        strokeWidth="1.2"
      />
      <ellipse cx="32" cy="20" rx="12" ry="5" fill="url(#bag-neck)" />
      <path
        d="M22 21 Q32 14 42 21"
        fill="none"
        stroke="#3d2810"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="17" r="4" fill="#5c3d1e" />
      <rect x="14" y="14" width="14" height="8" rx="1" fill="#85bb65" stroke="#3d9a5c" strokeWidth="0.8" transform="rotate(-18 21 18)" />
      <rect x="36" y="13" width="12" height="7" rx="1" fill="#85bb65" stroke="#3d9a5c" strokeWidth="0.8" transform="rotate(14 42 16)" />
      <rect x="18" y="30" width="28" height="10" rx="2" fill="rgba(61,154,92,0.45)" stroke="#3d9a5c" strokeWidth="0.6" />
      <ellipse cx="24" cy="30" rx="6" ry="10" fill="url(#bag-spec)" opacity="0.85" />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#0c140c"
        fontSize="18"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        $
      </text>
      <circle cx="44" cy="36" r="3" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.2" />
    </svg>
  );
}
