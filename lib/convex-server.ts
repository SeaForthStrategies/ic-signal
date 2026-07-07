import { ConvexHttpClient } from "convex/browser";

export function convexServer() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  }
  return new ConvexHttpClient(url);
}

export function getAuthServerSecret() {
  const secret = process.env.AUTH_API_SECRET;
  if (!secret) {
    throw new Error("AUTH_API_SECRET is not configured.");
  }
  return secret;
}
