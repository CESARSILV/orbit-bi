"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

const STORAGE_KEY = "doit-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Detecta preferência do sistema
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark"); // SSR-safe default
  const initializedRef = useRef(false);

  // Inicializa e persiste o tema sem gravar o default dark antes de ler a preferência real.
  useEffect(() => {
    if (!initializedRef.current) {
      const initial = getInitialTheme();
      document.documentElement.setAttribute("data-theme", initial);
      localStorage.setItem(STORAGE_KEY, initial);
      initializedRef.current = true;
      if (initial !== theme) {
        const frameId = window.requestAnimationFrame(() => setTheme(initial));
        return () => window.cancelAnimationFrame(frameId);
      }
      return;
    }

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
