import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseServices } from "@/lib/firebase";

export async function hasOwnerAccess(user: User): Promise<boolean> {
  const services = getFirebaseServices();
  if (!services) return false;

  const ownerDocument = await getDoc(doc(services.db, "owners", user.uid));
  return ownerDocument.exists() && ownerDocument.data().enabled === true;
}
