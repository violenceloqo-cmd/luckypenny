import { solLogoPathD } from "@/lib/solLogo";

/** Glowing Solana orb with the SOL logo mark on the ball. */
export default function SolanaBallIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const id = `sol-ball-${size}`;
  const logoScale = 22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-sphere`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#14F195" />
          <stop offset="45%" stopColor="#00D1FF" />
          <stop offset="100%" stopColor="#9945FF" />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {glow && (
          <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <circle
        cx="32"
        cy="32"
        r="26"
        fill={`url(#${id}-sphere)`}
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <circle cx="32" cy="32" r="26" fill={`url(#${id}-shine)`} />
      <g transform="translate(32, 32)">
        <path d={solLogoPathD(logoScale)} fill="rgba(255,255,255,0.95)" />
      </g>
    </svg>
  );
}
