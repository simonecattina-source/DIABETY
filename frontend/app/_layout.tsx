import React, { useEffect } from "react";
import { LogBox, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/src/query-client";

// 🌟 INNESTI DEL CONTESTO CON RISALITA SICURA AD UN LIVELLO
import { ThemeProvider } from "../context/ThemeContext";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: require("../assets/fonts/SpaceGrotesk.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Italic": require("../assets/fonts/PlusJakartaSans-Italic.ttf"),
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });

  // 🔒 BLOCCO ZOOM PER IPHONE (Meta + Eventi JavaScript iOS)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let metaViewport = document.querySelector('meta[name="viewport"]');
      const regoleBloccoZoom = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
      if (metaViewport) {
        metaViewport.setAttribute('content', regoleBloccoZoom);
      } else {
        const nuovoMeta = document.createElement('meta');
        nuovoMeta.name = "viewport";
        nuovoMeta.content = regoleBloccoZoom;
        document.head.appendChild(nuovoMeta);
      }

      const bloccaPinchZoom = (evento: TouchEvent) => {
        if (evento.touches.length > 1) {
          evento.preventDefault();
        }
      };
      document.addEventListener('touchstart', bloccaPinchZoom, { passive: false });

      let ultimoTocco = 0;
      const bloccaDoppioTocco = (evento: TouchEvent) => {
        const tempoAttuale = new Date().getTime();
        const differenzaTempo = tempoAttuale - ultimoTocco;
        if (differenzaTempo <= 300 && differenzaTempo > 0) {
          evento.preventDefault();
        }
        ultimoTocco = tempoAttuale;
      };
      document.addEventListener('touchend', bloccaDoppioTocco, { passive: false });

      return () => {
        document.removeEventListener('touchstart', bloccaPinchZoom);
        document.removeEventListener('touchend', bloccaDoppioTocco);
      };
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
    <View style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </QueryClientProvider>
    </View>
  );
}
