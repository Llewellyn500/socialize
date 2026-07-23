"use client";

import { AppLoadingState } from "@/components/app-loading-state";

export function ProfileLoadingState({ handle }: { handle: string }) {
  return (
    <AppLoadingState
      description={handle ? `Connecting @${handle} on Socialize…` : "Connecting to Socialize…"}
      embedded
      label="Loading profile"
      title="Loading profile."
    />
  );
}
