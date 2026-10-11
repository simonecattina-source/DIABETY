import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

// Importiamo l'hook del tema con protezione nativa
import { useTheme } from '../../context/ThemeContext';
export default function StrumentiScreen() {
  const contextTheme = useTheme();

  // Salvagente: se il tema non è ancora pronto, mostriamo una schermata di caricamento bianca sicura
  if (!contextTheme) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  const { colors, isDarkMode, toggleTheme } = contextTheme;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerForm}>
        <Text style={[styles.title, { color: colors.onSurface }]}>Centro Strumenti</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Configurazione visiva e personalizzazione dell'app</Text>
      </View>

      {/* 🎨 SEZIONE TEMA */}
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Interfaccia Visiva</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        
        <View style={styles.containerToggleTema}>
          <TouchableOpacity 
            style={[styles.btnTemaSelector, { backgroundColor: colors.bgUtility }, !isDarkMode && styles.btnTemaSelectorAttivoLight]} 
            onPress={() => toggleTheme('light')}
          >
            <Text style={{ fontSize: 13, marginRight: 2 }}>☀️</Text>
            <Text style={[styles.textBtnTema, { color: colors.muted }, !isDarkMode && styles.textBtnTemaAttivoLight]}>Light Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnTemaSelector, { backgroundColor: colors.bgUtility }, isDarkMode && styles.btnTemaSelectorAttivoDark]} 
            onPress={() => toggleTheme('dark')}
          >
            <Text style={{ fontSize: 13, marginRight: 2 }}>🌙</Text>
            <Text style={[styles.textBtnTema, { color: colors.muted }, isDarkMode && styles.textBtnTemaAttivoDark]}>Dark Mode</Text>
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
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardAzioni: { borderRadius: 16, borderWidth: 1, width: '100%', overflow: 'hidden', padding: 14 },
  containerToggleTema: { flexDirection: 'row', gap: 8, width: '100%' },
  btnTemaSelector: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent' },
  btnTemaSelectorAttivoLight: { backgroundColor: 'rgba(0, 180, 216, 0.08)', borderColor: '#00B4D8' },
  btnTemaSelectorAttivoDark: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: '#00E5FF' },
  textBtnTema: { fontSize: 12, fontWeight: '600' },
  textBtnTemaAttivoLight: { color: '#00B4D8', fontWeight: '700' },
  textBtnTemaAttivoDark: { color: '#00E5FF', fontWeight: '700' }
});
