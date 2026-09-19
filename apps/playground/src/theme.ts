/**
 * Global light/dark switch for every playground page.
 *
 * It drives `data-glow-tour-theme` on `<html>`, which the tour styles read, and the `--pg-*`
 * tokens the playground pages are painted with, so the tour and the app around it change together.
 * Importing this module mounts the button; no page has to lay it out.
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "glow-tour-playground-theme";

function storedTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    // Private mode, or site data blocked: fall back to the system theme.
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme, button: HTMLButtonElement) {
  document.documentElement.dataset.glowTourTheme = theme;
  const next = theme === "dark" ? "clair" : "sombre";
  button.setAttribute("aria-pressed", String(theme === "dark"));
  button.setAttribute("aria-label", `Passer au thème ${next}`);
  button.textContent = theme === "dark" ? "☀️ Thème clair" : "🌙 Thème sombre";
}

function mountThemeToggle() {
  if (document.querySelector("[data-pg-theme-toggle]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pg-theme-toggle";
  button.dataset.pgThemeToggle = "";
  let theme = storedTheme() ?? systemTheme();
  applyTheme(theme, button);
  button.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme, button);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The choice then lasts for this page only.
    }
  });
  document.body.append(button);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountThemeToggle, { once: true });
} else {
  mountThemeToggle();
}
