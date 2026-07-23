"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";

const TICKER_ITEMS = [
  "LINKS THAT LOOK LIKE YOU",
  "GITHUB ACTIVITY ON YOUR PAGE",
  "SOCIALS UNDER YOUR BIO",
  "BUILT FOR DEVELOPERS",
] as const;

function TickerItems() {
  return (
    <>
      {TICKER_ITEMS.map((item) => (
        <Fragment key={item}>
          <span>{item}</span>
          <i>✳</i>
        </Fragment>
      ))}
    </>
  );
}

export function SignalTicker() {
  const setRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(4);

  useEffect(() => {
    function update() {
      const setWidth = setRef.current?.offsetWidth ?? 0;
      if (!setWidth) return;
      const needed = Math.max(2, Math.ceil((window.innerWidth * 2) / setWidth));
      setCopies(needed);
    }

    update();

    const observer = new ResizeObserver(update);
    if (setRef.current) observer.observe(setRef.current);

    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const duration = Math.max(18, copies * 5);

  return (
    <div className="signal-ticker" aria-hidden="true">
      <div
        className="signal-ticker-track"
        style={
          {
            "--marquee-copies": copies,
            animationDuration: `${duration}s`,
          } as CSSProperties
        }
      >
        {Array.from({ length: copies }, (_, index) => (
          <div
            className="signal-ticker-set"
            key={index}
            ref={index === 0 ? setRef : undefined}
            aria-hidden={index > 0 ? true : undefined}
          >
            <TickerItems />
          </div>
        ))}
      </div>
    </div>
  );
}
