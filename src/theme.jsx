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
    // Sync document background so no flash on load or theme switch
    document.body.style.background = isDark ? DARK.bg : LIGHT.bg;
    document.body.style.color      = isDark ? DARK.textPrimary : LIGHT.textPrimary;
  }, [isDark]);

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
