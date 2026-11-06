/** Named SFX cues → public URLs. Swap files under `public/sounds/` without code changes. */
export const SFX = {
  placeDot: "/sounds/place-dot.ogg",
} as const;

export type SoundCue = keyof typeof SFX;
