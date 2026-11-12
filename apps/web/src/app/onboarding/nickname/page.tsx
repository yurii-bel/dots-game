"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NicknameSchema,
  type MeResponse,
} from "@dots/shared";
import { Button } from "@/components/ui/button";

export default function NicknameOnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

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
        if (me.nickname) {
          router.replace("/lobby");
          return;
        }
        setChecking(false);
      } catch {
        if (!cancelled) router.replace("/sign-in");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

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
        setError("Could not save nickname. Try again.");
        return;
      }
      router.replace("/lobby");
    } catch {
      setError("Could not save nickname. Try again.");
    } finally {
      setSubmitting(false);
    }
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
