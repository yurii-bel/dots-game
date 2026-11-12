import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { APP_NAME } from "@dots/shared";
import { Button } from "@/components/ui/button";

/** Public landing — auth CTAs only; lobby lives at /lobby. */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Online 1v1
        </p>
        <h1 className="text-5xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-lg text-muted-foreground">
          Classic Спортивные точки — sign in to play.
        </p>
      </div>

      <SignedOut>
        <div className="flex flex-wrap gap-3">
          <SignInButton mode="modal" forceRedirectUrl="/lobby">
            <Button type="button">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/onboarding/nickname">
            <Button type="button" variant="outline">
              Sign up
            </Button>
          </SignUpButton>
        </div>
        <p className="text-sm text-muted-foreground">
          Email + password or Google. Nicknames are unique.
        </p>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" asChild>
            <Link href="/lobby">Enter lobby</Link>
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </main>
  );
}
