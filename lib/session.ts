const sessionCookieName = "fw_session";
const sessionDurationMs = 1000 * 60 * 60 * 12;

type SessionPayload = {
  email: string;
  exp: number;
  name?: string;
  role?: "owner" | "admin" | "member" | "viewer";
  userId?: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
};

function base64UrlEncode(input: string | ArrayBuffer) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

function base64DecodeBytes(input: string) {
  return Uint8Array.from(atob(input), (char) => char.charCodeAt(0));
}

async function hmac(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(signature);
}

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

export function getSessionCookieName() {
  return sessionCookieName;
}

export function getSessionDurationSeconds() {
  return Math.floor(sessionDurationMs / 1000);
}

export async function createSessionToken(session: Omit<SessionPayload, "exp"> | string) {
  const payload: SessionPayload = {
    ...(typeof session === "string" ? { email: session } : session),
    exp: Date.now() + sessionDurationMs,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmac(body, getSessionSecret());
  return `${body}.${signature}`;
}

export function getSessionTokenFromRequest(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${getSessionCookieName()}=`));
  return cookie?.split("=")[1] ?? null;
}

export async function getSessionFromRequest(request: Request) {
  return await verifySessionToken(getSessionTokenFromRequest(request));
}

export async function hashPassword(password: string) {
  const iterations = 310000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { hash: "SHA-256", iterations, name: "PBKDF2", salt },
    key,
    256,
  );
  return `pbkdf2_sha256$${iterations}$${base64UrlEncode(salt.buffer)}$${base64UrlEncode(derived)}`;
}

export async function hashResetToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64UrlEncode(digest);
}

export async function verifySessionToken(token?: string | null) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = await hmac(body, getSessionSecret());
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload;
    if (!payload.email || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsValue, saltValue, hashValue] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsValue || !saltValue || !hashValue) return false;

  const iterations = Number(iterationsValue);
  const salt = base64DecodeBytes(saltValue);
  const expected = base64DecodeBytes(hashValue);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { hash: "SHA-256", iterations, name: "PBKDF2", salt },
    key,
    expected.length * 8,
  );
  const actual = new Uint8Array(derived);
  if (actual.length !== expected.length) return false;

  let mismatch = 0;
  actual.forEach((byte, index) => {
    mismatch |= byte ^ expected[index];
  });
  return mismatch === 0;
}
