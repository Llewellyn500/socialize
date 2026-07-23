"use client";

import { useEffect } from "react";
import { isMotionReduced } from "@/lib/motion";

export function MarketingCursor() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (isMotionReduced()) return;

    const cursor = document.querySelector<HTMLElement>(".custom-cursor");
    const root = document.documentElement;
    if (!cursor) return;

    root.dataset.customCursor = "true";

    const onMove = (event: PointerEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };

    const onOver = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest(
        "a, button, summary, [role='button'], label[for], input:not([type='hidden']), textarea, select",
      );
      cursor.classList.toggle("is-active", Boolean(interactive));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });

    return () => {
      delete root.dataset.customCursor;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
    };
  }, []);

  return <span className="custom-cursor" aria-hidden="true" />;
}
