import type { ThemeMode } from "../hooks/useTheme";

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      title="Thème clair / sombre"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
