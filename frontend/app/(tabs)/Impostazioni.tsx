import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';

const Sharing = Platform.OS !== 'web' ? require('expo-sharing') : null;
import { useTheme } from '../../context/ThemeContext';

const MOMENTI_COLONNE = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];
export default function StrumentiScreen() {
  const contextTheme = useTheme();
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);
  const [filtroPdfSelezionato, setFiltroPdfSelezionato] = useState<string>('30 GG');

  if (!contextTheme) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }

  const { colors, isDarkMode, toggleTheme } = contextTheme;

  const mostraMessaggioNotifica = (testo: string) => {
    setStatoNotifica(testo);
    setTimeout(() => setStatoNotifica(null), 3500);
  };

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
      alert("Errore durante la creazione del file di backup.");
    }
  };
  const gestisciImportazioneWeb = async (evento: any) => {
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
  };

  const esportaDocumentoMatriceStoricoPDF = async () => {
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
        const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
        
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/');
          const annoCompleto = parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a);
          const tsItem = new Date(annoCompleto, parseInt(m) - 1, parseInt(g)).getTime();
          const diff = (dataInizioOggi - tsItem) / (1000 * 60 * 60 * 24);
          return diff <= giorniFiltro && diff >= -1;
        });
      }

      if (dati.length === 0) {
        alert(`Nessun dato registrato nell'intervallo di tempo selezionato [${filtroPdfSelezionato}].`);
        return;
      }

      const sezioni: Record<string, any[]> = {};
      dati.forEach((item: any) => {
        const dataChiave = item.dataTesto || "Oggi";
        if (!sezioni[dataChiave]) sezioni[dataChiave] = [];
        sezioni[dataChiave].push(item);
      });

      const sezioniOrdinate = Object.keys(sezioni)
        .sort((a, b) => {
          const [gA, mA, anA] = a.split('/');
          const [gB, mB, anB] = b.split('/');
          return new Date(parseInt(anB) < 50 ? 2000+parseInt(anB) : 1900+parseInt(anB), parseInt(mB)-1, parseInt(gB)).getTime() - 
                 new Date(parseInt(anA) < 50 ? 2000+parseInt(anA) : 1900+parseInt(anA), parseInt(mA)-1, parseInt(gA)).getTime();
        })
        .map(chiave => {
          const elementiOrdinati = sezioni[chiave].sort((itemA, itemB) => itemB.ora.localeCompare(itemA.ora));
          return { title: chiave, data: elementiOrdinati };
        });

      let corpoHtmlCompleto = "";
      const dimensioneBloccoGiorni = 4;

      for (let i = 0; i < sezioniOrdinate.length; i += dimensioneBloccoGiorni) {
        const bloccoQuattroGiorni = sezioniOrdinate.slice(i, i + dimensioneBloccoGiorni);
        let righeTabellaBlocco = "";

        bloccoQuattroGiorni.forEach(sezione => {
          const rigaGlicemie: Record<string, string> = {};
          const rigaInsuline: Record<string, string> = {};
          const rigaNote: Record<string, string> = {};

          MOMENTI_COLONNE.forEach(m => {
            rigaGlicemie[m] = "-"; rigaInsuline[m] = "-"; rigaNote[m] = "-";
          });

          sezione.data.forEach(item => {
            if (MOMENTI_COLONNE.includes(item.tipo)) {
              let colore = '#34C759';
              if (item.glicemia > 180) colore = '#FF3B30';
              if (item.glicemia < 70) colore = '#FF9F0A';

              rigaGlicemie[item.tipo] = `<span style="color: ${colore}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
              rigaInsuline[item.tipo] = item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : "-";
              rigaNote[item.tipo] = item.note ? `<span style="font-style: italic; color: #555;">${item.note}</span>` : "-";
            }
          });

          let trGlicemieHtml = ""; let trInsulineHtml = ""; let trNoteHtml = "";
          MOMENTI_COLONNE.forEach(m => {
            trGlicemieHtml += `<td>${rigaGlicemie[m]}</td>`;
            trInsulineHtml += `<td>${rigaInsuline[m]}</td>`;
            trNoteHtml += `<td>${rigaNote[m]}</td>`;
          });

          righeTabellaBlocco += `
            <tr>
              <td class="cell-data" rowspan="3">${sezione.title}</td>
              <td class="cell-label">Glicemia</td>
              ${trGlicemieHtml}
            </tr>
            <tr>
              <td class="cell-label">Insulina</td>
              ${trInsulineHtml}
            </tr>
            <tr class="row-separator">
              <td class="cell-label">Note</td>
              ${trNoteHtml}
            </tr>`;
        });

        const rigaInterruzionePagina = (i + 4 < sezioniOrdinate.length) ? 'style="page-break-after: always;"' : '';
        const htmlTitoloIntestazione = (i === 0) ? `<h1>Diabety - Registro Storico Giornaliero</h1>` : `<div style="height: 10px;"></div>`;

        corpoHtmlCompleto += `
          <div class="pagina-pdf" ${rigaInterruzionePagina}>
            ${htmlTitoloIntestazione}
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Parametro</th>
                  <th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th>
                  <th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th>
                  <th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th>
                </tr>
              </thead>
              <tbody>
                ${righeTabellaBlocco}
              </tbody>
            </table>
          </div>`;
      }

      const htmlTemplateHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page { size: landscape; margin: 10mm; }
              body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; }
              .pagina-pdf { box-sizing: border-box; width: 100%; }
              h1 { font-size: 18px; color: #0A66C2; margin: 0 0 10px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 4px; }
              table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; }
              th, td { border: 1px solid #c7c7cc; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: middle; word-wrap: break-word; }
              th { background-color: #f2f2f7; font-weight: bold; font-size: 9px; text-transform: uppercase; }
              .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 10.5px; width: 75px; }
              .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 5px; width: 80px; }
              .row-separator td { background-color: #ffffff; }
            </style>
          </head>
          <body>
            ${corpoHtmlCompleto}
          </body>
        </html>`;

      if (Platform.OS === 'web') {
        const finestraStampa = window.open('', '_blank');
        if (finestraStampa) {
          finestraStampa.document.write(htmlTemplateHTML);
          finestraStampa.document.close();
          finestraStampa.onload = () => { finestraStampa.focus(); finestraStampa.print(); };
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlTemplateHTML });
        if (Sharing && await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Esporta Report Medico PDF' });
        }
      }
    } catch (error) {
      alert("Impossibile completare la stampa del documento.");
    }
  };
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 🌟 FIX FONDAMENTALE: Tag riaperto correttamente */}
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
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        <View style={styles.rowAzioneTema}>
          <View style={styles.leftAzione}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.bgUtility, borderColor: colors.borderGlass }]}>
              <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, color: colors.onSurface }}>☀️</Text>
              </View>
            </View>
            <View>
              <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Tema dell'applicazione</Text>
              <Text style={[styles.descAzione, { color: colors.muted }]}>Personalizza contemporaneamente tutte le schede</Text>
            </View>
          </View>
        </View>
        
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
      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Manutenzione e Report</Text>
      <View style={[styles.cardAzioni, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        
        <TouchableOpacity style={[styles.rowAzione, { borderBottomColor: colors.borderGlass }]} onPress={esportaBackupJSON}>
          <View style={styles.leftAzione}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.bgUtility, borderColor: colors.borderGlass }]}>
              <Text style={{ fontSize: 16 }}>📥</Text>
            </View>
            <View>
              <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Esporta Backup</Text>
              <Text style={[styles.descAzione, { color: colors.muted }]}>Salva un file JSON con tutto lo storico dei log</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
        </TouchableOpacity>

        {Platform.OS === 'web' ? (
          <label style={[styles.rowAzioneLabel, { borderBottomColor: colors.borderGlass }]}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.bgUtility, borderColor: colors.borderGlass }]}>
                <Text style={{ fontSize: 16 }}>📤</Text>
              </View>
              <View>
                <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Importa Backup</Text>
                <Text style={[styles.descAzione, { color: colors.muted }]}>Ripristina il database caricando un file JSON</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
            <input type="file" accept=".json" onChange={gestisciImportazioneWeb} style={{ display: 'none' }} />
          </label>
        ) : (
          <TouchableOpacity style={[styles.rowAzione, { borderBottomColor: colors.borderGlass }]}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.bgUtility, borderColor: colors.borderGlass }]}>
                <Text style={{ fontSize: 16 }}>📤</Text>
              </View>
              <View>
                <Text style={[styles.titoloAzione, { color: colors.onSurface }]}>Importa Backup</Text>
                <Text style={[styles.descAzione, { color: colors.muted }]}>Ripristina il database caricando un file JSON</Text>
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 14 }}>➔</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.dividerAzione, { backgroundColor: colors.borderGlass }]} />

        <View style={styles.rowAzionePdfComplessa}>
          <TouchableOpacity style={styles.rowPdfClickArea} onPress={esportaDocumentoMatriceStoricoPDF}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.bgUtility, borderColor: colors.borderGlass }]}>
                <Text style={{ fontSize: 16 }}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titoloAzione, { color: colors.brandPrimary }]}>Esporta Registro PDF</Text>
                <Text style={[styles.descAzione, { color: colors.muted }]}>Genera il documento clinico a matrice identico allo storico</Text>
              </View>
            </View>
            <Text style={{ color: colors.brandPrimary, fontSize: 14 }}>➔</Text>
          </TouchableOpacity>

          <View style={styles.containerMiniFiltriPdf}>
            {['7 GG', '14 GG', '30 GG', '90 GG', 'Tutti'].map((intervallo) => {
              const attivo = filtroPdfSelezionato === intervallo;
              return (
                <TouchableOpacity
                  key={intervallo}
                  style={[styles.chipMiniPdf, { backgroundColor: colors.bgUtility, borderColor: colors.borderGlass }, attivo && styles.chipMiniPdfAttiva]}
                  onPress={() => setFiltroPdfSelezionato(intervallo)}
                >
                  <Text style={[styles.textMiniChipPdf, { color: colors.muted }, attivo && { color: colors.brandPrimary, fontWeight: '700' }]}>
                    {intervallo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>Manuale & Linee Guida</Text>
      
      <View style={[styles.infoBlockPremium, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        <Text style={[styles.infoBlockTitle, { color: colors.onSurface }]}>🛡️ Logica dell'Archivio Trimestrale</Text>
        <Text style={[styles.infoBlockText, { color: colors.muted }]}>
          L'applicazione memorizza localmente le misurazioni calcolando i trend su una finestra mobile di **90 giorni**. I log antecedenti vengono protetti o archiviati in modo intelligente. Prima della scadenza, si consiglia di usare la funzione "Esporta Backup".
        </Text>
      </View>

      <View style={[styles.infoBlockPremium, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderGlass }]}>
        <Text style={[styles.infoBlockTitle, { color: colors.onSurface }]}>⏰ Tracciamento Orario Intraday</Text>
        <Text style={[styles.infoBlockText, { color: colors.muted }]}>
          L'orario inserito viene impiegato dall'algoritmo per ordinare cronologicamente la timeline. Quando aggiungi delle note personalizzate, l'orario effettivo viene registrato in automatico all'inizio racchiuso tra parentesi quadre.
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
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headerForm: { marginBottom: 20, width: '100%' },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardAzioni: { borderRadius: 16, borderWidth: 1, width: '100%', overflow: 'hidden' },
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, borderBottomWidth: 1, width: '100%' },
  rowAzioneLabel: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  leftAzione: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  titoloAzione: { fontSize: 14, fontWeight: '700' },
  descAzione: { fontSize: 11, marginTop: 2 },
  rowAzioneTema: { flexDirection: 'row', alignItems: 'center', padding: 14, width: '100%' },
  containerToggleTema: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 8, width: '100%' },
  btnTemaSelector: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent' },
  btnTemaSelectorAttivoLight: { backgroundColor: 'rgba(0, 180, 216, 0.08)', borderColor: '#00B4D8' },
  btnTemaSelectorAttivoDark: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: '#00E5FF' },
  textBtnTema: { fontSize: 12, fontWeight: '600' },
  textBtnTemaAttivoLight: { color: '#00B4D8', fontWeight: '700' },
  textBtnTemaAttivoDark: { color: '#00E5FF', fontWeight: '700' },
  dividerAzione: { height: 1, width: '100%' },
  rowAzionePdfComplessa: { width: '100%', padding: 14, paddingTop: 12, paddingBottom: 14, flexDirection: 'column' },
  rowPdfClickArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  containerMiniFiltriPdf: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 6, paddingLeft: 2 },
  chipMiniPdf: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chipMiniPdfAttiva: { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: '#00E5FF' },
  textMiniChipPdf: { fontSize: 11, fontWeight: '600' },
  infoBlockPremium: { marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 1, width: '100%' },
  infoBlockTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  infoBlockText: { fontSize: 12, lineHeight: 18 },
  notificaTendina: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontWeight: '600', fontSize: 13 }
});
