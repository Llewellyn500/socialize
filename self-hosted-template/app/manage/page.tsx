import { ManageProfile } from "@/components/manage-profile";
import { OwnerGate } from "@/components/owner-gate";

export default function ManagePage() {
  return (
    <OwnerGate>
      <ManageProfile />
    </OwnerGate>
  );
}
