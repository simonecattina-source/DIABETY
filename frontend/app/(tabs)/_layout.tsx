import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  // 🎨 PALETTE NEON HIGH-CONTRAST SINFONICA ED OLED OPTIMIZED
  const DESIGN_NEON = {
    backgroundBar: "#0A0A0C",      // Nero Oled profondo per la barra
    activeNeon: "#00E5FF",         // Azzurro Cyan elettrico neon attivo
    inactiveTech: "#636366",       // Grigio scuro tech per l'inattivo
    borderGlass: "rgba(255, 255, 255, 0.08)" // Finissimo contorno superiore lucido
  };

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" />
          <NativeTabs.Trigger.Label>Inserisci</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        {/* 🧠 SCHEDA BOLO IN SECONDA POSIZIONE SOTTO STRUTTURA NATIVA APPLE */}
        <NativeTabs.Trigger name="bolo">
          <NativeTabs.Trigger.Icon sf="calculator.circle.fill" />
          <NativeTabs.Trigger.Label>Bolo</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="storico">
          <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" />
          <NativeTabs.Trigger.Label>Storico</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="grafici">
          <NativeTabs.Trigger.Icon sf="chart.bar.xaxis.asending" />
          <NativeTabs.Trigger.Label>Grafici</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="impostazioni">
          <NativeTabs.Trigger.Icon sf="gearshape.2.fill" />
          <NativeTabs.Trigger.Label>Impostazioni</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: DESIGN_NEON.activeNeon,
        tabBarInactiveTintColor: DESIGN_NEON.inactiveTech,
        tabBarStyle: {
          backgroundColor: DESIGN_NEON.backgroundBar,
          borderTopColor: DESIGN_NEON.borderGlass,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          ...(Platform.OS === "web" ? { height: 64 } : {}), 
        },
        tabBarItemStyle: { alignSelf: "center" }, 
        tabBarLabelStyle: { 
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 11, 
          fontWeight: "600" 
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inserisci",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />

      {/* 🧠 SCHEDA BOLO IN SECONDA POSIZIONE SOTTO STRUTTURA STANDARD CROSS-PLATFORM */}
      <Tabs.Screen
        name="bolo"
        options={{
          title: "Bolo",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="storico"
        options={{
          title: "Storico",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="grafici"
        options={{
          title: "Grafici",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />

      {/* ⚙️ RISOLTO DEFINITIVAMENTE: Disegnato l'ingranaggio direttamente in codice per distruggere il bug di cache della freccia */}
      <Tabs.Screen
        name="impostazioni"
        options={{
          title: "Impostazioni",
          tabBarIcon: ({ color, size }) => (
            <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
