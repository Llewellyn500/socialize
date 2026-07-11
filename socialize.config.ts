import { demoProfile, type ProfileConfig } from "./lib/profile";

/**
 * The portable Socialize profile format.
 *
 * Hosted accounts store this shape in Firestore. The self-hosted edition uses
 * this file as its seed and supports importing/exporting the same JSON shape.
 */
const profile = {
  ...demoProfile,
  handle: "your-handle",
  displayName: "Your name",
  role: "Developer · builder · human",
  bio: "Tell people what you build and why it matters.",
} satisfies ProfileConfig;

export default profile;
