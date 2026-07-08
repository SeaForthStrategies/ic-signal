"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convex = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), [convexUrl]);

  if (!convex) {
    return children;
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexJwtAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

function useConvexJwtAuth() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session");
        const body = (await response.json().catch(() => null)) as { authenticated?: boolean } | null;
        if (active) setIsAuthenticated(Boolean(response.ok && body?.authenticated));
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadSession();
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    async function refreshSession() {
      try {
        const response = await fetch("/api/auth/session");
        const body = (await response.json().catch(() => null)) as { authenticated?: boolean } | null;
        setIsAuthenticated(Boolean(response.ok && body?.authenticated));
      } catch {
        setIsAuthenticated(false);
      }
    }
    window.addEventListener("focus", refreshSession);
    return () => window.removeEventListener("focus", refreshSession);
  }, []);

  const fetchAccessToken = useCallback(async () => {
    const response = await fetch("/api/auth/token");
    if (!response.ok) return null;
    const body = (await response.json()) as { token?: string };
    return body.token ?? null;
  }, []);

  return { fetchAccessToken, isAuthenticated, isLoading };
}
