import { create } from "zustand";

type UiState = {
  socketHint: string;
  setSocketHint: (value: string) => void;
};

/** Minimal Zustand store — placeholder until lobby / match UI exists. */
export const useUiStore = create<UiState>((set) => ({
  socketHint: "Idle (scaffold)",
  setSocketHint: (socketHint) => set({ socketHint }),
}));
