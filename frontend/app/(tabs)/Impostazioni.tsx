import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

export default function StrumentiScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Colori iniettati direttamente a mano per evitare qualsiasi dipendenza esterna
  const colors = isDarkMode ? {
    background: "#0A0A0C",
    onSurface: "#F8F9FA",
    muted: "#A0A0AB",
    surfaceSecondary: "#22222A",
    borderGlass: "rgba(255, 255, 255, 0.08)",
    bgUtility: "#1C1C24",
    brandPrimary: "#00E5FF"
  } : {
    background: "#F8F9FA",
    onSurface: "#1A1A1A",
    muted: "#6C757D",
    surfaceSecondary: "#FFFFFF",
    borderGlass: "rgba(0, 0, 0, 0.08)",
    bgUtility: "#E9ECEF",
    brandPrimary: "#00B4D8"
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerForm}>
        <Text style={[styles.title, { color: colors.onSurface }]}>Centro Strumenti</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Versione purificata e ultra-sicura ad avvio immediato</Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Interfaccia Visiva</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass, padding: 14 }]}>
        <View style={styles.containerToggleTema}>
          <TouchableOpacity 
            style={[styles.btnTemaSelector, { backgroundColor: colors.bgUtility }, !isDarkMode && styles.btnTemaSelectorAttivoLight]} 
            onPress={() => setIsDarkMode(false)}
          >
            <Text style={{ fontSize: 12, color: !isDarkMode ? '#00B4D8' : colors.muted, fontWeight: '700' }}>☀️ Light Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnTemaSelector, { backgroundColor: colors.bgUtility }, isDarkMode && styles.btnTemaSelectorAttivoDark]} 
            onPress={() => setIsDarkMode(true)}
          >
            <Text style={{ fontSize: 12, color: isDarkMode ? '#00E5FF' : colors.muted, fontWeight: '700' }}>🌙 Dark Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  headerForm: { marginBottom: 20, width: '100%' },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  cardAzioni: { borderRadius: 16, borderWidth: 1, width: '100%', overflow: 'hidden' },
  containerToggleTema: { flexDirection: 'row', gap: 8, width: '100%' },
  btnTemaSelector: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  btnTemaSelectorAttivoLight: { backgroundColor: 'rgba(0, 180, 216, 0.08)', borderColor: '#00B4D8' },
  btnTemaSelectorAttivoDark: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: '#00E5FF' }
});
