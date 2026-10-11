import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';

const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           
  error: "#FF5252",             
  borderGlass: "rgba(255, 255, 255, 0.08)",
  bgUtility: "#1A1A24",         
  borderUtility: "#3A3A4A"      
};
export default function StrumentiScreen() {
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);
  // 📅 STATO PER TRACCIARE IL FILTRO TEMPORALE DEL REPORT PDF
  const [filtroPdfSelezionato, setFiltroPdfSelezionato] = useState<string>('30 GG');

  const mostraMessaggioNotifica = (testo: string) => {
    setStatoNotifica(testo);
    setTimeout(() => setStatoNotifica(null), 3500);
  };

  // 💾 ESPORTA BACKUP JSON
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
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(dataUri, { dialogTitle: 'Salva il tuo Backup Diabety' });
        } else {
          alert("La condivisione non è supportata su questo dispositivo.");
        }
      }
    } catch (error) {
      alert("Errore durante la creazione del file di backup.");
    }
  };
  // 📂 IMPORTA BACKUP JSON
  const gestisciImportazioneWeb = async (evento: any) => {
    const file = evento.target.files?.[0];
    if (!file) return;

    const lettore = new FileReader();
    lettore.onload = async (e: any) => {
      try {
        const contenutoTesto = e.target.result;
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
  };

  // 📄 ESPORTA DIARIO IN PDF
  const esportaDiarioPDF = async () => {
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      const dati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      if (dati.length === 0) {
        alert("Non ci sono dati da convertire in PDF.");
        return;
      }

      alert(`Predisposizione esportazione in formato PDF medico per l'intervallo [${filtroPdfSelezionato}] avviata!`);
    } catch (error) {
      alert("Errore durante la generazione del PDF.");
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 🏷️ INTESTAZIONE SCHEDA */}
      <View style={styles.headerForm}>
        <Text style={styles.title}>Centro Strumenti</Text>
        <Text style={styles.subtitle}>Gestione database e informazioni mediche dell'app</Text>
      </View>

      {statoNotifica && (
        <View style={styles.notificaTendina}>
          <Text style={styles.notificaTesto}>{statoNotifica}</Text>
        </View>
      )}

      {/* 📊 SEZIONE 1: AZIONI E BACKUP CON SELETTORE TEMPORALE INTEGRATO */}
      <Text style={styles.sectionLabel}>Manutenzione e Report</Text>
      <View style={styles.cardAzioni}>
        
        {/* 1. Riga Esporta Backup */}
        <TouchableOpacity style={styles.rowAzione} onPress={esportaBackupJSON}>
          <View style={styles.leftAzione}>
            <View style={[styles.iconWrapper, { backgroundColor: '#1A1A24' }]}>
              <Ionicons name="cloud-download-outline" size={20} color={COLORS.onSurface} />
            </View>
            <View>
              <Text style={styles.titoloAzione}>Esporta Backup</Text>
              <Text style={styles.descAzione}>Salva un file JSON con tutto lo storico dei log</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        {/* 2. Riga Importa Backup */}
        {Platform.OS === 'web' ? (
          <label style={styles.rowAzioneLabel}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: '#1A1A24' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.onSurface} />
              </View>
              <View>
                <Text style={styles.titoloAzione}>Importa Backup</Text>
                <Text style={styles.descAzione}>Ripristina il database caricando un file JSON</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            <input type="file" accept=".json" onChange={gestisciImportazioneWeb} style={{ display: 'none' }} />
          </label>
        ) : (
          <TouchableOpacity style={styles.rowAzione}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: '#1A1A24' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.onSurface} />
              </View>
              <View>
                <Text style={styles.titoloAzione}>Importa Backup</Text>
                <Text style={styles.descAzione}>Ripristina il database caricando un file JSON</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}

        {/* 3. Riga Esporta PDF Avanzata (Riquadro unico con selettore ad incastro sotto) */}
        <View style={styles.rowAzionePdfComplessa}>
          <TouchableOpacity style={styles.rowPdfClickArea} onPress={esportaDiarioPDF}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titoloAzione, { color: COLORS.brandPrimary }]}>Esporta Registro PDF</Text>
                <Text style={styles.descAzione}>Genera un documento clinico strutturato per il medico</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.brandPrimary} />
          </TouchableOpacity>

          {/* 📅 Pulsantiera Orizzontale Interna coesa nello stesso modulo */}
          <View style={styles.containerMiniFiltriPdf}>
            {['7 GG', '14 GG', '30 GG', '90 GG', 'Tutti'].map((intervallo) => {
              const attivo = filtroPdfSelezionato === intervallo;
              return (
                <TouchableOpacity
                  key={intervallo}
                  style={[styles.chipMiniPdf, attivo && styles.chipMiniPdfAttiva]}
                  onPress={() => setFiltroPdfSelezionato(intervallo)}
                >
                  <Text style={[styles.textMiniChipPdf, attivo && styles.textMiniChipPdfAttivo]}>
                    {intervallo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </View>

      {/* 📚 SEZIONE 2: GUIDA ALL'USO DETTAGLIATA */}
      <Text style={styles.sectionLabel}>Manuale & Linee Guida</Text>
      
      <View style={styles.infoBlockPremium}>
        <Text style={styles.infoBlockTitle}>🛡️ Logica dell'Archivio Trimestrale</Text>
        <Text style={styles.infoBlockText}>
          L'applicazione memorizza localmente le misurazioni calcolando i trend su una finestra mobile di **90 giorni**. I log antecedenti vengono archiviati o rimossi in modo intelligente per salvaguardare lo spazio e mantenere l'app scattante. Prima della scadenza, si consiglia di usare la funzione "Esporta Backup".
        </Text>
      </View>

      <View style={styles.infoBlockPremium}>
        <Text style={styles.infoBlockTitle}>⏰ Tracciamento Orario Intraday</Text>
        <Text style={styles.infoBlockText}>
          L'orario inserito viene impiegato dall'algoritmo per ordinare cronologicamente la timeline. Quando aggiungi delle note testuali personalizzate, l'orario effettivo viene registrato automaticamente all'inizio della stringa racchiuso tra parentesi quadre per una consultazione immediata dei pasti.
        </Text>
      </View>

      <View style={styles.infoBlockPremium}>
        <Text style={styles.infoBlockTitle}>📊 Soglie Glicemiche e Codici Colore</Text>
        <Text style={styles.infoBlockText}>
          Il diario applica tre gradazioni cromatiche OLED in base ai parametri impostati:{"\n"}
          • <Text style={{ color: COLORS.success, fontWeight: '700' }}>Verde (Normale):</Text> Valori compresi tra 70 e 180 mg/dL.{"\n"}
          • <Text style={{ color: '#FF9100', fontWeight: '700' }}>Arancione (Ipoglicemia):</Text> Sotto i 70 mg/dL.{"\n"}
          • <Text style={{ color: '#FF5252', fontWeight: '700' }}>Rosso (Iperglicemia):</Text> Sopra i 180 mg/dL.
        </Text>
      </View>

    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headerForm: { marginBottom: 20, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, marginTop: 4 },
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 22, marginBottom: 10, uppercase: true, letterSpacing: 0.5 },
  
  cardAzioni: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%', overflow: 'hidden' },
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  rowAzioneLabel: { 
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14, 
    height: 68, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderGlass, 
    cursor: 'pointer', 
    width: '100%', 
    boxSizing: 'border-box' 
  },
  leftAzione: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  titoloAzione: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  descAzione: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted, marginTop: 2 },

  // 📐 INTERFACCIA VERTICALE AD ALTO CONTRASTO PER IL MODULO PDF
  rowAzionePdfComplessa: { width: '100%', padding: 14, paddingTop: 12, paddingBottom: 14, flexDirection: 'column' },
  rowPdfClickArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  
  containerMiniFiltriPdf: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 6, paddingLeft: 2 },
  chipMiniPdf: { flex: 1, backgroundColor: '#1A1A24', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  chipMiniPdfAttiva: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: COLORS.brandPrimary },
  textMiniChipPdf: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  textMiniChipPdfAttivo: { color: COLORS.brandPrimary, fontWeight: '700' },

  // Blocchi Guida Premium
  infoBlockPremium: { marginBottom: 12, backgroundColor: COLORS.surfaceSecondary, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%' },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: COLORS.onSurface, marginBottom: 6 },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, lineHeight: 18 },

  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 13 }
});
