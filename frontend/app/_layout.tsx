import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: require("../assets/fonts/SpaceGrotesk.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Italic": require("../assets/fonts/PlusJakartaSans-Italic.ttf"),
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });
  // 🔒 BLOCCO ZOOM ED ELIMINAZIONE BORDO BIANCO PER IPHONE (Meta Nativi Apple PWA Standalone)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      
      // 1. 🛠️ INIEZIONE DEL TAG VIEWPORT PER ESTENDERE IL NERO DIETRO IL NOTCH
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

      // 2. 📱 INIEZIONE META-TAG SAFARI STANDALONE (Elimina definitivamente l'interfaccia browser e la banda bianca)
      let metaAppleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      if (!metaAppleCapable) {
        const nuovoMetaApple = document.createElement('meta');
        nuovoMetaApple.name = "apple-mobile-web-app-capable";
        nuovoMetaApple.content = "yes";
        document.head.appendChild(nuovoMetaApple);
      }

      let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!metaAppleStatus) {
        const nuovoMetaStatus = document.createElement('meta');
        nuovoMetaStatus.name = "apple-mobile-web-app-status-bar-style";
        nuovoMetaStatus.content = "black-translucent"; // Configura la barra di stato trasparente sullo sfondo OLED
        document.head.appendChild(nuovoMetaStatus);
      }

      // 3. 🚫 Blocca il Pinch-to-Zoom (allargamento con due dita) su iOS
      const bloccaPinchZoom = (evento: TouchEvent) => {
        if (evento.touches.length > 1) {
          evento.preventDefault();
        }
      };
      document.addEventListener('touchstart', bloccaPinchZoom, { passive: false });

      // 4. 🚫 Blocca il Doppio Tocco (Double-Tap Zoom) su iOS
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

      // Pulizia dei listener se il componente si smonta
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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </KeyboardProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
