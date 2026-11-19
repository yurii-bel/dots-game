import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { APP_NAME } from "@dots/shared";
import { Button } from "@/components/ui/button";

/** Public landing — Match desk brand + auth CTAs; lobby lives at /lobby. */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex animate-[match-desk-in_420ms_ease-out_both] flex-col items-center text-center">
        <h1 className="font-sans text-6xl font-semibold tracking-[0.18em] text-foreground sm:text-7xl">
          {APP_NAME}
        </h1>
        <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
          Classic Спортивные точки — sign in to play online 1v1.
        </p>
      </header>

      <Show when="signed-out">
        <div
          className="flex w-full animate-[match-desk-in_420ms_ease-out_both] flex-col gap-3"
          style={{ animationDelay: "80ms" }}
        >
          <SignInButton mode="modal" forceRedirectUrl="/lobby">
            <Button type="button" size="lg" className="w-full transition-transform active:scale-[0.98]">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/onboarding/nickname">
            <Button type="button" variant="outline" className="w-full">
              Sign up
            </Button>
          </SignUpButton>
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Email + password or Google. Nicknames are unique.
          </p>
        </div>
      </Show>

      <Show when="signed-in">
        <div
          className="flex w-full animate-[match-desk-in_420ms_ease-out_both] flex-col items-center gap-4"
          style={{ animationDelay: "80ms" }}
        >
          <Button type="button" size="lg" className="w-full transition-transform active:scale-[0.98]" asChild>
            <Link href="/lobby">Enter lobby</Link>
          </Button>
          <UserButton />
        </div>
      </Show>

      <nav
        className="flex animate-[match-desk-in_420ms_ease-out_both] gap-4 text-sm"
        style={{ animationDelay: "140ms" }}
        aria-label="Public links"
      >
        <Link
          href="/leaderboard"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Leaderboard
        </Link>
        <Link
          href="/faq"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Rating FAQ
        </Link>
      </nav>
    </main>
  );
}
