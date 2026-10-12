import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk: require("../assets/fonts/SpaceGrotesk.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Italic": require("../assets/fonts/PlusJakartaSans-Italic.ttf"),
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });
  // Configurazione viewport e modalità web app per iOS
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      
      // 1. 🛠️ INIEZIONE DEL TAG VIEWPORT PER ESTENDERE IL NERO DIETRO IL NOTCH
      let metaViewport = document.querySelector('meta[name="viewport"]');
      const regoleViewport = "width=device-width, initial-scale=1.0, viewport-fit=cover";
      if (metaViewport) {
        metaViewport.setAttribute('content', regoleViewport);
      } else {
        const nuovoMeta = document.createElement('meta');
        nuovoMeta.name = "viewport";
        nuovoMeta.content = regoleViewport;
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

      // Lo zoom resta disponibile per rispettare le impostazioni di accessibilità.
    }
  }, []);
  useEffect(() => {
    // In caso di errore dei font, nascondi comunque lo splash e usa i fallback di sistema.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;
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
