import React from "react";
import { LogBox, View } from "react-native";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/src/query-client";
import { ThemeProvider } from "../context/ThemeContext";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </QueryClientProvider>
    </View>
  );
}
