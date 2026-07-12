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
      <g transform="matrix(1.211111 0 0 1.211111 -6.755556 -6.755556)">
        <path
          className="logo-mark__bracket"
          d="M23 9.5 9.5 32 23 54.5M41 9.5 54.5 32 41 54.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5.5"
        />
      </g>
      <g transform="matrix(0.887531 0 0 0.887531 3.599016 3.599016)">
        <circle className="logo-mark__person" cx="32" cy="23" r="5.5" fill="currentColor" />
        <path
          className="logo-mark__person"
          d="M21.5 46.5c0-9.3 4.7-15 10.5-15s10.5 5.7 10.5 15"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="5.5"
        />
      </g>
    </svg>
  );
}
