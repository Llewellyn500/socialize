type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="logo-mark__bracket"
        d="M11.25 4.75 4.75 16l6.5 11.25M20.75 4.75 27.25 16l-6.5 11.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.75"
      />
      <circle className="logo-mark__person" cx="16" cy="11.5" r="2.75" fill="currentColor" />
      <path
        className="logo-mark__person"
        d="M10.75 23.25c0-4.65 2.35-7.5 5.25-7.5s5.25 2.85 5.25 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.75"
      />
    </svg>
  );
}
