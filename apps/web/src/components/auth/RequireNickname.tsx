"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { MeResponse } from "@dots/shared";

/**
 * Ensures Prisma user exists via /api/me and redirects to nickname onboarding when null.
 */
export function RequireNickname({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) {
          router.replace("/sign-in");
          return;
        }
        const me = (await res.json()) as MeResponse;
        if (cancelled) return;
        if (!me.nickname) {
          router.replace("/onboarding/nickname");
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) router.replace("/sign-in");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </main>
    );
  }

  return <>{children}</>;
}
