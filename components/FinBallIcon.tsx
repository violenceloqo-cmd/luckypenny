/** Fin ball — split blue sphere with dot eyes (Fin character motif). */
export default function FinBallIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const id = `fin-ball-${size}`;
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
        <linearGradient id={`${id}-blue`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#59B8F5" />
          <stop offset="100%" stopColor="#3A98D8" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="32%" cy="22%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-ball`}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
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
      <g filter={glow ? `url(#${id}-glow)` : undefined}>
        <circle cx="32" cy="32" r="26" fill="#E4F4FC" />
        <g clipPath={`url(#${id}-ball)`}>
          <path
            d="M6 32 C14 28, 18 36, 32 32 C46 28, 50 36, 58 32 L58 6 L6 6 Z"
            fill={`url(#${id}-blue)`}
          />
          <path
            d="M6 32 C14 36, 18 28, 32 32 C46 36, 50 28, 58 32 L58 58 L6 58 Z"
            fill="#E4F4FC"
          />
        </g>
        <circle cx="24" cy="28" r="2.2" fill="#1A1A1A" />
        <circle cx="40" cy="28" r="2.2" fill="#1A1A1A" />
        <path
          d="M28 36 Q32 39 36 36"
          stroke="#1A1A1A"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="32" cy="32" r="26" fill={`url(#${id}-shine)`} />
      </g>
    </svg>
  );
}
