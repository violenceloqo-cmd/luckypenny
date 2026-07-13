import { featherPathD } from "@/lib/hoodFeather";

/** Glowing lime orb with the black feather mark — the SVG twin of the canvas sprite. */
export default function HoodBallIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const id = `hood-ball-${size}`;
  const featherScale = 26;
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
          <stop offset="0%" stopColor="#E9FF7A" />
          <stop offset="45%" stopColor="#CCFF00" />
          <stop offset="100%" stopColor="#8FB800" />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="30%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
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
        <path d={featherPathD(featherScale)} fill="#0B0B0B" />
      </g>
    </svg>
  );
}
