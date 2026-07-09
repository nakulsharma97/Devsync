import { ConvexReactClient } from "convex/react";

let _client: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
  if (!_client) {
    const url = import.meta.env.VITE_CONVEX_URL;
    if (!url) {
      console.warn("VITE_CONVEX_URL is not set. Creating dummy client.");
      // Return a dummy that won't crash the app
      return new ConvexReactClient("https://placeholder.convex.cloud");
    }
    _client = new ConvexReactClient(url);
  }
  return _client;
}

export const convexClient = getConvexClient();
