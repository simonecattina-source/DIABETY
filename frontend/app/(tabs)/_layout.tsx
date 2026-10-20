import { DIABETY_COLORS } from '@/src/theme/diabety';
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";

export default function TabsLayout() {
  // 🎨 PALETTE NEON HIGH-CONTRAST SINFONICA ED OLED OPTIMIZED
  const DESIGN_NEON = {
    backgroundBar: DIABETY_COLORS.background,
    activeNeon: DIABETY_COLORS.brandPrimary,
    inactiveTech: DIABETY_COLORS.tabInactive,
    borderGlass: DIABETY_COLORS.borderGlass,
  };

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" />
          <NativeTabs.Trigger.Label>Inserisci</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="bolo">
          <NativeTabs.Trigger.Icon sf="calculator.circle.fill" />
          <NativeTabs.Trigger.Label>Bolo</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="alimenti">
          <NativeTabs.Trigger.Icon sf="fork.knife.circle.fill" />
          <NativeTabs.Trigger.Label>Alimenti</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="storico">
          <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" />
          <NativeTabs.Trigger.Label>Storico</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="grafici">
          <NativeTabs.Trigger.Icon sf="chart.bar.xaxis.ascending" />
          <NativeTabs.Trigger.Label>Grafici</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        
        <NativeTabs.Trigger name="sincronizzazione">
          <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" />
          <NativeTabs.Trigger.Label>QR Test</NativeTabs.Trigger.Label>
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
          // 🛠️ RISOLTO: Blocco rigido ad altezza fissa per azzerare lo scatto elastico inferiore dell'iPhone
          ...(Platform.OS === "web" ? { 
            height: typeof window !== 'undefined' && window.navigator.standalone ? 78 : 64, 
            paddingTop: typeof window !== 'undefined' && window.navigator.standalone ? 4 : 0,
            paddingBottom: typeof window !== 'undefined' && window.navigator.standalone ? 20 : 0
          } : {}), 
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
        name="alimenti"
        options={{
          title: "Alimenti",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fast-food" size={size} color={color} />
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

      <Tabs.Screen
        name="sincronizzazione"
        options={{
          title: "QR Test",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="impostazioni"
        options={{
          title: "Impostazioni",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
