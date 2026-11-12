"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { MeResponse } from "@dots/shared";
import { Button } from "@/components/ui/button";

type AccountError = {
  message: string;
  hint?: string;
};

/**
 * Ensures Prisma user exists via /api/me and redirects to nickname onboarding when null.
 * On DB/API failure shows a visible error (no sign-in redirect loop / blank page).
 */
export function RequireNickname({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<AccountError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setReady(false);
    setAttempt((n) => n + 1);
  }, []);

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
        if (cancelled) return;

        if (res.status === 401) {
          router.replace("/sign-in");
          return;
        }

        if (!res.ok) {
          let message = "Could not load your account.";
          let hint: string | undefined;
          try {
            const body = (await res.json()) as {
              error?: string;
              hint?: string;
            };
            if (body.error) message = body.error;
            if (body.hint) hint = body.hint;
          } catch {
            // non-JSON error body
          }
          setError({ message, hint });
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
        if (!cancelled) {
          setError({
            message: "Could not reach the account service.",
            hint: "Check that the web app is running, then retry.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router, attempt]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Account unavailable</h1>
        <p className="text-muted-foreground">{error.message}</p>
        {error.hint ? (
          <p className="rounded-md border border-border/80 bg-secondary/30 p-3 text-sm text-muted-foreground">
            {error.hint}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={retry}>
            Retry
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading account…</p>
      </main>
    );
  }

  return <>{children}</>;
}
