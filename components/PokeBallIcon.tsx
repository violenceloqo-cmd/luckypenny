/** Classic red-and-white Pokéball icon. */
export default function PokeBallIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const id = `poke-ball-${size}`;
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
        <radialGradient id={`${id}-red`} cx="38%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#FF5555" />
          <stop offset="55%" stopColor="#EE1515" />
          <stop offset="100%" stopColor="#C30A0A" />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="32%" cy="22%" r="45%">
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
        <clipPath id={`${id}-ball`}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
      </defs>
      <g filter={glow ? `url(#${id}-glow)` : undefined}>
        <circle cx="32" cy="32" r="26" fill="#F5F5F5" />
        <g clipPath={`url(#${id}-ball)`}>
          <rect x="6" y="6" width="52" height="26" fill={`url(#${id}-red)`} />
          <rect x="6" y="29" width="52" height="29" fill="#F5F5F5" />
          <rect x="6" y="29.5" width="52" height="5.5" fill="#1D1D1B" />
        </g>
        <circle cx="32" cy="32" r="7.5" fill="#F5F5F5" stroke="#1D1D1B" strokeWidth="2.8" />
        <circle cx="32" cy="32" r="2.8" fill="#F5F5F5" stroke="#1D1D1B" strokeWidth="1.4" />
        <circle cx="32" cy="32" r="26" fill={`url(#${id}-shine)`} />
      </g>
    </svg>
  );
}
