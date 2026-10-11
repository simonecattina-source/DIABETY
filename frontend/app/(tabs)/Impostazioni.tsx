import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StrumentiScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);

  // Palette colori interna super-sicura anti-crash
  const colors = isDarkMode ? {
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
  } : {
    background: "#F8F9FA",
    surface: "#FFFFFF",
    surfaceSecondary: "#FFFFFF",
    onSurface: "#1A1A1A",
    muted: "#6C757D",
    borderGlass: "rgba(0, 0, 0, 0.08)",
    bgUtility: "#E9ECEF",
    brandPrimary: "#00B4D8",
    success: "#2B9348",
    warning: "#E9B824",
    error: "#D90429"
  };

  const mostraMessaggioNotifica = (testo: string) => {
    setStatoNotifica(testo);
    setTimeout(() => setStatoNotifica(null), 3500);
  };

  // 📥 FUNZIONE COMPLETA DI BACKUP JSON STRUTTURATA PER WEB
  const esportaBackupJSON = async () => {
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      if (!storicoEsistente || JSON.parse(storicoEsistente).length === 0) {
        alert("Non ci sono misurazioni salvate da esportare.");
        return;
      }
      
      if (Platform.OS === 'web') {
        const blob = new Blob([storicoEsistente], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup_diabety_diario.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostraMessaggioNotifica("✓ Backup scaricato correttamente");
      } else {
        alert("L'esportazione file è ottimizzata per l'ambiente Web corrente.");
      }
    } catch (error) {
      alert("Errore durante la creazione del file di backup.");
    }
  };
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerForm}>
        <Text style={[styles.title, { color: colors.onSurface }]}>Centro Strumenti</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Gestione database e configurazione visiva dell'app</Text>
      </View>

      {statoNotifica && (
        <View style={[styles.notificaTendina, { backgroundColor: colors.bgUtility, borderColor: colors.success }]}>
          <Text style={[styles.notificaTesto, { color: colors.success }]}>{statoNotifica}</Text>
        </View>
      )}

      {/* 🎨 SEZIONE TEMA (LIGHT / DARK) */}
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Interfaccia Visiva</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass, padding: 14 }]}>
        <View style={styles.containerToggleTema}>
          <TouchableOpacity 
            style={[styles.btnTemaSelector, { backgroundColor: colors.bgUtility }, !isDarkMode && styles.btnTemaSelectorAttivoLight]} 
            onPress={() => setIsDarkMode(false)}
          >
            <Text style={{ fontSize: 13, marginRight: 2 }}>☀️</Text>
            <Text style={[styles.textBtnTema, { color: colors.muted }, !isDarkMode && styles.textBtnTemaAttivoLight]}>Light Mode</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnTemaSelector, { backgroundColor: colors.bgUtility }, isDarkMode && styles.btnTemaSelectorAttivoDark]} 
            onPress={() => setIsDarkMode(true)}
          >
            <Text style={{ fontSize: 13, marginRight: 2 }}>🌙</Text>
            <Text style={[styles.textBtnTema, { color: colors.muted }, isDarkMode && styles.textBtnTemaAttivoDark]}>Dark Mode</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📊 SEZIONE MANUTENZIONE DATABASE */}
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Manutenzione e Report</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        
        <TouchableOpacity style={styles.rowAzione} onPress={esportaBackupJSON}>
          <View style={styles.leftAzione}>
            <Text style={{ fontSize: 18 }}>📥</Text>
            <View>
              <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Esporta Backup</Text>
              <Text style={[styles.descAzione, { color: colors.muted }]}>Salva un file JSON con tutti i log del tuo diario</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
        </TouchableOpacity>

      </View>

      {/* 📚 MANUALE MEDICO DIARIO */}
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Manuale & Linee Guida</Text>
      
      <View style={[styles.infoBlockPremium, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        <Text style={[styles.infoBlockTitle, { color: colors.onSurface }]}>🛡️ Logica dell'Archivio Trimestrale</Text>
        <Text style={[styles.infoBlockText, { color: colors.muted }]}>
          L'applicazione memorizza localmente le misurazioni calcolando i trend su una finestra mobile di **90 giorni**. I log antecedenti vengono protetti o archiviati in modo intelligente. Prima della scadenza, si consiglia di usare la funzione "Esporta Backup".
        </Text>
      </View>

      <View style={[styles.infoBlockPremium, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        <Text style={[styles.infoBlockTitle, { color: colors.onSurface }]}>📊 Soglie Glicemiche e Codici Colore</Text>
        <Text style={[styles.infoBlockText, { color: colors.muted }]}>
          Il diario applica tre gradazioni cromatiche in base ai parametri medici standard di riferimento:{"\n"}
          • <Text style={{ color: colors.success, fontWeight: '700' }}>Verde (Normale):</Text> Valori compresi tra 70 e 180 mg/dL.{"\n"}
          • <Text style={{ color: colors.warning, fontWeight: '700' }}>Arancione (Ipoglicemia):</Text> Sotto i 70 mg/dL.{"\n"}
          • <Text style={{ color: colors.error, fontWeight: '700' }}>Rosso (Iperglicemia):</Text> Sopra i 180 mg/dL.
        </Text>
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
  cardAzioni: { borderRadius: 16, borderWidth: 1, width: '100%', overflow: 'hidden' },
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, width: '100%' },
  leftAzione: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  titoloAzione: { fontSize: 14, fontWeight: '700' },
  descAzione: { fontSize: 11, marginTop: 2 },
  containerToggleTema: { flexDirection: 'row', gap: 8, width: '100%' },
  btnTemaSelector: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent' },
  btnTemaSelectorAttivoLight: { backgroundColor: 'rgba(0, 180, 216, 0.08)', borderColor: '#00B4D8' },
  btnTemaSelectorAttivoDark: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: '#00E5FF' },
  textBtnTema: { fontSize: 12, fontWeight: '600' },
  textBtnTemaAttivoLight: { color: '#00B4D8', fontWeight: '700' },
  textBtnTemaAttivoDark: { color: '#00E5FF', fontWeight: '700' },
  infoBlockPremium: { marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 1, width: '100%' },
  infoBlockTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  infoBlockText: { fontSize: 12, lineHeight: 18 },
  notificaTendina: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontWeight: '600', fontSize: 13 }
});
