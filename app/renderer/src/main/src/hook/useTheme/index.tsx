import { create } from "zustand";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export const useTheme = create<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>((set) => {
  const loadedTheme = (localStorage.getItem("theme") as Theme) || "light";
  applyTheme(loadedTheme);

  return {
    theme: loadedTheme,
    setTheme: (theme: Theme) => {
      applyTheme(theme);
      set({ theme });
    },
  };
});
