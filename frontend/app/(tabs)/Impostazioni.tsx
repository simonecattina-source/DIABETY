import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Condivisione nativa caricata in isolamento solo se non siamo su Web
const Sharing = Platform.OS !== 'web' ? require('expo-sharing') : null;
import { useTheme } from '../../context/ThemeContext';
export default function StrumentiScreen() {
  const contextTheme = useTheme();
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);

  if (!contextTheme) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  const { colors, isDarkMode, toggleTheme } = contextTheme;

  const mostraMessaggioNotifica = (testo: string) => {
    setStatoNotifica(testo);
    setTimeout(() => setStatoNotifica(null), 3500);
  };

  // 💾 ESPORTA DATA LOG IN JSON
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
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(storicoEsistente)}`;
        if (Sharing && await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(dataUri, { dialogTitle: 'Salva il tuo Backup Diabety' });
        } else {
          alert("La condivisione non è supportata su questo dispositivo.");
        }
      }
    } catch (error) {
      alert("Errore durante la creazione del file.");
    }
  };

  // 📂 IMPORTA DATA LOG DA JSON
  const gestisciImportazioneWeb = async (evento: any) => {
    try {
      const file = evento.target.files ? evento.target.files[0] : null;
      if (!file) return;

      const lettore = new FileReader();
      lettore.onload = async (e: any) => {
        try {
          const contenutoTesto = e.target.result as string;
          const datiVerificati = JSON.parse(contenutoTesto);
          
          if (Array.isArray(datiVerificati)) {
            const conferma = window.confirm("ATTENZIONE: L'importazione sovrascriverà tutti i dati attuali. Vuoi procedere?");
            if (conferma) {
              await AsyncStorage.setItem('glicotrack_data', contenutoTesto);
              mostraMessaggioNotifica("✓ Registro ripristinato con successo!");
            }
          } else {
            alert("Il file selezionato non è un backup valido.");
          }
        } catch (err) {
          alert("Impossibile leggere il file JSON.");
        }
      };
      lettore.readAsText(file);
    } catch (err) {
      alert("Errore durante l'importazione.");
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

      {/* 🎨 SEZIONE TEMA */}
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Interfaccia Visiva</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass, padding: 14 }]}>
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

      {/* 📊 SEZIONE DATABASE */}
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Manutenzione Database</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass, paddingVertical: 4 }]}>
        
        {/* Pulsante Esporta */}
        <TouchableOpacity style={[styles.rowAzione, { borderBottomColor: colors.borderGlass }]} onPress={esportaBackupJSON}>
          <View style={styles.leftAzione}>
            <Text style={{ fontSize: 18 }}>📥</Text>
            <View>
              <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Esporta Backup</Text>
              <Text style={[styles.descAzione, { color: colors.muted }]}>Salva un file JSON con tutti i log del tuo diario</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
        </TouchableOpacity>

        {/* Pulsante Importa */}
        {Platform.OS === 'web' ? (
          <label style={styles.rowAzioneLabel}>
            <View style={styles.leftAzione}>
              <Text style={{ fontSize: 18 }}>📤</Text>
              <View>
                <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Importa Backup</Text>
                <Text style={[styles.descAzione, { color: colors.muted }]}>Ripristina il database caricando un file JSON</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
            <input type="file" accept=".json" onChange={gestisciImportazioneWeb} style={{ display: 'none' }} />
          </label>
        ) : (
          <TouchableOpacity style={styles.rowAzione} onPress={() => alert("Funzione disponibile su ambiente Web")}>
            <View style={styles.leftAzione}>
              <Text style={{ fontSize: 18 }}>📤</Text>
              <View>
                <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Importa Backup</Text>
                <Text style={[styles.descAzione, { color: colors.muted }]}>Ripristina il database caricando un file JSON</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
          </TouchableOpacity>
        )}

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
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, borderBottomWidth: 1, width: '100%' },
  rowAzioneLabel: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
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
  notificaTendina: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontWeight: '600', fontSize: 13 }
});
