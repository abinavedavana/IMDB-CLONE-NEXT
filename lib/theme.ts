export type Theme = "dark" | "light" | "high-contrast" | "auto";

export const THEME_COOKIE = "app-theme";
export const THEME_STORAGE_KEY = "app-theme";

export const THEMES: Theme[] = ["dark", "light", "high-contrast", "auto"];

export function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(theme: Theme): "dark" | "light" | "high-contrast" {
  if (theme === "auto") return getSystemTheme();
  return theme;
}

export function getThemeFromCookie(cookieString: string): Theme {
  const match = cookieString.match(new RegExp(`${THEME_COOKIE}=([^;]+)`));
  const value = match?.[1] as Theme;
  return THEMES.includes(value) ? value : "dark";
}

export function setThemeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export function setThemeStorage(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function getThemeFromStorage(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return THEMES.includes(value) ? value : "dark";
  } catch {
    return "dark";
  }
}