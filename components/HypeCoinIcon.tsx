import { HYPE_LOGO_D, HYPE_MINT, HYPE_BG, HYPE_BG_DEEP } from "@/lib/hypeLogo";

/** Glowing Hyperliquid coin with the HYPE blob mark. */
export default function HypeCoinIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const id = `hype-coin-${size}`;
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
        <radialGradient id={`${id}-disc`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#1f5550" />
          <stop offset="55%" stopColor={HYPE_BG} />
          <stop offset="100%" stopColor={HYPE_BG_DEEP} />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#b8fff0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#b8fff0" stopOpacity="0" />
        </radialGradient>
        {glow && (
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
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
        fill={`url(#${id}-disc)`}
        stroke={HYPE_MINT}
        strokeWidth="1.5"
        strokeOpacity="0.5"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <circle cx="32" cy="32" r="26" fill={`url(#${id}-shine)`} />
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        stroke={HYPE_MINT}
        strokeWidth="0.75"
        strokeOpacity="0.2"
      />
      <g transform="translate(32, 32) scale(38, 21)">
        <path d={HYPE_LOGO_D} fill={HYPE_MINT} />
      </g>
    </svg>
  );
}
