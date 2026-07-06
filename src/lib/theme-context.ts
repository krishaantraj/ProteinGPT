import { createContext } from "react";

export type ThemeMode = "dark" | "light" | "system";

export const ThemeContext = createContext<{
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}>({ theme: "dark", setTheme: () => {} });
