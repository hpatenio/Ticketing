// theme/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "user_theme_preference";

const lightTheme = {
  mode: "light" as const,
  // App
  background: "#F7FBFE",
  surface: "#FFFFFF",
  border: "#E8F4F8",
  text: "#1D4B5C",
  subtext: "#669BAE",
  // Sidebar / BottomNav
  sidebarBg: "#FFFFFF",
  navBorder: "#E8F4F8",
  iconActive: "#35A2CA",
  iconInactive: "#93D3EA",
  textActive: "#1D4B5C",
  textInactive: "#669BAE",
  bgActive: "#F4FBFE",
  bgHover: "#F0F9FF",
  activeBar: "#35A2CA",
};

const darkTheme = {
  mode: "dark" as const,
  background: "#0F1C22",
  surface: "#162630",
  border: "#1E3340",
  text: "#E2F0F5",
  subtext: "#6B9BAD",
  sidebarBg: "#111E26",
  navBorder: "#1E3340",
  iconActive: "#35A2CA",
  iconInactive: "#2E6B82",
  textActive: "#C8E8F2",
  textInactive: "#4E7D8E",
  bgActive: "#1A3040",
  bgHover: "#1E3545",
  activeBar: "#35A2CA",
};

export type Theme = {
  mode: "light" | "dark";
  background: string;
  surface: string;
  border: string;
  text: string;
  subtext: string;
  sidebarBg: string;
  navBorder: string;
  iconActive: string;
  iconInactive: string;
  textActive: string;
  textInactive: string;
  bgActive: string;
  bgHover: string;
  activeBar: string;
};

type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: "system",
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeModeState(saved);
      }
    });
  }, []);

  // Save preference whenever it changes
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  };

  const resolvedMode =
    themeMode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  const theme = resolvedMode === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
