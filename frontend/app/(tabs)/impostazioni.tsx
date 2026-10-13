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
  const [backupDaRipristinare, setBackupDaRipristinare] = useState<{ dati: any[]; esclusi: number } | null>(null);
  const [ripristinoInCorso, setRipristinoInCorso] = useState(false);
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

      // Mostra la conferma personalizzata senza modificare ancora lo storico.
      setBackupDaRipristinare({ dati: datiValidi, esclusi });
    } catch (errore) {
      alert('Impossibile leggere o importare il backup. Lo storico attuale non è stato modificato se la scrittura non è riuscita.');
    }
  };
  const confermaRipristinoBackup = async () => {
    if (!backupDaRipristinare || ripristinoInCorso) return;
    setRipristinoInCorso(true);
    try {
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(backupDaRipristinare.dati));
      const quantita = backupDaRipristinare.dati.length;
      setBackupDaRipristinare(null);
      mostraMessaggioNotifica(`✓ Ripristinate ${quantita} misurazioni`);
    } catch (errore) {
      alert('Impossibile completare il ripristino del backup.');
    } finally {
      setRipristinoInCorso(false);
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
    { id: 1, title: "1. Registrazione dei Dati", icon: "analytics-outline", color: COLORS.brandPrimary, content: "Registra i tuoi dati in un attimo.\nNella schermata «Inserisci» puoi selezionare la data e l'ora per la registrazione dei tuoi dati. Per impostazione predefinita, l'app indica sempre la data e l'ora attuali, ma puoi modificare questi parametri a tuo piacimento per aggiungere dati relativi a momenti specifici del tuo registro storico.\nTramite i riquadri «Glicemia» e «Insulina» puoi inserire i valori che desideri registrare. Nella sezione immediatamente sottostante puoi impostare il momento della giornata relativo al dato che stai registrando.\nNel riquadro «Note» puoi inserire ulteriori informazioni, che verranno salvate nello storico dei tuoi dati.\nL'app DIABETY è stata programmata per inserire automaticamente nel riquadro «Note» l'orario in cui stai effettuando il test, così da tenerne traccia anche quando esporti il file in PDF." },
    { id: 2, title: "2. Target Colorati", icon: "color-filter-outline", color: COLORS.success, content: "Monitora istantaneamente il tuo stato glicemico tramite la codifica dinamica dei colori di riferimento:\nVerde (Euglicemia)|Valori compresi nell'intervallo ideale tra 70 e 180 mg/dL.\nArancione (Ipoglicemia)|Rilevazioni inferiori a 70 mg/dL.\nRosso (Iperglicemia)|Rilevazioni superiori a 180 mg/dL." },
    { id: 3, title: "3. Calcolatore del Bolo Insulinico", icon: "calculator-outline", color: COLORS.brandPrimary, content: "Calcola in un attimo le unità di insulina necessarie per i pasti e per correggere i valori glicemici elevati.\nSblocca la scheda inserendo i tuoi parametri personali (rapporto I:CHO, sensibilità ISF e target glicemico) concordati con il medico. L'applicazione li conserverà sul dispositivo per semplificare i calcoli futuri.\nPuoi inserire il valore della tua glicemia e la quantità di carboidrati (CHO) che stai assumendo, per calcolare la dose di insulina in base ai tuoi parametri personali.\nPuoi anche inserire soltanto il valore della glicemia per calcolare la quantità di insulina necessaria alla correzione, con l'obiettivo di rientrare nel tuo target glicemico." },
    { id: 4, title: "4. Database Alimenti e Carboidrati", icon: "nutrition-outline", color: COLORS.success, content: "Consulta un archivio completo delle marche e degli alimenti più comuni per comporre il tuo piatto virtuale.\nL'applicazione somma automaticamente i carboidrati totali mentre aggiungi i prodotti, aiutandoti a calcolare rapidamente la dose di insulina senza dover eseguire i calcoli a mente.\nUtilizza la barra di ricerca per trovare l'alimento che ti interessa, imposta la quantità che stai assumendo, espressa in grammi, e premi l'icona «+» per aggiungerlo al Piatto Virtuale.\nL'applicazione mostrerà nella parte inferiore dello schermo una scheda temporanea che rappresenta l'insieme del tuo pasto.\nQui puoi aggiungere tutti gli alimenti che compongono il pasto, tenendo traccia del totale dei carboidrati (CHO)." },
    { id: 5, title: "5. Archivio e Auto-Pulizia", icon: "trash-outline", color: COLORS.onSurface, content: "L'applicazione utilizza un algoritmo di conservazione locale basato su una finestra mobile di 90 giorni rispetto al record più recente.\nI dati più vecchi vengono eliminati automaticamente per ottimizzare la memoria del dispositivo. Ricordati di salvare periodicamente un file di backup per evitare di perderli.\nL'eliminazione dei vecchi dati non comporta la cancellazione dell'intero archivio, ma soltanto delle singole misurazioni che superano il periodo di conservazione previsto." },
    { id: 6, title: "6. Analisi Avanzata e Grafici", icon: "stats-chart-outline", color: COLORS.brandSecondary, content: "Controlla l'andamento della tua glicemia.\nQuesta sezione mostra grafici chiari sull'andamento della tua glicemia nelle ultime 24 ore e nei tre mesi precedenti.\nInoltre, calcola automaticamente una stima indicativa della tua emoglobina glicata (HbA1c) per aiutarti a capire se sei nel tuo intervallo target.\nNota importante: tutti i dati e i grafici visualizzati non costituiscono risultati medici ufficiali, poiché si basano esclusivamente sulle informazioni che inserisci durante il monitoraggio della glicemia.\nLa rappresentazione grafica è progettata per avvicinarsi visivamente a quella di un CGM, ma non equivale a un sistema di monitoraggio continuo del glucosio.\nUn CGM (Monitoraggio Continuo del Glucosio) è un sistema tecnologico che misura i livelli di glucosio nel liquido interstiziale, 24 ore su 24, tramite un sensore.\nIl sensore rileva il glucosio ogni pochi minuti e invia i dati in tempo reale a un ricevitore, a uno smartphone o a uno smartwatch.\nL'app DIABETY non dispone di questa funzione.\nTutto ciò che visualizzi nella sezione Grafici ha uno scopo puramente indicativo ed è basato esclusivamente sui dati inseriti da te." },
    { id: 7, title: "7. Esportazione dei File", icon: "document-text-outline", color: COLORS.brandPrimary, content: "Genera esportazioni del tuo diario in formato PDF, con un layout panoramico che riproduce la struttura del tuo registro clinico.\nPuoi selezionare un periodo specifico di 7, 14, 30 o 90 giorni, oppure includere l'intero storico, per personalizzare l'intervallo del documento e ottimizzare la visualizzazione dei parametri in vista della tua prossima consultazione specialistica." },
    { id: 8, title: "8. Backup e Sicurezza Dati", icon: "sync-outline", color: COLORS.brandPrimary, content: "Salva e proteggi i tuoi dati in pochi clic.\nPuoi esportare un file di sicurezza contenente tutto lo storico del tuo diario oppure importare un backup precedente per ripristinare i dati registrati.\nL'importazione sovrascrive il database attuale e richiede sempre una conferma, per evitare cancellazioni involontarie." },
  ];  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerForm}>
        <View style={styles.headerAccent} />
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>Pannello di controllo</Text>
          <Text style={styles.subtitle}>Gestione database e informazioni mediche dell'app</Text>
        </View>
      </View>

      {statoNotifica && (
        <View style={styles.notificaTendina}>
          <Text style={styles.notificaTesto}>{statoNotifica}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Manutenzione e Report</Text>
      <View style={styles.controlCenterGrid}>
        <TouchableOpacity style={[styles.controlTile, styles.controlExport]} onPress={esportaBackupJSON} activeOpacity={0.85}>
          <Ionicons name="cloud-download-outline" size={27} color={COLORS.brandPrimary} />
          <Text style={styles.controlTileTitle}>Esporta Backup</Text>
          <Text style={styles.controlTileDesc}>Salva i tuoi dati</Text>
          <View style={styles.controlTileArrow}><Ionicons name="arrow-forward" size={17} color={COLORS.brandPrimary} /></View>
        </TouchableOpacity>
        {Platform.OS === 'web' ? (
          <label style={styles.controlImportLabel}>
            <Ionicons name="cloud-upload-outline" size={27} color="#B080FF" />
            <Text style={styles.controlTileTitle}>Importa Backup</Text>
            <Text style={styles.controlTileDesc}>Ripristina lo storico</Text>
            <View style={styles.controlTileArrow}><Ionicons name="arrow-forward" size={17} color="#B080FF" /></View>
            <input type="file" accept=".json" onChange={gestisciImportazioneWeb} style={{ display: 'none' }} />
          </label>
        ) : (
          <TouchableOpacity style={[styles.controlTile, styles.controlImport]} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={27} color="#B080FF" />
            <Text style={styles.controlTileTitle}>Importa Backup</Text>
            <Text style={styles.controlTileDesc}>Ripristina lo storico</Text>
            <View style={styles.controlTileArrow}><Ionicons name="arrow-forward" size={17} color="#B080FF" /></View>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.controlPdf}>
        <TouchableOpacity style={styles.controlPdfHeader} onPress={() => setModalPdfVisibile(true)} activeOpacity={0.85}>
          <Ionicons name="document-text-outline" size={25} color={COLORS.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.controlPdfTitle}>Esporta PDF</Text>
            <Text style={styles.controlPdfDesc}>Report del diario glicemico</Text>
          </View>
          <Ionicons name="arrow-forward" size={19} color={COLORS.brandPrimary} />
        </TouchableOpacity>
        <View style={styles.controlPdfFilters}>
          {['7 GG', '14 GG', '30 GG', '90 GG', 'Tutti'].map(intervallo => {
            const attivo = filtroPdfSelezionato === intervallo;
            return (
              <TouchableOpacity key={intervallo} style={[styles.controlFilter, attivo && styles.controlFilterActive]} onPress={() => setFiltroPdfSelezionato(intervallo)}>
                <Text style={[styles.controlFilterText, attivo && styles.controlFilterTextActive]} numberOfLines={1}>{intervallo}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Conferma importazione: stesso stile della finestra Esporta registro. */}
      <Modal visible={backupDaRipristinare !== null} transparent animationType="fade"
        onRequestClose={() => { if (!ripristinoInCorso) setBackupDaRipristinare(null); }}>
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalCard}>
            <View style={styles.pdfModalHeader}>
              <Ionicons name="cloud-upload-outline" size={24} color={COLORS.brandPrimary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalTitle}>Importa backup</Text>
                <Text style={styles.pdfModalSubtitle}>DIABETY · Ripristino dello storico</Text>
              </View>
              <TouchableOpacity disabled={ripristinoInCorso} onPress={() => setBackupDaRipristinare(null)} accessibilityLabel="Chiudi finestra">
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pdfModalPeriodo}>Backup verificato correttamente</Text>
            <View style={styles.pdfModalOption}>
              <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalOptionTitle}>Misurazioni da ripristinare</Text>
                <Text style={styles.pdfModalOptionDesc}>{backupDaRipristinare?.dati.length ?? 0} misurazioni valide</Text>
              </View>
            </View>
            <View style={styles.pdfModalOption}>
              <Ionicons name="time-outline" size={22} color={COLORS.warning} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalOptionTitle}>Misurazioni escluse</Text>
                <Text style={styles.pdfModalOptionDesc}>{backupDaRipristinare?.esclusi ?? 0} più vecchie di 91 giorni</Text>
              </View>
            </View>
            <View style={styles.backupWarningBox}>
              <Ionicons name="warning-outline" size={21} color={COLORS.warning} />
              <Text style={styles.backupWarningText}>Il ripristino sostituirà tutto lo storico attuale. Prima di procedere, assicurati di averne salvato un backup.</Text>
            </View>
            <TouchableOpacity style={styles.backupConfirmButton} disabled={ripristinoInCorso} onPress={confermaRipristinoBackup}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.onSurface} />
              <Text style={styles.backupConfirmText}>{ripristinoInCorso ? 'Ripristino in corso…' : 'Conferma ripristino'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pdfModalCancel} disabled={ripristinoInCorso} onPress={() => setBackupDaRipristinare(null)}>
              <Text style={styles.pdfModalCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      <View style={styles.manualSectionHeader}>
        <View style={styles.manualBookIcon}><Ionicons name="book-outline" size={24} color={COLORS.brandPrimary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.manualSectionTitle}>MANUALE & LINEE GUIDA</Text>
          <Text style={styles.manualSectionSubtitle}>Scopri come usare al meglio DIABETY</Text>
        </View>
      </View>
      <View style={styles.manualSectionDivider} />
      <View style={styles.guideList}>
        {manualPoints.map(point => {
          const palette: Record<number, string> = { 1: '#00E5FF', 2: '#00E676', 3: '#00E5FF', 4: '#00E676', 5: '#B080FF', 6: '#B080FF', 7: '#00E5FF', 8: '#FFB347' };
          const iconNames: Record<number, string> = { 1: 'create-outline', 2: 'locate-outline', 3: 'medkit-outline', 4: 'nutrition-outline', 5: 'folder-open-outline', 6: 'stats-chart-outline', 7: 'document-text-outline', 8: 'shield-checkmark-outline' };
          const subtitles: Record<number, string> = { 1: 'Come inserire le misurazioni', 2: 'Colori e intervalli glicemici', 3: 'Uso del calcolatore', 4: 'Alimenti e carboidrati', 5: 'Gestione dello storico', 6: 'Analisi e statistiche', 7: 'Report e documenti', 8: 'Protezione dei dati' };
          const color = palette[point.id];
          const opened = expandedPointId === point.id;
          const paragraphs = point.content.split('\n').filter(Boolean);
          return (
            <View key={point.id} style={styles.guideRowCard}>
              <TouchableOpacity style={styles.guideRowHeader} onPress={() => togglePoint(point.id)} activeOpacity={0.82} accessibilityRole="button" accessibilityState={{ expanded: opened }}>
                <View style={[styles.guideRowIcon, { backgroundColor: color + '18' }]}>
                  <Ionicons name={iconNames[point.id] as any} size={24} color={color} />
                </View>
                <View style={[styles.guideRowAccent, { backgroundColor: color }]} />
                <View style={styles.guideRowText}>
                  <Text style={styles.guideRowTitle}>{point.title.replace(/^\d+\. /, '')}</Text>
                  <Text style={styles.guideRowSubtitle}>{subtitles[point.id]}</Text>
                </View>
                <View style={styles.guideRowChevron}>
                  <Ionicons name={opened ? 'chevron-up' : 'chevron-down'} size={19} color="#D6E3F0" />
                </View>
              </TouchableOpacity>
              {opened && (
                <View style={styles.guideExpandedBody}>
                  <View style={styles.guideExpandedDivider} />
                  {paragraphs.map((paragraph, index) => {
                    if (point.id === 2 && paragraph.includes('|')) {
                      const [label, description] = paragraph.split('|');
                      const targetColor = label.startsWith('Verde') ? '#00E676' : label.startsWith('Arancione') ? '#FF9800' : '#FF5252';
                      return (
                        <View key={index} style={styles.guideTargetRow}>
                          <Text style={[styles.guideTargetLabel, { color: targetColor }]}>{label}</Text>
                          <Text style={styles.guideParagraph}>{description}</Text>
                        </View>
                      );
                    }
                    return <Text key={index} style={styles.guideParagraph}>{paragraph}</Text>;
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  controlCenterGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 10 },
  controlTile: { flex: 1, minWidth: 0, minHeight: 144, borderRadius: 16, padding: 13, borderWidth: 1, backgroundColor: '#11162B' },
  controlExport: { borderColor: '#226C83' },
  controlImport: { backgroundColor: '#17132C', borderColor: '#6946AD' },
  controlImportLabel: { flex: 1, minWidth: 0, minHeight: 144, display: 'flex', flexDirection: 'column', padding: 13, borderRadius: 16, borderWidth: 1, backgroundColor: '#17132C', borderColor: '#6946AD', border: '1px solid #6946AD', cursor: 'pointer', boxSizing: 'border-box' },
  controlTileTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 9, fontFamily: 'Plus Jakarta Sans' },
  controlTileDesc: { color: '#9CA7C1', fontSize: 11, marginTop: 4, fontFamily: 'Plus Jakarta Sans' },
  controlTileArrow: { alignSelf: 'flex-end', marginTop: 'auto', paddingTop: 8 },
  controlPdf: { backgroundColor: '#0E1A27', borderWidth: 1, borderColor: '#168A8F', borderRadius: 16, padding: 13, marginBottom: 12 },
  controlPdfHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 13 },
  controlPdfTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  controlPdfDesc: { color: '#A5B3C7', fontSize: 11, marginTop: 3, fontFamily: 'Plus Jakarta Sans' },
  controlPdfFilters: { flexDirection: 'row', gap: 5 },
  controlFilter: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 1, backgroundColor: '#1A2435', borderRadius: 9, borderWidth: 1, borderColor: '#303A4F' },
  controlFilterActive: { backgroundColor: '#123E48', borderColor: '#00DFFF' },
  controlFilterText: { color: '#A7B3CB', fontSize: 10, fontWeight: '600' },
  controlFilterTextActive: { color: '#00E5FF', fontWeight: '800' },
  manualSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 14 },
  manualBookIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#092637', alignItems: 'center', justifyContent: 'center' },
  manualSectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', fontFamily: 'Plus Jakarta Sans', letterSpacing: 0.3 },
  manualSectionSubtitle: { color: '#A4BBD1', fontSize: 12, marginTop: 4, fontFamily: 'Plus Jakarta Sans' },
  manualSectionDivider: { height: 1, backgroundColor: '#284052', marginBottom: 14 },
  guideList: { gap: 10, marginBottom: 14 },
  guideRowCard: { backgroundColor: '#101E2D', borderRadius: 16, borderWidth: 1, borderColor: '#243A4C', overflow: 'hidden' },
  guideRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 80 },
  guideRowIcon: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  guideRowAccent: { width: 1, height: 39 },
  guideRowText: { flex: 1, minWidth: 0 },
  guideRowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  guideRowSubtitle: { color: '#A4BBD1', fontSize: 12, marginTop: 4, fontFamily: 'Plus Jakarta Sans' },
  guideRowChevron: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#284052', alignItems: 'center', justifyContent: 'center' },
  guideExpandedBody: { paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  guideExpandedDivider: { height: 1, backgroundColor: '#284052', marginBottom: 3 },
  guideParagraph: { flex: 1, color: '#D3DAED', fontSize: 13, lineHeight: 21, fontFamily: 'Plus Jakarta Sans' },
  guideTargetRow: { gap: 5, paddingVertical: 6 },
  guideTargetLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  guideBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingLeft: 5 },
  guideBulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  guideSubtitle: { color: '#9BA6C3', fontSize: 12, marginTop: -4, marginBottom: 13 },
  guideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  guideTile: { width: '48%', minHeight: 164, backgroundColor: '#10152A', borderWidth: 1, borderRadius: 16, padding: 12 },
  guideTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  guideIcon: { width: 43, height: 43, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  guideNumber: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  guideTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 2, fontFamily: 'Plus Jakarta Sans' },
  guideDesc: { color: '#A9B4D0', fontSize: 10, marginTop: 5, fontFamily: 'Plus Jakarta Sans' },
  guideModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.84)', padding: 16, justifyContent: 'center' },
  guideModalCard: { backgroundColor: '#0D1429', borderColor: '#7650C8', borderWidth: 1, borderRadius: 20, padding: 17, maxHeight: '85%', width: '100%', maxWidth: 540, alignSelf: 'center' },
  guideModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#29334F' },
  guideModalIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#17223A', alignItems: 'center', justifyContent: 'center' },
  guideModalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', flex: 1 },
  guideModalScroll: { flexGrow: 0, marginVertical: 16 },
  guideModalBody: { color: '#D3DAED', fontSize: 14, lineHeight: 23, fontFamily: 'Plus Jakarta Sans' },
  guideModalClose: { backgroundColor: '#123B68', borderWidth: 1, borderColor: '#00A8FF', padding: 12, alignItems: 'center', borderRadius: 12 },
  guideModalCloseText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  backupWarningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#2B2117', borderColor: '#755024', borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 14 },
  backupWarningText: { color: '#FFD4A3', fontSize: 12, lineHeight: 19, flex: 1, fontFamily: 'Plus Jakarta Sans' },
  backupConfirmButton: { backgroundColor: '#123B68', borderColor: '#00A8FF', borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  backupConfirmText: { color: COLORS.onSurface, fontSize: 14, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
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
  headerForm: { marginBottom: 20, width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 14 },
  headerAccent: { width: 4, borderRadius: 4, backgroundColor: COLORS.brandPrimary, minHeight: 64 },
  headerTextGroup: { flex: 1, justifyContent: 'center' },
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
