import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 DEFINIZIONE DELLE DUE PALETTE SPECULARI
export const LIGHT_THEME = {
  mode: 'light',
  background: "#F4F4F6",        // Grigio chiarissimo protettivo
  surfaceSecondary: "#FFFFFF",  // Bianco purissimo per le card
  brandPrimary: "#00B4D8",      // Cyan medico profondo ad alto contrasto
  onSurface: "#1C1C1E",         // Testo scuro primario
  muted: "#636366",             // Testo secondario grigio
  success: "#4CD964",           
  warning: "#FF9500",           
  error: "#FF3B30",             
  borderGlass: "rgba(0, 0, 0, 0.06)",
  bgUtility: "#E5E5EA",         
  borderUtility: "#C7C7CC"
};

export const DARK_THEME = {
  mode: 'dark',
  background: "#0A0A0C",        // Nero OLED originale
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan neon originale
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           
  warning: "#FF9100",           
  error: "#FF5252",             
  borderGlass: "rgba(255, 255, 255, 0.08)",
  bgUtility: "#1A1A24",         
  borderUtility: "#3A3A4A"
};

const ThemeContext = createContext({
  colors: DARK_THEME,
  isDarkMode: true,
  toggleTheme: (mode: 'light' | 'dark') => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Carica la preferenza salvata all'avvio dell'app
    AsyncStorage.getItem('diabety_theme').then(savedTheme => {
      if (savedTheme === 'light') setIsDarkMode(false);
    });
  }, []);

  const toggleTheme = async (mode: 'light' | 'dark') => {
    const darkModeValue = mode === 'dark';
    setIsDarkMode(darkModeValue);
    await AsyncStorage.setItem('diabety_theme', mode);
  };

  const colors = isDarkMode ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ colors, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
