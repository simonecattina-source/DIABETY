import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

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

  // 📄 LOGICA DI ESPORTAZIONE DIARIO PDF CLINICO (IDENTICA AL 100% ALLA SCHEDA STORICO)
  const esportaDiarioPDF = async () => {
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let dati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      if (dati.length === 0) {
        alert("Non ci sono dati disponibili nel diario per generare il report.");
        return;
      }

      if (filtroPdfSelezionato !== 'Tutti') {
        const giorniFiltro = parseInt(filtroPdfSelezionato);
        const oggi = new Date();
        const limiteSogliaMs = giorniFiltro * 24 * 60 * 60 * 1000;
        
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/');
          const annoCompleto = parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a);
          const timestampItem = new Date(annoCompleto, parseInt(m) - 1, parseInt(g)).getTime();
          return (oggi.getTime() - timestampItem) <= limiteSogliaMs;
        });
      }

      if (dati.length === 0) {
        alert(`Nessun dato registrato nell'intervallo di tempo selezionato [${filtroPdfSelezionato}].`);
        return;
      }

      const datiOrdinatiPDF = dati.sort((a: any, b: any) => {
        const [gA, mA, anA] = a.dataTesto.split('/');
        const [gB, mB, anB] = b.dataTesto.split('/');
        const dataA = new Date(parseInt(anA) < 50 ? 2000 + parseInt(anA) : 1900 + parseInt(anA), parseInt(mA) - 1, parseInt(gA)).getTime();
        const dataB = new Date(parseInt(anB) < 50 ? 2000 + parseInt(anB) : 1900 + parseInt(anB), parseInt(mB) - 1, parseInt(gB)).getTime();
        if (dataB !== dataA) return dataB - dataA;
        return b.ora.localeCompare(a.ora);
      });

      let stringaRigheTabellaHTML = "";
      datiOrdinatiPDF.forEach((item: any) => {
        let colereValoreGlicemia = "#1c1c1e";
        if (item.glicemia) {
          const gNum = parseInt(item.glicemia);
          if (gNum < 70) colereValoreGlicemia = "#d35400";
          else if (gNum > 180) colereValoreGlicemia = "#c0392b";
          else colereValoreGlicemia = "#27ae60";
        }

        const notePulite = item.note && item.note.trim() ? item.note : "-";
        const unitaInsulina = item.insulina && item.insulina !== "-" && !item.insulina.includes("UI") ? `${item.insulina} UI` : item.insulina;

        stringaRigheTabellaHTML += `
          <tr style="font-size:11px;">
            <td style="border:1px solid #d3d3d3; padding:8px; font-weight:600; background:#fafafa;">${item.dataTesto}</td>
            <td style="border:1px solid #d3d3d3; padding:8px; color:#555555;">${item.ora}</td>
            <td style="border:1px solid #d3d3d3; padding:8px; font-weight:bold; color:${colereValoreGlicemia};">${item.glicemia || "-"}</td>
            <td style="border:1px solid #d3d3d3; padding:8px; font-weight:600; color:#7d52ff;">${unitaInsulina || "-"}</td>
            <td style="border:1px solid #d3d3d3; padding:8px; color:#1c1c1e; font-weight:500;">${item.tipo || "-"}</td>
            <td style="border:1px solid #d3d3d3; padding:8px; text-align:left; color:#555555; max-width:240px; word-wrap:break-word;">${notePulite}</td>
          </tr>
        `;
      });

      const htmlFronteEndCompleto = `
        <html>
        <head>
          <style>
            @page { size: portrait; margin: 12mm; }
            body { font-family: sans-serif; color: #1c1c1e; margin: 0; padding: 0; background: #ffffff; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #13131A; color: #ffffff; font-size: 11px; font-weight: bold; padding: 10px; border: 1px solid #d3d3d3; }
            td { text-align: center; border: 1px solid #d3d3d3; }
          </style>
        </head>
        <body>
          <div style="width:100%; border-bottom:2px solid #00E5FF; padding-bottom:10px; margin-bottom:15px;">
            <h2 style="margin:0; color:#13131A; font-size:20px;">DIARIO GLICEMICO COMPLETO</h2>
            <p style="margin:4px 0 0 0; color:#636366; font-size:12px;">Filtro Report: <b>${filtroPdfSelezionato}</b> • Sincronizzato ed estratto localmente</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 85px;">Data</th>
                <th style="width: 60px;">Ora</th>
                <th style="width: 90px;">Glicemia (mg/dL)</th>
                <th style="width: 90px;">Insulina (UI)</th>
                <th style="width: 130px;">Momento della Giornata</th>
                <th>Note e Contesto Alimentare</th>
              </tr>
            </thead>
            <tbody>
              ${stringaRigheTabellaHTML}
            </tbody>
          </table>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const { uri } = await Print.printToFileAsync({ html: htmlFronteEndCompleto });
        const risposta = await fetch(uri);
        const blobFile = await risposta.blob();
        const urlDownload = URL.createObjectURL(blobFile);
        const tagAnchor = document.createElement('a');
        tagAnchor.href = urlDownload;
        tagAnchor.download = `Registro_Diabety_${filtroPdfSelezionato.replace(" ", "_")}.pdf`;
        document.body.appendChild(tagAnchor);
        tagAnchor.click();
        document.body.removeChild(tagAnchor);
        URL.revokeObjectURL(urlDownload);
        mostraMessaggioNotifica("✓ Report PDF scaricato!");
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlFronteEndCompleto });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Esporta Report Medico PDF' });
      }
    } catch (error) {
      alert("Impossibile completare la stampa del documento.");
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

      {/* 📊 SEZIONE 1: AZIONI E BACKUP */}
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

        {/* 3. Riga Esporta PDF Avanzata (Riquadro unico coeso e speculare allo Storico) */}
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

          {/* 📅 Pulsantiera Orizzontale Interna per la scelta dei giorni */}
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

  rowAzionePdfComplessa: { width: '100%', padding: 14, paddingTop: 12, paddingBottom: 14, flexDirection: 'column' },
  rowPdfClickArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  
  containerMiniFiltriPdf: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 6, paddingLeft: 2 },
  chipMiniPdf: { flex: 1, backgroundColor: '#1A1A24', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  chipMiniPdfAttiva: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: COLORS.brandPrimary },
  textMiniChipPdf: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  textMiniChipPdfAttivo: { color: COLORS.brandPrimary, fontWeight: '700' },

  infoBlockPremium: { marginBottom: 12, backgroundColor: COLORS.surfaceSecondary, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%' },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: COLORS.onSurface, marginBottom: 6 },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, lineHeight: 18 },

  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 13 }
});
