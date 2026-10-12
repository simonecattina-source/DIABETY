import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// Abilita LayoutAnimation per Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      
  brandSecondary: "#7D52FF",    // Viola tech per le card 6 e 7
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           
  warning: "#FF9100",           
  error: "#FF5252",             
  borderGlass: "rgba(255, 255, 255, 0.08)",
  borderGlassBright: "rgba(255, 255, 255, 0.15)",
  bgUtility: "#1A1A24",         
  borderUtility: "#3A3A4A"      
};

const MOMENTI_COLONNE = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];
export default function StrumentiScreen() {
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);
  const [filtroPdfSelezionato, setFiltroPdfSelezionato] = useState<string>('30 GG');
  
  // Memorizza l'ID del punto aperto (da 1 a 8). Se è null, sono tutti chiusi.
  const [expandedPointId, setExpandedPointId] = useState<number | null>(null);

  const mostraMessaggioNotifica = (testo: string) => {
    setStatoNotifica(testo);
    setTimeout(() => setStatoNotifica(null), 3500);
  };

  const togglePoint = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedPointId === id) {
      setExpandedPointId(null); // Richiude se ri-cliccato
    } else {
      setExpandedPointId(id); // Apre il nuovo e chiude il precedente
    }
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
        a.href = url; a.download = 'backup_diabety_diario.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
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

  const esportaDocumentoMatriceStoricoPDF = async () => {
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let dati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      if (dati.length === 0) {
        alert("Non ci sono dati disponibili nel diario per generare il report.");
        return;
      }

      if (filtroPdfSelezionato !== 'Tutti') {
        const giorniFiltro = parseInt(filtroPdfSelezionato); const oggi = new Date(); const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/'); const tsItem = new Date(parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a), parseInt(m) - 1, parseInt(g)).getTime();
          const diff = (dataInizioOggi - tsItem) / (1000 * 60 * 60 * 24); return diff <= giorniFiltro && diff >= -1;
        });
      }

      if (dati.length === 0) {
        alert(`Nessun dato registrato nell'intervallo di tempo selezionato [${filtroPdfSelezionato}].`); return;
      }

      const sezioni: Record<string, any[]> = {};
      dati.forEach((item: any) => {
        const dataChiave = item.dataTesto || "Oggi"; if (!sezioni[dataChiave]) sezioni[dataChiave] = []; sezioni[dataChiave].push(item);
      });

      const sezioniOrdinate = Object.keys(sezioni).sort((a, b) => {
        const [gA, mA, anA] = a.split('/'); const [gB, mB, anB] = b.split('/');
        return new Date(parseInt(anB) < 50 ? 2000+parseInt(anB) : 1900+parseInt(anB), parseInt(mB)-1, parseInt(gB)).getTime() - new Date(parseInt(anA) < 50 ? 2000+parseInt(anA) : 1900+parseInt(anA), parseInt(mA)-1, parseInt(gA)).getTime();
      }).map(chiave => {
        const elementiOrdinati = sezioni[chiave].sort((itemA, itemB) => itemB.ora.localeCompare(itemA.ora)); return { title: chiave, data: elementiOrdinati };
      });

      let corpoHtmlCompleto = ""; const dimensioneBloccoGiorni = 4;
      for (let i = 0; i < sezioniOrdinate.length; i += dimensioneBloccoGiorni) {
        const bloccoQuattroGiorni = sezioniOrdinate.slice(i, i + dimensioneBloccoGiorni); let righeTabellaBlocco = "";
        bloccoQuattroGiorni.forEach(sezione => {
          const rigaGlicemie: Record<string, string> = {}; const rigaInsuline: Record<string, string> = {}; const rigaNote: Record<string, string> = {};
          MOMENTI_COLONNE.forEach(m => { rigaGlicemie[m] = "-"; rigaInsuline[m] = "-"; rigaNote[m] = "-"; });
          sezione.data.forEach(item => {
            if (MOMENTI_COLONNE.includes(item.tipo)) {
              let colore = '#34C759'; if (item.glicemia > 180) colore = '#FF3B30'; if (item.glicemia < 70) colore = '#FF9F0A';
              rigaGlicemie[item.tipo] = `<span style="color: ${colore}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
              rigaInsuline[item.tipo] = item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : "-";
              rigaNote[item.tipo] = item.note ? `<span style="font-style: italic; color: #555;">${item.note}</span>` : "-";
            }
          });
          let trGlicemieHtml = ""; let trInsulineHtml = ""; let trNoteHtml = "";
          MOMENTI_COLONNE.forEach(m => { trGlicemieHtml += `<td>${rigaGlicemie[m]}</td>`; trInsulineHtml += `<td>${rigaInsuline[m]}</td>`; trNoteHtml += `<td>${rigaNote[m]}</td>`; });
          righeTabellaBlocco += `<tr><td class="cell-data" rowspan="3">${sezione.title}</td><td class="cell-label">Glicemia</td>${trGlicemieHtml}</tr><tr><td class="cell-label">Insulina</td>${trInsulineHtml}</tr><tr class="row-separator"><td class="cell-label">Note</td>${trNoteHtml}</tr>`;
        });
        const rigaInterruzionePagina = (i + 4 < sezioniOrdinate.length) ? 'style="page-break-after: always;"' : '';
        const htmlTitoloIntestazione = (i === 0) ? `<h1>Diabety - Registro Storico Giornaliero</h1>` : `<div style="height: 10px;"></div>`;
        corpoHtmlCompleto += `<div class="pagina-pdf" ${rigaInterruzionePagina}>${htmlTitoloIntestazione}<table><thead><tr><th>Data</th><th>Parametro</th><th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th><th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th><th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th></tr></thead><tbody>${righeTabellaBlocco}</tbody></table></div>`;
      }

      const htmlTemplateHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page { size: landscape; margin: 10mm; } body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; } .pagina-pdf { box-sizing: border-box; width: 100%; } h1 { font-size: 18px; color: #0A66C2; margin: 0 0 10px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 4px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; } th, td { border: 1px solid #c7c7cc; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: middle; word-wrap: break-word; } th { background-color: #f2f2f7; font-weight: bold; font-size: 9px; text-transform: uppercase; } .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 10.5px; width: 75px; } .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 5px; width: 80px; } .row-separator td { background-color: #ffffff; }</style></head><body>${corpoHtmlCompleto}</body></html>`;

      if (Platform.OS === 'web') {
        const finestraStampa = window.open('', '_blank');
        if (finestraStampa) {
          finestraStampa.document.write(htmlTemplateHTML); finestraStampa.document.close();
          finestraStampa.onload = () => { finestraStampa.focus(); finestraStampa.print(); };
        } else {
          const { uri } = await Print.printToFileAsync({ html: htmlTemplateHTML }); const risposta = await fetch(uri); const blobFile = await risposta.blob(); const urlDownload = URL.createObjectURL(blobFile);
          const tagAnchor = document.createElement('a'); tagAnchor.href = urlDownload; tagAnchor.download = `Registro_Glicemico_Diabety_${filtroPdfSelezionato.replace(" ", "_")}.pdf`; document.body.appendChild(tagAnchor); tagAnchor.click(); document.body.removeChild(tagAnchor);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlTemplateHTML }); await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Esporta Report Medico PDF' });
      }
    } catch (error) { alert("Impossibile completare la stampa del documento."); }
  };
  // Registro ufficiale degli 8 punti strutturali del manuale (Punti 1-4)
  const manualPoints = [
    { 
      id: 1, 
      title: "1. Registrazione dei Dati", 
      icon: "analytics-outline", 
      color: COLORS.brandPrimary,
      content: "Registra i tuoi dati in un attimo. Nella schermata 'Inserisci' puoi selezionare Data e Ora per la registrazione dei tuoi dati. Di default l'app indicherà sempre Data e Ora attuali ma puoi comunque modificare a tuo piacimento questi parametri per aggiungere dei dati in moments specifici del tuo registro Storico. Tramite i riquadri 'Glicemia' e 'Insulina' puoi inserire i valori corrispondenti che ti interessa registrare, nella sezione subito sotto puoi impostare il momento della giornata relativo al dato che stai registrando. Nel box 'Note' puoi inserire ulteriori informazioni che verranno registrate nel tuo Storico dei dati. L'app Diabety è stata programmata per inserire all'interno del riquadro delle 'Note' l'orario in cui stai effettuando il test cosi da tenerne traccia quando esporti il file in PDF."
    },
    { 
      id: 2, 
      title: "2. Target Colorati", 
      icon: "color-filter-outline", 
      color: COLORS.success,
      content: "Monitora istantaneamente il tuo stato metabolico tramite la codifica dinamica dei colori di sicurezza:\n• Verde (Euglicemia): Valori compresi nel range ideale tra 70 e 180 mg/dL.\n• Arancione (Ipoglicemia): Rilevazioni critiche inferiori a 70 mg/dL.\n• Rosso (Iperglicemia): Rilevazioni elevate superiori a 180 mg/dL."
    },
    { 
      id: 3, 
      title: "3. Archivio e Auto-Pulizia", 
      icon: "trash-outline", 
      color: COLORS.onSurface,
      content: "L'applicazione applica un algoritmo rigoroso di conservazione locale calcolato su una finestra mobile di 90 giorni rispetto al record più recente. I vecchi dati vengono eliminati automaticamente per ottimizzare la memoria del dispositivo: ricordati di salvare periodicamente un file di backup per non perderli. L'Eliminazione dei vecchi dati non significa perdere 'Tutti i dati' ma si intende perdere la singola misurazione registrata a partire da 90 giorni precedenti la data attuale."
    },
    { 
      id: 4, 
      title: "4. Esportazione dei File", 
      icon: "document-text-outline", 
      color: COLORS.brandPrimary,
      content: "Genera esportazioni del tuo Diario in formato PDF con layout panoramico, speculare al tuo registro clinico. Puoi selezionare un periodo specifico di 7, 14, 30 o 90 giorni (oppure includere l'intero storico) per personalizzare l'intervallo del documento, ottimizzando la visualizzazione dei parametri per la tua prossima consultazione specialistica."
    },
    { 
      id: 5, 
      title: "5. Backup e Sicurezza Dati", 
      icon: "sync-outline", 
      color: COLORS.brandPrimary,
      content: "Salva e proteggi i tuoi dati in pochi clic. Puoi esportare un file di sicurezza con tutto lo storico del tuo diario oppure caricarne uno vecchio per ripristinare i log. L'importazione sovrascrivere il database attuale e richiede sempre una conferma per evitare cancellazioni involontarie."
    },
    { 
      id: 6, 
      title: "6. Analisi Avanzata e Grafici", 
      icon: "stats-chart-outline", 
      color: COLORS.brandSecondary,
      content: "Controlla l'andamento della tua Glicemia. Questa sezione mostra grafici chiari con l'andamento della tua Glicemia nelle ultime 24 ore e nei tre mesi passati. Inoltre, calcola in automatico una stima indicativa della tua Emoglobina Glicata (HbA1c) per aiutarti a capire subito se sei a target. Nota molto importante, tutti i dati e i grafici che vedi non sono dati medici ufficiali in quanto si basano solo ed esclusivamente su dati inseriti da te nel monitoraggio della Glicemia. La funzione del grafico è basata per avvicinarsi molto alla rapresentazione di un CGM ma non lo è! Un CGM (Monitoraggio Continuo del Glucosio) è un sistema tecnologico che misura i livelli di zucchero (glucosio) nel liquido interstiziale 24 ore su 24 tramite l'utilizzo di un Sensore. Il sensore rileva il glucosio ogni pochi minuti e invia i dati in tempo real a un ricevitore, a uno smartphone o a uno smartwatch. L'app Diabety non ha questa function. Tutto ciò che vedi nella sezione Grafici è puramente a scopo indicativo basato soltanto su dati inseriti da te."
    },
    { 
      id: 7, 
      title: "7. Calcolatore del Bolo Insulinico", 
      icon: "calculator-outline", 
      color: COLORS.brandPrimary,
      content: "Calcola le unità di insulina necessarie per i pasti e per correggere i picchi alti in un attimo. Sblocca la scheda inserendo i tuoi rapporti personali (Rapporto I:CHO, Sensibilità ISF e Target) concordati con il medico: l'applicazione li terrà salvati sul dispositivo per semplificare ogni calcolo futuro. Puoi inserire il valore della tua Glicemia con la quantità di Carboidrati (CHO) che stai assumendo per elaborare secondo i tuoi parametri la dose di Insulina da fare. Puoi anche inserire solo il valore della Glicemia per calcolare la quantità di Insulina per la correzione della Glicemia per rientrare nel tuo target."
    },
    { 
      id: 8, 
      title: "8. Database Alimenti e Carboidrati", 
      icon: "nutrition-outline", 
      color: COLORS.success,
      content: "Consulta un archivio completo con le marche e i cibi più comuni per comporre il tuo piatto virtuale. L'applicazione somma automaticamente i carboidrati totali mentre aggiungi i prodotti, aiutandoti a calcolare al volo la dose corretta di insulina senza dover fare calcoli a mente. Usa la barra di ricerca per trovare l'alimento che ti interessa, impostane la quantità che stai assumendo espressa in grammi e clicca sull'icona ' + ' per aggiungerla al Piatto Virtuale. L'applicazione genererà in basso una scheda momentanea dove simulerà l'insieme del tuo pasto. Qui puoi aggiungere tutti gli alimenti relativi al pasto tenendo traccia del totale dei Carboidrati (CHO)."
    },
  ];
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
        {/* 1. Esporta Backup */}
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

        {/* 2. Importa Backup */}
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

        <View style={styles.dividerAzione} />

        {/* 3. Esporta PDF Avanzata */}
        <View style={styles.rowAzionePdfComplessa}>
          <TouchableOpacity style={styles.rowPdfClickArea} onPress={esportaDocumentoMatriceStoricoPDF}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titoloAzione, { color: COLORS.brandPrimary }]}>Esporta Registro PDF</Text>
                <Text style={styles.descAzione}>Genera il documento clinico identico allo storico</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.brandPrimary} />
          </TouchableOpacity>

          <View style={styles.containerMiniFiltriPdf}>
            {['7 GG', '14 GG', '30 GG', '90 GG', 'Tutti'].map((intervallo) => {
              const attivo = filtroPdfSelezionato === intervallo;
              return (
                <TouchableOpacity key={intervallo} style={[styles.chipMiniPdf, attivo && styles.chipMiniPdfAttiva]} onPress={() => setFiltroPdfSelezionato(intervallo)}>
                  <Text style={[styles.textMiniChipPdf, attivo && styles.textMiniChipPdfAttivo]}>{intervallo}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* 📚 SEZIONE GUIDA ALL'USO POSIZIONATA IN CODA COME ULTIMA SEZIONE IN ASSOLUTO */}
      <Text style={styles.sectionLabel}>Manuale & Linee Guida</Text>

      {/* Rendering dinamico ad accordion indipendente con allineamento orizzontale fisso */}
      {manualPoints.map((point) => {
        const isOpen = expandedPointId === point.id;

        return (
          <View key={point.id} style={styles.accordionWrapper}>
            {/* INTESTAZIONE ACCORDION (ICONA E SCRITTA RIGIDAMENTE AFFIANCATE) */}
            <TouchableOpacity 
              style={[styles.accordionHeader, isOpen && styles.accordionHeaderActive]} 
              onPress={() => togglePoint(point.id)}
              activeOpacity={0.85}
            >
              <View style={styles.headerLeft}>
                <Ionicons 
                  name={point.icon} 
                  size={18} 
                  color={point.color} 
                  style={styles.iconaManualeAllineata} 
                />
                <Text style={styles.infoBlockTitle}>
                  {point.title}
                </Text>
              </View>
              <Ionicons 
                name={isOpen ? "chevron-up" : "chevron-forward"} 
                size={18} 
                color={isOpen ? point.color : COLORS.muted} 
              />
            </TouchableOpacity>

            {/* CONTENUTO COLLASSABILE */}
            {isOpen && (
              <View style={styles.accordionContent}>
                <Text style={styles.contentText}>{point.content}</Text>
              </View>
            )}
          </View>
        );
      })}

    </ScrollView>
  );
}
