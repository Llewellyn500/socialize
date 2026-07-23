type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        className="logo-mark__glyph"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6.5"
      >
        <rect
          width="28"
          height="15"
          x="6"
          y="28"
          rx="7.5"
          transform="rotate(-45 20 35.5)"
        />
        <rect
          width="28"
          height="15"
          x="30"
          y="20"
          rx="7.5"
          transform="rotate(-45 44 27.5)"
        />
      </g>
    </svg>
  );
}
