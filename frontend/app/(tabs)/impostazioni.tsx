import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, LayoutAnimation, UIManager, Modal } from 'react-native';
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
  brandSecondary: "#7D52FF",    
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
  const [filtroPdfSelezionato, setFiltroPdfSelezionato] = useState<string>('Tutti');
  const [modalPdfVisibile, setModalPdfVisibile] = useState(false);
  const [expandedPointId, setExpandedPointId] = useState<number | null>(null);

  const mostraMessaggioNotifica = (testo: string) => {
    setStatoNotifica(testo);
    setTimeout(() => setStatoNotifica(null), 3500);
  };

  const togglePoint = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedPointId === id) {
      setExpandedPointId(null);
    } else {
      setExpandedPointId(id);
    }
  };
  const esportaBackupJSON = async () => {
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      if (!storicoEsistente || !Array.isArray(JSON.parse(storicoEsistente)) || JSON.parse(storicoEsistente).length === 0) {
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
    } catch (error) { alert("Errore durante la creazione del file di backup."); }
  };
  // Il formato JSON rimane un array di misurazioni, compatibile con i backup esistenti.
  const validaMisurazioneBackup = (item: any): boolean => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (typeof item.id !== 'string' || item.id.trim() === '') return false;
    if (typeof item.glicemia !== 'number' || !Number.isInteger(item.glicemia) || item.glicemia < 1 || item.glicemia > 999) return false;
    if (typeof item.insulina !== 'string' || !/^(?:-|\d{1,2} UI)$/.test(item.insulina)) return false;
    if (typeof item.tipo !== 'string' || !MOMENTI_COLONNE.includes(item.tipo)) return false;
    if (typeof item.note !== 'string') return false;
    if (typeof item.ora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.ora)) return false;
    if (typeof item.dataTesto !== 'string' || !/^\d{2}\/\d{2}\/\d{2}$/.test(item.dataTesto)) return false;

    const [giorno, mese, anno] = item.dataTesto.split('/').map(Number);
    const annoCompleto = anno < 50 ? 2000 + anno : 1900 + anno;
    const data = new Date(annoCompleto, mese - 1, giorno);
    if (data.getFullYear() !== annoCompleto || data.getMonth() !== mese - 1 || data.getDate() !== giorno) return false;
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    return data.getTime() <= oggi.getTime();
  };

  const gestisciImportazioneWeb = async (evento: any) => {
    const inputFile = evento.target;
    const file = inputFile.files?.[0];
    if (!file) return;
    // Permette di riselezionare lo stesso file anche dopo annullamento o errore.
    inputFile.value = '';

    try {
      const contenutoTesto = await file.text();
      const datiImportati: unknown = JSON.parse(contenutoTesto);
      if (!Array.isArray(datiImportati) || datiImportati.length === 0 || !datiImportati.every(validaMisurazioneBackup)) {
        alert('Backup non valido: il file deve contenere misurazioni complete e correttamente formattate. Lo storico attuale non è stato modificato.');
        return;
      }
      const ids = datiImportati.map((item: any) => item.id);
      if (new Set(ids).size !== ids.length) {
        alert('Backup non valido: sono presenti identificativi duplicati. Lo storico attuale non è stato modificato.');
        return;
      }

      // Stessa soglia usata dalla schermata Inserisci: 91 giorni di calendario rispetto a oggi.
      const soglia = new Date();
      soglia.setHours(0, 0, 0, 0);
      soglia.setDate(soglia.getDate() - 91);
      const datiValidi = datiImportati.filter((item: any) => {
        const [giorno, mese, anno] = item.dataTesto.split('/').map(Number);
        const annoCompleto = anno < 50 ? 2000 + anno : 1900 + anno;
        return new Date(annoCompleto, mese - 1, giorno).getTime() >= soglia.getTime();
      });
      const esclusi = datiImportati.length - datiValidi.length;
      if (datiValidi.length === 0) {
        alert(`Il backup contiene ${datiImportati.length} misurazioni, tutte oltre il limite di 91 giorni. Nessun dato è stato sovrascritto.`);
        return;
      }

      const conferma = window.confirm(
        `Backup verificato.\n\nMisurazioni da ripristinare: ${datiValidi.length}\nMisurazioni escluse perché più vecchie di 91 giorni: ${esclusi}\n\nATTENZIONE: il ripristino sostituirà tutto lo storico attuale. Prima di procedere, assicurati di averne salvato un backup.\n\nVuoi continuare?`
      );
      if (!conferma) return;

      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiValidi));
      mostraMessaggioNotifica(`✓ Ripristinate ${datiValidi.length} misurazioni`);
    } catch (errore) {
      alert('Impossibile leggere o importare il backup. Lo storico attuale non è stato modificato se la scrittura non è riuscita.');
    }
  };
  const esportaDocumentoMatriceStoricoPDF = async (modalita: 'html' | 'pdf') => {
    setModalPdfVisibile(false);
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let dati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      if (dati.length === 0) { alert("Non ci sono dati disponibili nel diario per generare il report."); return; }

      if (filtroPdfSelezionato !== 'Tutti') {
        const giorniFiltro = parseInt(filtroPdfSelezionato); const oggi = new Date(); const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/'); const tsItem = new Date(parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a), parseInt(m) - 1, parseInt(g)).getTime();
          const diff = (dataInizioOggi - tsItem) / (1000 * 60 * 60 * 24); return diff <= giorniFiltro && diff >= -1;
        });
      }

      if (dati.length === 0) { alert(`Nessun dato registrato nell'intervallo selezionato.`); return; }

      // L'ordine dell'array salvato viene mantenuto: la prima registrazione inserita vince.
      const sezioni: Record<string, any[]> = {};
      dati.forEach((item: any) => { const k = item.dataTesto || "Oggi"; if (!sezioni[k]) sezioni[k] = []; sezioni[k].push(item); });

      const sezioniOrdinate = Object.keys(sezioni).sort((a, b) => {
        const [gA, mA, anA] = a.split('/'); const [gB, mB, anB] = b.split('/');
        return new Date(parseInt(anB) < 50 ? 2000+parseInt(anB) : 1900+parseInt(anB), parseInt(mB)-1, parseInt(gB)).getTime() - new Date(parseInt(anA) < 50 ? 2000+parseInt(anA) : 1900+parseInt(anA), parseInt(mA)-1, parseInt(gA)).getTime();
      }).map(ch => ({ title: ch, data: sezioni[ch] }));

      // Ogni giornata rimane un gruppo indivisibile di tre righe.
      // La paginazione viene calcolata misurando l'altezza reale della tabella nel browser.
      const righePerGiorno: string[] = [];
      sezioniOrdinate.forEach(sez => {
        let righe = "";
          const rG: Record<string, string> = {}; const rI: Record<string, string> = {}; const rN: Record<string, string> = {};
          MOMENTI_COLONNE.forEach(m => { rG[m] = "-"; rI[m] = "-"; rN[m] = "-"; });
          const momentiGiaInseriti = new Set<string>();
          sez.data.forEach(item => {
            if (MOMENTI_COLONNE.includes(item.tipo) && !momentiGiaInseriti.has(item.tipo)) {
              momentiGiaInseriti.add(item.tipo);
              let col = '#34C759'; if (item.glicemia > 180) col = '#FF3B30'; if (item.glicemia < 70) col = '#FF9F0A';
              rG[item.tipo] = `<span style="color: ${col}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
              rI[item.tipo] = item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : "-";
              rN[item.tipo] = item.note ? `<span style="font-style: italic; color: #555;">${String(item.note).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</span>` : "-";
            }
          });
          let tG = ""; let tI = ""; let tN = "";
          MOMENTI_COLONNE.forEach(m => { tG += `<td>${rG[m]}</td>`; tI += `<td>${rI[m]}</td>`; tN += `<td>${rN[m]}</td>`; });
          righe += `<tr><td class="cell-data" rowspan="3">${sez.title}</td><td class="cell-label">Glicemia</td>${tG}</tr><tr><td class="cell-label">Insulina</td>${tI}</tr><tr class="row-separator"><td class="cell-label">Note</td>${tN}</tr>`;
        righePerGiorno.push(righe);
      });

      const intestazioneTabella = '<thead><tr><th>Data</th><th>Parametro</th><th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th><th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th><th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th></tr></thead>';
      const titoloPrimaPagina = '<h1>Diabety - Registro Storico Giornaliero</h1>';
      const titoloAltrePagine = '<div style="height:10px;"></div>';
      const stileDocumento = `@page { size: A4 landscape; margin: 0; } body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; } .pagina-pdf { box-sizing: border-box; width: 1122px; height: 793px; padding: 36px; background: #ffffff; overflow: hidden; } .pagina-pdf:not(:last-child) { page-break-after: always; break-after: page; } h1 { font-size: 18px; color: #0A66C2; margin: 0 0 10px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 4px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; } th, td { border: 1px solid #c7c7cc; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: middle; word-wrap: break-word; } th { background-color: #f2f2f7; font-weight: bold; font-size: 9px; text-transform: uppercase; } .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 10.5px; width: 75px; } .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 5px; width: 80px; } .row-separator td { background-color: #ffffff; }`;
      const creaPagina = (righe: string[], indice: number) => `<div class="pagina-pdf">${indice === 0 ? titoloPrimaPagina : titoloAltrePagine}<table>${intestazioneTabella}<tbody>${righe.join('')}</tbody></table></div>`;

      let pagine: string[][] = [];
      if (Platform.OS === 'web') {
        // Misura il layout effettivo con gli stessi CSS, larghezza e margini del PDF.
        // Non modifica il diario e non utilizza una stima fissa del numero di giorni.
        const misuratore = document.createElement('div');
        misuratore.style.cssText = 'position:absolute;left:0;top:0;width:1122px;visibility:hidden;pointer-events:none;z-index:-1;';
        const stileMisura = document.createElement('style');
        stileMisura.textContent = stileDocumento;
        misuratore.appendChild(stileMisura);
        const paginaMisura = document.createElement('div');
        paginaMisura.className = 'pagina-pdf';
        misuratore.appendChild(paginaMisura);
        document.body.appendChild(misuratore);
        try {
          let gruppoCorrente: string[] = [];
          for (const righeGiorno of righePerGiorno) {
            const indicePagina = pagine.length;
            paginaMisura.innerHTML = (indicePagina === 0 ? titoloPrimaPagina : titoloAltrePagine) + `<table>${intestazioneTabella}<tbody>${[...gruppoCorrente, righeGiorno].join('')}</tbody></table>`;
            const tabella = paginaMisura.querySelector('table');
            const limite = paginaMisura.getBoundingClientRect().bottom - 10;
            const entra = !!tabella && tabella.getBoundingClientRect().bottom <= limite;
            if (!entra && gruppoCorrente.length > 0) {
              pagine.push(gruppoCorrente);
              gruppoCorrente = [righeGiorno];
            } else if (!entra) {
              throw new Error('Una giornata contiene note troppo lunghe per entrare in una pagina A4. Riduci le note prima di esportare.');
            } else {
              gruppoCorrente.push(righeGiorno);
            }
            // Controlla anche il primo giorno della pagina nuova.
            if (!entra && pagine.length > 0) {
              paginaMisura.innerHTML = titoloAltrePagine + `<table>${intestazioneTabella}<tbody>${righeGiorno}</tbody></table>`;
              const tabellaNuova = paginaMisura.querySelector('table');
              if (!tabellaNuova || tabellaNuova.getBoundingClientRect().bottom > paginaMisura.getBoundingClientRect().bottom - 10) {
                throw new Error('Una giornata contiene note troppo lunghe per entrare in una pagina A4. Riduci le note prima di esportare.');
              }
            }
          }
          if (gruppoCorrente.length) pagine.push(gruppoCorrente);
        } finally {
          misuratore.remove();
        }
      } else {
        // Su dispositivi nativi la stampa usa il motore di impaginazione di expo-print.
        pagine = [righePerGiorno];
      }

      const corpoHtmlCompleto = pagine.map((righe, indice) => creaPagina(righe, indice)).join('');
      const stileNativo = Platform.OS === 'web' ? '' : '.pagina-pdf { height:auto; overflow:visible; } tbody tr { break-inside:avoid; page-break-inside:avoid; }';
      const htmlTemplateHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${stileDocumento}${stileNativo}</style></head><body>${corpoHtmlCompleto}</body></html>`;

      if (Platform.OS === 'web') {
        if (modalita === 'html') {
          const blob = new Blob([htmlTemplateHTML], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const finestra = window.open(url, '_blank');
          if (!finestra) {
            URL.revokeObjectURL(url);
            alert('Il browser ha bloccato la nuova finestra. Consenti i popup per visualizzare il documento.');
            return;
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } else {
          // Renderizza il documento in un elemento HTML reale e misurabile.
          // Non usare position:fixed: html2canvas può catturare una pagina vuota.
          // @ts-ignore - html2pdf.js non include dichiarazioni TypeScript proprie.
          const modulo = await import('html2pdf.js');
          const html2pdf = modulo.default || modulo;
          const docPdf = new DOMParser().parseFromString(htmlTemplateHTML, 'text/html');
          const contenitore = document.createElement('div');
          contenitore.setAttribute('aria-hidden', 'true');
          contenitore.style.cssText = [
            'position:absolute', 'left:0', 'top:0', 'width:1122px',
            'background:#ffffff', 'color:#1c1c1e', 'font-family:Arial,sans-serif',
            'padding:0', 'margin:0', 'opacity:1', 'visibility:visible',
            'pointer-events:none', 'z-index:9999'
          ].join(';');
          const stilePdf = document.createElement('style');
          stilePdf.textContent = docPdf.querySelector('style')?.textContent || '';
          contenitore.appendChild(stilePdf);
          const corpoPdf = document.createElement('div');
          corpoPdf.innerHTML = docPdf.body.innerHTML;
          contenitore.appendChild(corpoPdf);
          document.body.appendChild(contenitore);
          try {
            // Ogni pagina viene acquisita separatamente. In questo modo i salti
            // di pagina CSS non possono creare una pagina bianca intermedia.
            const elementiPagina = Array.from(corpoPdf.querySelectorAll<HTMLElement>('.pagina-pdf'));
            if (!elementiPagina.length) throw new Error('Nessuna pagina disponibile per il PDF.');
            let pdfFinale: any = null;
            for (let indice = 0; indice < elementiPagina.length; indice++) {
              const pagina = elementiPagina[indice];
              pagina.style.breakAfter = 'auto';
              pagina.style.pageBreakAfter = 'auto';
              // Nel contenitore resta visibile soltanto la pagina da acquisire.
              // Non usare display:none sulla pagina attiva.
              elementiPagina.forEach((elemento, j) => {
                elemento.style.display = j === indice ? 'block' : 'none';
              });
              await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              if (!pagina.querySelector('table') || pagina.getBoundingClientRect().height < 10) {
                throw new Error(`La tabella della pagina ${indice + 1} non è stata renderizzata.`);
              }
              const operazione = html2pdf().set({
                margin: 0,
                filename: 'Registro_Diabety.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                  scale: 2, useCORS: true, backgroundColor: '#ffffff',
                  scrollX: 0, scrollY: 0, windowWidth: 1200, logging: false
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                pagebreak: { mode: [] }
              }).from(pagina);
              const canvas = await operazione.toCanvas().get('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx || canvas.width < 10 || canvas.height < 10) {
                throw new Error(`Impossibile acquisire la pagina ${indice + 1}.`);
              }
              const larghezza = Math.min(canvas.width, 500);
              const altezza = Math.min(canvas.height, 500);
              const campione = ctx.getImageData(0, 0, larghezza, altezza).data;
              let pixelScuri = 0;
              for (let k = 0; k < campione.length; k += 16) {
                if (campione[k] < 235 || campione[k + 1] < 235 || campione[k + 2] < 235) {
                  if (++pixelScuri > 20) break;
                }
              }
              if (pixelScuri <= 20) {
                throw new Error(`La pagina ${indice + 1} risulta vuota.`);
              }
              if (indice === 0) {
                // html2pdf crea il PDF e fornisce l'istanza jsPDF già inclusa
                // nella dipendenza: non occorre installare nuove librerie.
                pdfFinale = await operazione.toPdf().get('pdf');
                // Rimuove eventuali pagine extra prodotte dagli arrotondamenti.
                while (pdfFinale.getNumberOfPages() > 1) pdfFinale.deletePage(pdfFinale.getNumberOfPages());
              } else {
                pdfFinale.addPage('a4', 'landscape');
                pdfFinale.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 297, 210);
              }
            }
            if (!pdfFinale) throw new Error('Impossibile completare il PDF.');
            pdfFinale.save('Registro_Diabety.pdf');
          } finally {
            contenitore.remove();
          }
        }
      } else {
        if (modalita === 'html') {
          alert('La visualizzazione HTML è disponibile nella versione web.');
        } else {
          const { uri } = await Print.printToFileAsync({ html: htmlTemplateHTML });
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Esporta Report Medico PDF' });
        }
      }
    } catch (e) {
      console.error('DIABETY: errore durante esportazione PDF', e);
      alert('Impossibile generare il PDF: ' + (e instanceof Error ? e.message : 'errore sconosciuto'));
    }
  };
  const manualPoints = [
    { id: 1, title: "1. Registrazione dei Dati", icon: "analytics-outline", color: COLORS.brandPrimary, content: "Registra i tuoi dati in un attimo. Nella schermata 'Inserisci' puoi selezionare Data e Ora per la registrazione dei tuoi dati. Di default l'app indicherà sempre Data e Ora attuali ma puoi comunque modificare a tuo piacimento questi parametri per aggiungere dei dati in moments specifici del tuo registro Storico. Tramite i riquadri 'Glicemia' e 'Insulina' puoi inserire i valori corrispondenti che ti interessa registrare, nella sezione subito sotto puoi impostare il momento della giornata relativo al dato che stai registrando. Nel box 'Note' puoi inserire ulteriori informazioni che verranno registrate nel tuo Storico dei dati. L'app Diabety è stata programmata per inserire all'interno del riquadro delle 'Note' l'orario in cui stai effettuando il test cosi da tenerne traccia quando esporti il file in PDF." },
    { id: 2, title: "2. Target Colorati", icon: "color-filter-outline", color: COLORS.success, content: "Monitora istantaneamente il tuo stato metabolico tramite la codifica dinamica dei colori di sicurezza:\n• Verde (Euglicemia): Valori compresi nel range ideale tra 70 e 180 mg/dL.\n• Arancione (Ipoglicemia): Rilevazioni critiche inferiori a 70 mg/dL.\n• Rosso (Iperglicemia): Rilevazioni elevate superiori a 180 mg/dL." },
    { id: 3, title: "3. Archivio e Auto-Pulizia", icon: "trash-outline", color: COLORS.onSurface, content: "L'applicazione applica un algoritmo rigoroso di conservazione locale calcolato su una finestra mobile di 90 giorni rispetto al record più recente. I vecchi dati vengono eliminati automaticamente per ottimizzare la memoria del dispositivo: ricordati di salvare periodicamente un file di backup per non perderli. L'Eliminazione dei vecchi dati non significa perdere 'Tutti i dati' ma si intende perdere la singola misurazione registrata a partire da 90 giorni precedenti la data attuale." },
    { id: 4, title: "4. Esportazione dei File", icon: "document-text-outline", color: COLORS.brandPrimary, content: "Genera esportazioni del tuo Diario in formato PDF con layout panoramico, speculare al tuo registro clinico. Puoi selezionare un periodo specifico di 7, 14, 30 o 90 giorni (oppure includere l'intero storico) per personalizzare l'intervallo del documento, ottimizzando la visualizzazione dei parametri per la tua prossima consultazione specialistica." },
    { id: 5, title: "5. Backup e Sicurezza Dati", icon: "sync-outline", color: COLORS.brandPrimary, content: "Salva e proteggi i tuoi dati in pochi clic. Puoi esportare un file di sicurezza con tutto lo storico del tuo diario oppure caricarne uno vecchio per ripristinare i log. L'importazione sovrascrive il database attuale e richiede sempre una conferma per evitare cancellazioni involontarie." },
    { id: 6, title: "6. Analisi Avanzata e Grafici", icon: "stats-chart-outline", color: COLORS.brandSecondary, content: "Controlla l'andamento della tua Glicemia. Questa sezione mostra grafici chiari con l'andamento della tua Glicemia nelle ultime 24 ore e nei tre mesi passati. Inoltre, calcola in automatico una stima indicativa della tua Emoglobina Glicata (HbA1c) per aiutarti a capire subito si sei a target. Nota molto importante, tutti i dati e i grafici che vedi non sono dati medici ufficiali in quanto si basano solo ed esclusivamente su dati inseriti da te nel monitoraggio della Glicemia. La funzione del grafico è basata per avvicinarsi molto alla rapresentazione di un CGM ma non lo è! Un CGM (Monitoraggio Continuo del Glucosio) è un sistema tecnologico che misura i livelli di zucchero (glucosio) nel liquido interstiziale 24 ore su 24 tramite l'utilizzo di un Sensore. Il sensore rileva il glucosio ogni pochi minuti e invia i dati in tempo real a un ricevitore, a uno smartphone o a uno smartwatch. L'app Diabety non ha questa function. Tutto ciò che vedi nella sezione Grafici è puramente a scopo indicativo basato soltanto su dati inseriti da te." },
    { id: 7, title: "7. Calcolatore del Bolo Insulinico", icon: "calculator-outline", color: COLORS.brandPrimary, content: "Calcola le unità di insulina necessarie per i pasti e per correggere i picchi alti in un attimo. Sblocca la scheda inserendo i tuoi rapporti personali (Rapporto I:CHO, Sensibilità ISF e Target) concordati con il medico: l'applicazione li terrà salvati sul dispositivo per semplificare ogni calcolo futuro. Puoi inserire il valore della tua Glicemia con la quantità di Carboidrati (CHO) che stai assumendo per elaborare secondo i tuoi parametri la dose di Insulina da fare. Puoi anche inserire solo il valore della Glicemia per calcolare la quantità di Insulina per la correzione della Glicemia per rientrare nel tuo target." },
    { id: 8, title: "8. Database Alimenti e Carboidrati", icon: "nutrition-outline", color: COLORS.success, content: "Consulta un archivio completo con le marche e i cibi più comuni per comporre il tuo piatto virtuale. L'applicazione somma automaticamente i carboidrati totali mentre aggiungi i prodotti, aiutandoti a calcolare al volo la dose corretta di insulina senza dover fare calcoli a mente. Usa la barra di ricerca per trovare l'alimento che ti interessa, impostane la quantità che stai assumendo espressa in grammi e clicca sull'icona ' + ' per aggiungerla al Piatto Virtuale. L'applicazione genererà in basso una scheda momentanea dove simulerà l'insieme del tuo pasto. Qui puoi aggiungere tutti gli alimenti relativi al pasto tenendo traccia del totale dei Carboidrati (CHO)." }
  ];
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerForm}>
        <Text style={styles.title}>Centro Strumenti</Text>
        <Text style={styles.subtitle}>Gestione database e informazioni mediche dell'app</Text>
      </View>

      {statoNotifica && (
        <View style={styles.notificaTendina}>
          <Text style={styles.notificaTesto}>{statoNotifica}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Manutenzione e Report</Text>
      <View style={styles.cardAzioni}>
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

        <View style={styles.rowAzionePdfComplessa}>
          <TouchableOpacity style={styles.rowPdfClickArea} onPress={() => setModalPdfVisibile(true)}>
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titoloAzione, { color: COLORS.brandPrimary }]}>Esporta PDF</Text>
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

      <Modal visible={modalPdfVisibile} transparent animationType="fade" onRequestClose={() => setModalPdfVisibile(false)}>
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalCard}>
            <View style={styles.pdfModalHeader}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.brandPrimary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalTitle}>Esporta registro</Text>
                <Text style={styles.pdfModalSubtitle}>DIABETY · Diario glicemico</Text>
              </View>
              <TouchableOpacity onPress={() => setModalPdfVisibile(false)} accessibilityLabel="Chiudi finestra">
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pdfModalPeriodo}>Periodo selezionato: {filtroPdfSelezionato}</Text>
            <TouchableOpacity style={styles.pdfModalOption} onPress={() => esportaDocumentoMatriceStoricoPDF('html')}>
              <Ionicons name="eye-outline" size={22} color={COLORS.brandPrimary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalOptionTitle}>Visualizza HTML</Text>
                <Text style={styles.pdfModalOptionDesc}>Apri il documento formattato nel browser</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pdfModalOption} onPress={() => esportaDocumentoMatriceStoricoPDF('pdf')}>
              <Ionicons name="download-outline" size={22} color={COLORS.brandSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalOptionTitle}>Scarica PDF</Text>
                <Text style={styles.pdfModalOptionDesc}>Salva un vero documento .pdf</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pdfModalCancel} onPress={() => setModalPdfVisibile(false)}>
              <Text style={styles.pdfModalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.sectionLabel}>Manuale & Linee Guia</Text>

      {manualPoints.map((point) => {
        const isOpen = expandedPointId === point.id;
        return (
          <View key={point.id} style={styles.accordionWrapper}>
            <TouchableOpacity 
              style={[styles.accordionHeader, isOpen && styles.accordionHeaderActive]} 
              onPress={() => togglePoint(point.id)}
              activeOpacity={0.85}
            >
              <View style={styles.headerLeft}>
                <Ionicons name={point.icon} size={18} color={point.color} style={styles.iconaManualeAllineata} />
                <Text style={styles.infoBlockTitle}>{point.title}</Text>
              </View>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-forward"} size={18} color={isOpen ? point.color : COLORS.muted} />
            </TouchableOpacity>

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
const styles = StyleSheet.create({
  pdfModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 20 },
  pdfModalCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderGlassBright, padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
  pdfModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  pdfModalTitle: { color: COLORS.onSurface, fontSize: 18, fontWeight: '700' },
  pdfModalSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  pdfModalPeriodo: { color: COLORS.brandPrimary, fontSize: 13, marginBottom: 16, fontWeight: '600' },
  pdfModalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgUtility, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderGlassBright, marginBottom: 10 },
  pdfModalOptionTitle: { color: COLORS.onSurface, fontWeight: '700', fontSize: 14 },
  pdfModalOptionDesc: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  pdfModalCancel: { padding: 12, alignItems: 'center' },
  pdfModalCancelText: { color: COLORS.muted, fontWeight: '700' },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headerForm: { marginBottom: 20, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, marginTop: 4 },
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardAzioni: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%', overflow: 'hidden', marginBottom: 12 },
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  rowAzioneLabel: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, cursor: 'pointer', width: '100%', boxSizing: 'border-box', borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass },
  
  dividerAzione: { height: 1, backgroundColor: COLORS.borderGlass, width: '100%' },
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

  accordionWrapper: { width: '100%', marginBottom: 10 },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSecondary,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
    width: '100%'
  },
  accordionHeaderActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: COLORS.borderGlassBright,
    borderBottomWidth: 0,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  iconaManualeAllineata: { marginRight: 10 },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '800', color: COLORS.onSurface, letterSpacing: -0.2, flex: 1 },
  accordionContent: {
    backgroundColor: COLORS.bgUtility,
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.borderGlass,
    width: '100%'
  },
  contentText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.muted, lineHeight: 22, textAlign: 'left', paddingLeft: 2 },

  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 13 }
});

