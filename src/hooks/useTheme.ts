
import { useEffect, useState } from "react";
export type Theme = "light" | "dark";
const STORAGE_KEY = "rowmora-theme";
function getInitialTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);
  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }
  return { theme, toggleTheme };
}
