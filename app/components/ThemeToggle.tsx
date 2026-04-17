"use client";

import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import type { Theme } from "@/lib/theme";

const THEME_ICONS: Record<string, string> = {
  dark: "🌙",
  light: "☀️",
  "high-contrast": "⬛",
  auto: "🖥️",
};

const THEME_LABELS: Record<string, string> = {
  dark: "Dark",
  light: "Light",
  "high-contrast": "High Contrast",
  auto: "Auto",
};

export default function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme();

  function cycleTheme() {
    const idx = themes.indexOf(theme);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next as Theme);
  }

  return (
    <motion.button
      onClick={cycleTheme}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      aria-label={`Current theme: ${THEME_LABELS[theme]}. Click to change theme`}
      title={`Theme: ${THEME_LABELS[theme]}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                 bg-white/10 hover:bg-white/20 transition-colors
                 text-sm font-medium focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-yellow-400"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        style={{ display: "inline-block" }}
      >
        {THEME_ICONS[theme]}
      </motion.span>
      <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
    </motion.button>
  );
}