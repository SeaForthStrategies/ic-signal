import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: process.env.AUTH_JWT_AUDIENCE ?? "convex",
      issuer: process.env.AUTH_JWT_ISSUER!,
      jwks: `data:application/json,${encodeURIComponent(process.env.AUTH_JWKS!)}`,
      algorithm: "ES256",
    },
  ],
} satisfies AuthConfig;
