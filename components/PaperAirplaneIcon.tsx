/** Shared paper-airplane SVG used in header, buttons, and cameo. */
export default function PaperAirplaneIcon({
  size = 32,
  className = "",
  fold = "#e63946",
}: {
  size?: number;
  className?: string;
  fold?: string;
}) {
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
      <path
        d="M4 32 L58 8 L38 32 L58 56 Z"
        fill="#fffef9"
        stroke="#0f2744"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M4 32 L38 32 L58 8" fill="#dbeafe" stroke="#0f2744" strokeWidth="1.5" />
      <path d="M38 32 L58 56" fill="#bfdbfe" stroke="#0f2744" strokeWidth="1.5" />
      <path d="M12 32 L38 32" stroke={fold} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
