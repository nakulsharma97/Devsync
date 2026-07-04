import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.warn(
    "VITE_CONVEX_URL is not set. Convex client will not be functional.",
  );
}

export const convexClient = new ConvexReactClient(CONVEX_URL!);
