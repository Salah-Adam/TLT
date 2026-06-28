//  a small Zustand store to read and change the language app-wide. In Step 2 we'll call setLanguage automatically with the logged-in user's account language.


import { create } from "zustand";
import i18n from "../i18n";

type Lang = "en" | "so";
type State = { language: Lang; setLanguage: (l: Lang) => void };

export const useLanguage = create<State>((set) => ({
  language: (i18n.language as Lang) ?? "so",
  setLanguage: (l) => {
    i18n.changeLanguage(l);
    set({ language: l });
  },
}));