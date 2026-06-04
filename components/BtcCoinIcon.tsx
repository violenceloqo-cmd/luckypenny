import Image from "next/image";

/** Official BTC logo (black keyed out on dark UI via blend). */
export default function BtcCoinIcon({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <Image
      src="/btc-logo.png"
      alt=""
      width={size}
      height={size}
      className={`object-contain mix-blend-lighten ${glow ? "drop-shadow-[0_0_12px_rgba(247,147,26,0.55)]" : ""} ${className}`}
      aria-hidden="true"
    />
  );
}
