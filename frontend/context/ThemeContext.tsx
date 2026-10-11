import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 DEFINIZIONE STRUTTURA COLORI TEMA
const lightTheme = {
  background: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F3F5",
  onSurface: "#1A1A1A",
  muted: "#6C757D",
  borderGlass: "rgba(0, 0, 0, 0.08)",
  bgUtility: "#E9ECEF",
  brandPrimary: "#00B4D8",
  success: "#2B9348",
  warning: "#E9B824",
  error: "#D90429"
};

const darkTheme = {
  background: "#0A0A0C",
  surface: "#16161A",
  surfaceSecondary: "#22222A",
  onSurface: "#F8F9FA",
  muted: "#A0A0AB",
  borderGlass: "rgba(255, 255, 255, 0.08)",
  bgUtility: "#1C1C24",
  brandPrimary: "#00E5FF",
  success: "#34C759",
  warning: "#FF9F0A",
  error: "#FF3B30"
};

type ThemeContextType = {
  isDarkMode: boolean;
  colors: typeof lightTheme;
  toggleTheme: (mode?: 'light' | 'dark') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemScheme === 'dark');

  // 🔄 CARICAMENTO INIZIALE DA MEMORIA LOCALE CON FALLBACK DI SICUREZZA IMMEDIATO
  useEffect(() => {
    const caricaTemaSalvato = async () => {
      try {
        const temaSalvato = await AsyncStorage.getItem('user_theme');
        if (temaSalvato !== null) {
          setIsDarkMode(temaSalvato === 'dark');
        } else {
          setIsDarkMode(systemScheme === 'dark');
        }
      } catch (error) {
        setIsDarkMode(systemScheme === 'dark');
      }
    };
    caricaTemaSalvato();
  }, [systemScheme]);

  // ⚡ FUNZIONE CAMBIO TEMA VELOCE
  const toggleTheme = async (mode?: 'light' | 'dark') => {
    try {
      const nuovoStatoScuro = mode ? mode === 'dark' : !isDarkMode;
      setIsDarkMode(nuovoStatoScuro);
      await AsyncStorage.setItem('user_theme', nuovoStatoScuro ? 'dark' : 'light');
    } catch (error) {
      console.log("Impossibile salvare le preferenze del tema.");
    }
  };

  const colors = isDarkMode ? darkTheme : lightTheme;
  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizzato pronto all'uso con protezione anti-crash integrata
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Ritorna un fallback sicuro invece di lanciare un errore distruttivo a runtime
    return {
      isDarkMode: false,
      colors: lightTheme,
      toggleTheme: () => {}
    };
  }
  return context;
};
