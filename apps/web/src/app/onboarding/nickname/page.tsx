"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NicknameSchema,
  type MeResponse,
} from "@dots/shared";
import { Button } from "@/components/ui/button";

type LoadError = { message: string; hint?: string };

export default function NicknameOnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setLoadError(null);
    setChecking(true);
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
            const body = (await res.json()) as { error?: string; hint?: string };
            if (body.error) message = body.error;
            if (body.hint) hint = body.hint;
          } catch {
            // non-JSON
          }
          setLoadError({ message, hint });
          setChecking(false);
          return;
        }
        const me = (await res.json()) as MeResponse;
        if (cancelled) return;
        if (me.nickname) {
          router.replace("/lobby");
          return;
        }
        setChecking(false);
      } catch {
        if (!cancelled) {
          setLoadError({
            message: "Could not reach the account service.",
            hint: "Check that the web app is running, then retry.",
          });
          setChecking(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router, attempt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = NicknameSchema.safeParse(nickname);
    if (!parsed.success) {
      setError(
        `Use ${NICKNAME_MIN_LENGTH}–${NICKNAME_MAX_LENGTH} characters: letters, digits, underscore.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/nickname", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: parsed.data }),
      });
      if (res.status === 409) {
        setError("That nickname is already taken.");
        return;
      }
      if (!res.ok) {
        let message = "Could not save nickname. Try again.";
        try {
          const body = (await res.json()) as { error?: string; hint?: string };
          if (body.error) message = body.error;
          if (body.hint) message = `${message} ${body.hint}`;
        } catch {
          // non-JSON
        }
        setError(message);
        return;
      }
      router.replace("/lobby");
    } catch {
      setError("Could not save nickname. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Account unavailable</h1>
        <p className="text-muted-foreground">{loadError.message}</p>
        {loadError.hint ? (
          <p className="rounded-md border border-border/80 bg-secondary/30 p-3 text-sm text-muted-foreground">
            {loadError.hint}
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

  if (checking) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a nickname</h1>
        <p className="text-muted-foreground">
          Unique in DOTS. {NICKNAME_MIN_LENGTH}–{NICKNAME_MAX_LENGTH} characters — letters,
          digits, underscore. You can change it later.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Nickname</span>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            autoFocus
            autoComplete="username"
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </main>
  );
}
