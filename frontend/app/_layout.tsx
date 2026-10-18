import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { DiabetyAlertProvider } from "@/src/components/diabety-alert";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk: require("../assets/fonts/SpaceGrotesk.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Italic": require("../assets/fonts/PlusJakartaSans-Italic.ttf"),
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });
  // Ripristino del blocco zoom presente nel vecchio _layout di DIABETY.
  // Non blocca lo scorrimento verticale con un dito.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const bloccaPinchZoom = (evento: TouchEvent) => {
      if (evento.touches.length > 1 && evento.cancelable) {
        evento.preventDefault();
      }
    };

    let ultimoTocco = 0;
    const bloccaDoppioTocco = (evento: TouchEvent) => {
      const adesso = Date.now();
      const intervallo = adesso - ultimoTocco;
      if (intervallo > 0 && intervallo <= 300 && evento.cancelable) {
        evento.preventDefault();
      }
      ultimoTocco = adesso;
    };

    document.addEventListener("touchstart", bloccaPinchZoom, { passive: false });
    document.addEventListener("touchend", bloccaDoppioTocco, { passive: false });

    return () => {
      document.removeEventListener("touchstart", bloccaPinchZoom);
      document.removeEventListener("touchend", bloccaDoppioTocco);
    };
  }, []);

  useEffect(() => {
    // In caso di errore dei font, nascondi comunque lo splash e usa i fallback di sistema.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0A0C" }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <DiabetyAlertProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </DiabetyAlertProvider>
            </KeyboardProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
