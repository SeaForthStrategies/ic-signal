import { SignJWT, importPKCS8 } from "jose";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

function getJwtConfig() {
  const issuer = process.env.AUTH_JWT_ISSUER;
  const audience = process.env.AUTH_JWT_AUDIENCE ?? "convex";
  const privateKey = process.env.AUTH_JWT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const jwks = process.env.AUTH_JWKS ? JSON.parse(process.env.AUTH_JWKS) as { keys?: Array<{ kid?: string }> } : null;
  const kid = jwks?.keys?.[0]?.kid;

  if (!issuer || !privateKey || !kid) {
    throw new Error("JWT auth is not configured.");
  }

  return { audience, issuer, kid, privateKey };
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { audience, issuer, kid, privateKey } = getJwtConfig();
  const key = await importPKCS8(privateKey, "ES256");
  const token = await new SignJWT({
    email: session.email,
    name: session.name,
    role: session.role,
    workspaceId: session.workspaceId,
    workspaceName: session.workspaceName,
  })
    .setProtectedHeader({ alg: "ES256", kid, typ: "JWT" })
    .setAudience(audience)
    .setExpirationTime("15m")
    .setIssuedAt()
    .setIssuer(issuer)
    .setSubject(session.userId)
    .sign(key);

  return NextResponse.json({ token });
}
