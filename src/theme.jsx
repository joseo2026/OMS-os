import { createContext, useContext, useState, useEffect } from "react";
import { DARK, LIGHT, makeStyles } from "./styles.js";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("oms-theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("oms-theme", isDark ? "dark" : "light");
    document.body.style.background = isDark ? DARK.bg : LIGHT.bg;
    document.body.style.color      = isDark ? DARK.textPrimary : LIGHT.textPrimary;
    // Also set on html element to cover overscroll areas on iPhone
    document.documentElement.style.background = isDark ? DARK.bg : LIGHT.bg;
  }, [isDark]);

  // Apply immediately on first render before paint
  if (typeof document !== "undefined") {
    const saved = localStorage.getItem("oms-theme");
    const dark  = saved ? saved === "dark" : true;
    document.body.style.background = dark ? DARK.bg : LIGHT.bg;
    document.documentElement.style.background = dark ? DARK.bg : LIGHT.bg;
  }

  const C = isDark ? DARK : LIGHT;
  const S = makeStyles(C);

  return (
    <ThemeContext.Provider value={{ C, S, isDark, toggleTheme: () => setIsDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
