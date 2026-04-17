"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type Theme,
  resolveTheme,
  setThemeCookie,
  setThemeStorage,
  getThemeFromStorage,
  getSystemTheme,
  THEMES,
} from "@/lib/theme";

const ROUTE_THEMES: Record<string, Theme> = {
  "/movie": "dark",
  "/docs": "light",
};

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light" | "high-contrast";
  setTheme: (theme: Theme) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
  themes: THEMES,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface Props {
  children: ReactNode;
  initialTheme: Theme;
}

export default function ThemeProvider({ children, initialTheme }: Props) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<
    "dark" | "light" | "high-contrast"
  >(resolveTheme(initialTheme));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getThemeFromStorage();
    if (stored !== initialTheme) {
      applyTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    for (const [route, routeTheme] of Object.entries(ROUTE_THEMES)) {
      if (path.startsWith(route)) {
        applyTheme(routeTheme);
        return;
      }
    }
  }, []);

  function applyTheme(newTheme: Theme) {
  const resolved = resolveTheme(newTheme);
  setThemeState(newTheme);
  setResolvedTheme(resolved);

  const root = document.documentElement;
  
  // Remove ALL theme classes first
  root.classList.remove("theme-dark", "theme-light", "theme-high-contrast");
  
  // Set new theme
  root.setAttribute("data-theme", resolved);
  root.classList.add(`theme-${resolved}`);

  setThemeCookie(newTheme);
  setThemeStorage(newTheme);
}

  const setTheme = useCallback((newTheme: Theme) => {
    applyTheme(newTheme);
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, themes: THEMES }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={resolvedTheme}
          initial={prefersReducedMotion ? false : { opacity: 0.85 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 20, duration: 0.3 }
          }
          style={{ minHeight: "100%" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}