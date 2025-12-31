import { create } from "zustand";

export interface ScratchpadEntry {
  id: string;
  timestamp: Date;
  thought: string;
  analyzeMoves?: string[];
  analysisResult?: {
    score: number | null;
    mate: number | null;
    bestMove: string | null;
    pv: string[];
  };
}

interface ScratchpadStore {
  entries: ScratchpadEntry[];
  addEntry: (entry: Omit<ScratchpadEntry, "id" | "timestamp">) => void;
  clearEntries: () => void;
}

export const useScratchpadStore = create<ScratchpadStore>((set) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({
      entries: [
        ...state.entries,
        {
          ...entry,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date(),
        },
      ],
    })),

  clearEntries: () => set({ entries: [] }),
}));
