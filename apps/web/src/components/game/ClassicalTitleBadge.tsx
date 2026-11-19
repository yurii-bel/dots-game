import {
  classicalTitleLabel,
  type ClassicalTitle,
} from "@dots/shared";
import { cn } from "@/lib/utils";

const TITLE_SET = new Set<string>(["N", "3", "2", "1", "C", "M", "H", "G"]);

function asTitle(value: string | null | undefined): ClassicalTitle | null {
  if (!value || !TITLE_SET.has(value)) return null;
  return value as ClassicalTitle;
}

type ClassicalTitleBadgeProps = {
  title: string | null | undefined;
  className?: string;
  /** Soft pulse once (e.g. lobby chip after first unlock). */
  pulse?: boolean;
};

/** Permanent Classical title letter — Match desk chip / leaderboard. */
export function ClassicalTitleBadge({
  title,
  className,
  pulse = false,
}: ClassicalTitleBadgeProps) {
  const letter = asTitle(title);
  if (!letter) {
    return (
      <span className={cn("tabular-nums text-muted-foreground", className)}>—</span>
    );
  }

  const label = classicalTitleLabel(letter);
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-sm border border-border/80 bg-secondary/70 font-mono text-xs font-semibold tracking-tight text-foreground",
        pulse && "animate-[title-unlock_720ms_ease-out_1]",
        className,
      )}
      title={`${label} · permanent Classical title`}
      aria-label={`Classical title ${letter} (${label})`}
    >
      {letter}
    </span>
  );
}
