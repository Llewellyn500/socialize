import type { Metadata } from "next";
import { ManageProfile } from "@/components/manage-profile";
import { OwnerGate } from "@/components/owner-gate";

export const metadata: Metadata = {
  title: "Manage profile",
  robots: { index: false, follow: false },
};

export default function ManagePage() {
  return (
    <OwnerGate>
      <ManageProfile />
    </OwnerGate>
  );
}
