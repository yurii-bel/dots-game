import { cn } from "@/lib/utils";

/** Board stone mid tones from `draw-board.ts` COLORS.blueMid / redMid. */
const BLUE = "#2563eb";
const RED = "#dc2626";

type DualDotSpinnerProps = {
  className?: string;
  /** Accessible label; defaults to “Finding match”. */
  label?: string;
  size?: "sm" | "md";
};

/**
 * Small red+blue dual-dot spinner for matchmaking / waiting states.
 * Two stones orbit a shared center — no lucide Loader, board palette only.
 */
export function DualDotSpinner({
  className,
  label = "Finding match",
  size = "md",
}: DualDotSpinnerProps) {
  const px = size === "sm" ? 16 : 20;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: px, height: px }}
    >
      <span className="sr-only">{label}</span>
      <span
        className="relative block size-full animate-[dual-dot-spin_0.9s_linear_infinite]"
        aria-hidden
      >
        <span
          className="absolute left-1/2 top-0 size-[38%] -translate-x-1/2 rounded-full"
          style={{ backgroundColor: BLUE }}
        />
        <span
          className="absolute bottom-0 left-1/2 size-[38%] -translate-x-1/2 rounded-full"
          style={{ backgroundColor: RED }}
        />
      </span>
    </span>
  );
}
