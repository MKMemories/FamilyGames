interface LogoProps {
  size?: number;
  className?: string;
  /** unique gradient id suffix when several logos share a page */
  idSuffix?: string;
}

/** KHELIJ brand mark — a gradient "lucky die" with a gold sparkle. */
export function Logo({ size = 72, className = "", idSuffix = "a" }: LogoProps) {
  const g = `khg-${idSuffix}`;
  const s = `khs-${idSuffix}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`khelij-logo ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="KHELIJ"
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5b93" />
          <stop offset="0.55" stopColor="#b45cff" />
          <stop offset="1" stopColor="#7b5cff" />
        </linearGradient>
        <linearGradient id={s} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe89a" />
          <stop offset="1" stopColor="#ffb638" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="26" fill={`url(#${g})`} />
      <rect x="6" y="6" width="88" height="46" rx="26" fill="#ffffff" opacity="0.14" />
      <g fill="#ffffff">
        <circle cx="33" cy="33" r="6.5" />
        <circle cx="67" cy="33" r="6.5" />
        <circle cx="33" cy="67" r="6.5" />
        <circle cx="67" cy="67" r="6.5" />
      </g>
      <path
        className="khelij-logo-spark"
        d="M50 32 L55.5 44.5 L68 50 L55.5 55.5 L50 68 L44.5 55.5 L32 50 L44.5 44.5 Z"
        fill={`url(#${s})`}
      />
    </svg>
  );
}
