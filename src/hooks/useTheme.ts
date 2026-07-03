import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";
const KEY = "khelij-theme";

export function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  } catch { /* ignore */ }
  return "light";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Theme state synced to <html data-theme> + localStorage. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = () => setThemeState(t => (t === "light" ? "dark" : "light"));
  return { theme, setTheme: setThemeState, toggle };
}
