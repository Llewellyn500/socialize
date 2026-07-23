"use client";

import { usePathname } from "next/navigation";
import { MarketingCursor } from "@/components/marketing-cursor";

export function SiteCursor() {
  const pathname = usePathname();

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return null;
  }

  return <MarketingCursor />;
}
