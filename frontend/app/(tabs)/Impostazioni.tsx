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
      alert("Errore Aegean durante il backup.");
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

  // 📄 GENERAZIONE REALE DEL REPORT PDF CLINICO LANDSCAPE A 11 COLONNE
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

      const righeRaggruppate: { [key: string]: any } = {};
      dati.forEach((item: any) => {
        const dataKey = item.dataTesto;
        if (!righeRaggruppate[dataKey]) {
          righeRaggruppate[dataKey] = {
            data: dataKey,
            "Prima Colazione": { g: "-", i: "-" }, "Dopo Colazione": { g: "-", i: "-" }, "Spuntino": { g: "-", i: "-" },
            "Prima Pranzo": { g: "-", i: "-" }, "Dopo Pranzo": { g: "-", i: "-" }, "Merenda": { g: "-", i: "-" },
            "Prima Cena": { g: "-", i: "-" }, "Dopo Cena": { g: "-", i: "-" }, "Notte": { g: "-", i: "-" },
            noteLista: []
          };
        }
        
        const m = item.tipo;
        if (righeRaggruppate[dataKey][m]) {
          righeRaggruppate[dataKey][m].g = item.glicemia ? `${item.glicemia}` : "-";
          righeRaggruppate[dataKey][m].i = item.insulina && item.insulina !== "-" ? item.insulina.replace(" UI", "") : "-";
        }
        if (item.note && item.note.trim() && item.note !== `[${item.ora}]`) {
          righeRaggruppate[dataKey].noteLista.push(item.note);
        }
      });

      const elencoDateOrdinate = Object.values(righeRaggruppate).sort((a: any, b: any) => {
        const [gA, mA, anA] = a.data.split('/');
        const [gB, mB, anB] = b.data.split('/');
        return new Date(parseInt(anB) < 50 ? 2000+parseInt(anB) : 1900+parseInt(anB), parseInt(mA)-1, parseInt(gA)).getTime() - 
               new Date(parseInt(anB) < 50 ? 2000+parseInt(anB) : 1900+parseInt(anB), parseInt(mB)-1, parseInt(gB)).getTime();
      });

      const COLONNE_MOMENTI = [
        "Prima Colazione", "Dopo Colazione", "Spuntino", 
        "Prima Pranzo", "Dopo Pranzo", "Merenda", 
        "Prima Cena", "Dopo Cena", "Notte"
      ];

      let htmlContenutoTabelle = "";
      const dimensioneBloccoGiorni = 4;

      for (let i = 0; i < elencoDateOrdinate.length; i += dimensioneBloccoGiorni) {
        const bloccoCorrente = elencoDateOrdinate.slice(i, i + dimensioneBloccoGiorni);
        
        htmlContenutoTabelle += `
          <div class="page-block" style="page-break-after: always; margin-bottom: 30px;">
            <table style="width:100%; border-collapse:collapse; margin-top:15px; background:#ffffff;">
              <thead>
                <tr style="background-color:#13131A; color:#ffffff; font-size:11px;">
                  <th style="border:1px solid #d3d3d3; padding:8px; width:70px;">Data</th>
                  <th style="border:1px solid #d3d3d3; padding:8px; width:45px;">Param.</th>
                  \${COLONNE_MOMENTI.map(m => `<th style="border:1px solid #d3d3d3; padding:6px; font-size:10px;">\${m}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
        `;

        bloccoCorrente.forEach((rigaDay: any) => {
          htmlContenutoTabelle += `
            <tr style="font-size:11px; background:#fdfdfd;">
              <td rowspan="3" style="border:1px solid #d3d3d3; text-align:center; font-weight:bold; background:#f4f4f6; padding:4px;">\${rigaDay.data}</td>
              <td style="border:1px solid #d3d3d3; text-align:center; font-weight:bold; color:#0288d1; padding:5px; background:#f9f9fa;">GLI</td>
              \${COLONNE_MOMENTI.map(m => {
                const val = rigaDay[m].g;
                let coloreTesto = "#1c1c1e";
                if (val !== "-") {
                  const num = parseInt(val);
                  if (num < 70) coloreTesto = "#d35400";
                  else if (num > 180) coloreTesto = "#c0392b";
                  else coloreTesto = "#27ae60";
                }
                return `<td style="border:1px solid #d3d3d3; text-align:center; font-weight:bold; color:\${coloreTesto}; padding:5px;">\${val}</td>`;
              }).join('')}
            </tr>
          `;

          htmlContenutoTabelle += `
            <tr style="font-size:11px; background:#ffffff;">
              <td style="border:1px solid #d3d3d3; text-align:center; font-weight:bold; color:#7d52ff; padding:5px; background:#f9f9fa;">INS</td>
              \${COLONNE_MOMENTI.map(m => `<td style="border:1px solid #d3d3d3; text-align:center; color:#2c3e50; padding:5px;">\${rigaDay[m].i}</td>`).join('')}
            </tr>
          `;

          const stringaNoteUnite = rigaDay.noteLista.length > 0 ? rigaDay.noteLista.join(" | ") : "-";
          htmlContenutoTabelle += `
            <tr style="font-size:10px; background:#fafafa;">
              <td style="border:1px solid #d3d3d3; text-align:center; color:#7e7e86; font-style:italic; padding:4px; background:#f9f9fa;">NOTE</td>
              <td colspan="9" style="border:1px solid #d3d3d3; text-align:left; color:#555555; padding:5px; font-family:sans-serif;">\${stringaNoteUnite}</td>
            </tr>
          `;
        });

        htmlContenutoTabelle += `</tbody></table></div>`;
      }

      const htmlFronteEndCompleto = `
        <html>
        <head>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: sans-serif; color: #1c1c1e; margin: 0; padding: 0; background: #ffffff; }
            th, td { border: 1px solid #d3d3d3; text-align: center; }
          </style>
        </head>
        <body>
          <div style="width:100%; border-bottom:2px solid #00E5FF; padding-bottom:10px; margin-bottom:15px;">
            <h2 style="margin:0; color:#13131A; font-size:20px;">REPORT CLINICO DIABETOLOGICO</h2>
            <p style="margin:4px 0 0 0; color:#636366; font-size:12px;">Intervallo Estrazione: <b>\${filtroPdfSelezionato}</b> • Generato in modalità protetta offline</p>
          </div>
          \${htmlContenutoTabelle}
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
        tagAnchor.download = `Report_Diabety_\${filtroPdfSelezionato.replace(" ", "_")}.pdf`;
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

        {/* 3. Riga Esporta PDF Avanzata (Riquadro unico flessibile con selettore ad incastro sotto) */}
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
