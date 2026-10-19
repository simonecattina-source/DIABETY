import { DiabetyPdfExportModal } from '@/src/components/diabety-pdf-export-modal';
import { DIABETY_COLORS } from '@/src/theme/diabety';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SectionList, Platform, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiabetyAlert } from '@/src/components/diabety-alert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// 🎨 PALETTE AD ALTO CONTRASTO CON AZZURRO CYAN NEON PER IL PULSANTE PDF COORDINATO
const COLORS = DIABETY_COLORS;

const MOMENTI_COLONNE = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];

// Le colonne PDF Notte sono distinte: 00:00–06:00 e 22:30–23:59 della stessa data.
// Le altre voci, inclusi Spuntino e Merenda, rimangono invariate.
const COLONNE_PDF = ['Notte iniziale', ...MOMENTI_COLONNE.filter(m => m !== 'Notte'), 'Notte finale'];
const minutiPdf = (ora: unknown): number | null => {
  if (typeof ora !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(ora.trim());
  if (!match) return null;
  const h = Number(match[1]), m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
};
const giornoPdf = (testo: unknown): Date | null => {
  if (typeof testo !== 'string') return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(testo);
  if (!match) return null;
  const d = Number(match[1]), m = Number(match[2]);
  const n = Number(match[3]);
  const a = match[3].length === 4 ? n : n < 50 ? 2000 + n : 1900 + n;
  const date = new Date(a, m - 1, d);
  return date.getFullYear() === a && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
};
const scegliMisurePdf = (righe: any[], tuttiIRecord: any[], dataRiga: string): Map<string, any> => {
  const scelta = new Map<string, any>();
  const considera = (chiave: string, item: any, istante: number) => {
    const precedente = scelta.get(chiave);
    if (!precedente || istante < precedente.istante) scelta.set(chiave, { item, istante });
  };
  righe.forEach((item: any) => {
    if (item.tipo === 'Notte' || !MOMENTI_COLONNE.includes(item.tipo)) return;
    const minuti = minutiPdf(item.ora);
    considera(item.tipo, item, minuti === null ? Number.POSITIVE_INFINITY : minuti);
  });
  const giorno = giornoPdf(dataRiga);
  if (giorno) {
    // Ogni valore Notte appare soltanto nella riga della propria data.
    // Prima colonna: 00:00–06:00; ultima colonna: 22:30–23:59.
    // Per più misure nello stesso intervallo prevale l'orario più antico.
    righe.forEach((item: any) => {
      if (item.tipo !== 'Notte') return;
      const minuti = minutiPdf(item.ora);
      if (minuti === null) return;
      if (minuti >= 0 && minuti <= 6 * 60) considera('Notte iniziale', item, minuti);
      if (minuti >= 22 * 60 + 30 && minuti <= 23 * 60 + 59) considera('Notte finale', item, minuti);
    });
  }
  return new Map(Array.from(scelta.entries()).map(([k, v]) => [k, v.item]));
};

export default function StoricoScreen() {
  const mostraAvviso = useDiabetyAlert();
  const [filtroAttivo, setFiltroAttivo] = useState<'7' | '14' | '30' | '90' | 'all'>('all');
  const [datiReali, setDatiReali] = useState<any[]>([]);

  const [itemSelezionato, setItemSelezionato] = useState<any | null>(null);
  const [modGlicemia, setModGlicemia] = useState('');
  const [modInsulina, setModInsulina] = useState('');
  const [modCho, setModCho] = useState('');
  const [modNote, setModNote] = useState('');
  const [modMomento, setModMomento] = useState('');
  
  const [modDataISO, setModDataISO] = useState('');
  const [modOraText, setModOraText] = useState('');

  const [mostraHelpPDF, setMostraHelpPDF] = useState(false);
  const [modalPdfVisibile, setModalPdfVisibile] = useState(false);
  const [mostraModalModifica, setMostraModalModifica] = useState(false);
  const [mostraNotificaModifica, setMostraNotificaModifica] = useState(false);
  const [testoNotifica, setTestoNotifica] = useState('✓ Modifica salvata nel registro');

  const [mostraConfermaSvuota, setMostraConfermaSvuota] = useState(false);
  const [mostraNotificaSvuotato, setMostraNotificaSvuotato] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiLocali();
    }, [])
  );

  const caricaDatiLocali = async () => {
    try {
      const datiSalvati = await AsyncStorage.getItem('glicotrack_data');
      if (datiSalvati) {
        setDatiReali(JSON.parse(datiSalvati));
      }
    } catch (e) {
      console.log("Errore nel caricamento dei dati.");
    }
  };
  const cancellaTuttoStorico = async () => {
    try {
      await AsyncStorage.removeItem('glicotrack_data');
      setDatiReali([]);
      setMostraNotificaSvuotato(true);
      setTimeout(() => { setMostraNotificaSvuotato(false); }, 3000);
    } catch (e) {
      mostraAvviso("Impossibile cancellare i dati.");
    }
  };

  const confermaCancellaTutto = async () => {
    setMostraConfermaSvuota(false);
    await cancellaTuttoStorico();
  };

  const ottieniTimestampCompleto = (stringaData: string, stringaOra: string) => {
    let giorno = 0, mese = 0, annoCompleto = 0;
    if (stringaData === "Oggi") {
      const d = new Date();
      giorno = d.getDate(); mese = d.getMonth(); annoCompleto = d.getFullYear();
    } else if (stringaData && stringaData.includes('/')) {
      const [g, m, a] = stringaData.split('/');
      giorno = parseInt(g); mese = parseInt(m) - 1;
      annoCompleto = parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a);
    } else {
      return 0;
    }
    let ore = 0, minuti = 0;
    if (stringaOra && stringaOra.includes(':')) {
      const [h, min] = stringaOra.split(':');
      ore = parseInt(h); minuti = parseInt(min);
    }
    return new Date(annoCompleto, mese, giorno, ore, minuti).getTime();
  };

  const rientraNelFiltro = (stringaData: string) => {
    if (filtroAttivo === 'all') return true;
    const oggi = new Date();
    const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
    const timestampMisurazione = ottieniTimestampCompleto(stringaData, "00:00");
    const differenzaGiorni = (dataInizioOggi - timestampMisurazione) / (1000 * 60 * 60 * 24);
    return differenzaGiorni <= parseInt(filtroAttivo) && differenzaGiorni >= -1;
  };
  const eliminaSingoloItem = async () => {
    if (!itemSelezionato) return;
    try {
      const datiRimanenti = datiReali.filter(item => item.id !== itemSelezionato.id);
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiRimanenti));
      setDatiReali(datiRimanenti);
      setTestoNotifica('✕ Misurazione eliminata dal registro');
      setMostraNotificaModifica(true);
      setTimeout(() => {
        setMostraNotificaModifica(false); setMostraModalModifica(false); setItemSelezionato(null);
      }, 1300);
    } catch (e) {
      mostraAvviso("Errore durante l'eliminazione.");
    }
  };

  const apriModificaItem = (item: any) => {
    setItemSelezionato(item);
    setModGlicemia(item.glicemia.toString());
    setModInsulina(item.insulina ? item.insulina.replace(' UI', '').replace('-', '') : '');
    setModCho(item.cho === null || item.cho === undefined || item.cho === '' ? '' : String(item.cho));
    setModMomento(item.tipo || 'Prima Colazione');
    setModOraText(item.ora || '12:00');
    const testoNotePulito = item.note ? item.note.replace(/^\[\d{2}:\d{2}\]\s*/, '') : '';
    setModNote(testoNotePulito);
    if (item.dataTesto && item.dataTesto.includes('/')) {
      const [g, m, a] = item.dataTesto.split('/'); setModDataISO(`20${a}-${m}-${g}`);
    } else {
      const d = new Date();
      setModDataISO(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
    setTestoNotifica('✓ Modifica salvata nel registro');
    setMostraNotificaModifica(false); setMostraModalModifica(true);
  };

  const salvaModificaItem = async () => {
    const valoreGlicemia = parseInt(modGlicemia);
    if (!valoreGlicemia || isNaN(valoreGlicemia)) {
      mostraAvviso("Inserisci un valore di glicemia valido."); return;
    }
    if (modCho.trim() !== '' && (!/^\d+(?:[.,]\d+)?$/.test(modCho.trim()) || !Number.isFinite(Number(modCho.replace(',', '.'))))) {
      mostraAvviso('Inserisci una quantità di CHO valida oppure lascia il campo vuoto.'); return;
    }
    const [aaaa, mm, gg] = modDataISO.split('-');
    const dataRiconvertita = `${gg}/${mm}/${aaaa.slice(-2)}`;
    const noteConOrarioFuso = modNote.trim() ? `[${modOraText}] ${modNote.trim()}` : `[${modOraText}]`;
    try {
      let datiAggiornati = datiReali.map(item => {
        if (item.id === itemSelezionato.id) {
          return { ...item, glicemia: valoreGlicemia, insulina: modInsulina ? `${modInsulina} UI` : '-', cho: modCho.trim() === '' ? null : Number(modCho.replace(',', '.')), tipo: modMomento, note: noteConOrarioFuso, ora: modOraText, dataTesto: dataRiconvertita };
        }
        return item;
      });
      // Stessa politica di index.tsx: conserva gli ultimi 91 giorni di calendario
      // rispetto a oggi. Le date non riconoscibili non vengono eliminate.
      const soglia = new Date();
      soglia.setHours(0, 0, 0, 0);
      soglia.setDate(soglia.getDate() - 91);
      const timestampSoglia = soglia.getTime();

      datiAggiornati = datiAggiornati.filter((item: any) => {
        const stringaData = item?.dataTesto;
        if (typeof stringaData !== 'string' || !/^\d{2}\/\d{2}\/\d{2}$/.test(stringaData)) return true;
        const [giorno, mese, anno] = stringaData.split('/').map(Number);
        const annoCompleto = anno < 50 ? 2000 + anno : 1900 + anno;
        const data = new Date(annoCompleto, mese - 1, giorno);
        if (data.getFullYear() !== annoCompleto || data.getMonth() !== mese - 1 || data.getDate() !== giorno) return true;
        return data.getTime() >= timestampSoglia;
      });
      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiAggiornati));
      setDatiReali(datiAggiornati); setTestoNotifica('✓ Modifica salvata nel registro'); setMostraNotificaModifica(true);
      setTimeout(() => { setMostraNotificaModifica(false); setMostraModalModifica(false); setItemSelezionato(null); }, 1500);
    } catch (e) { mostraAvviso("Errore durante il salvataggio."); }
  };

  const ottieniDatiSezionati = () => {
    const sezioni: Record<string, any[]> = {};
    const datiFiltratiTemporali = datiReali.filter(item => rientraNelFiltro(item.dataTesto || "Oggi"));
    datiFiltratiTemporali.forEach(item => {
      const dataChiave = item.dataTesto || "Oggi"; if (!sezioni[dataChiave]) sezioni[dataChiave] = []; sezioni[dataChiave].push(item);
    });
    return Object.keys(sezioni)
      .sort((a, b) => ottieniTimestampCompleto(b, "00:00") - ottieniTimestampCompleto(a, "00:00")) 
      .map(chiave => {
        const elementiGiornoOrdinati = sezioni[chiave].sort((itemA, itemB) => ottieniTimestampCompleto(chiave, itemB.ora || "00:00") - ottieniTimestampCompleto(chiave, itemA.ora || "00:00"));
        return { title: chiave, data: elementiGiornoOrdinati };
      }).filter(s => s.data.length > 0);
  };
  const esportaDocumentoMatriceStoricoPDF = async (modalita: 'html' | 'pdf') => {
    setModalPdfVisibile(false);
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let dati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      if (dati.length === 0) { mostraAvviso("Non ci sono dati disponibili nel diario per generare il report."); return; }
      const tuttiIRecordPdf: any[] = dati; // Le due colonne Notte usano solo i record della data della riga.

      if (filtroAttivo !== 'all') {
        const giorniFiltro = parseInt(filtroAttivo); const oggi = new Date(); const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/'); const tsItem = new Date(parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a), parseInt(m) - 1, parseInt(g)).getTime();
          const diff = (dataInizioOggi - tsItem) / (1000 * 60 * 60 * 24); return diff <= giorniFiltro && diff >= -1;
        });
      }

      if (dati.length === 0) { mostraAvviso(`Nessun dato registrato nell'intervallo selezionato.`); return; }

      // Il PDF seleziona per ciascuna data e momento la misurazione con orario più antico.
      // A parità di orario vince la prima registrazione inserita.
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
          COLONNE_PDF.forEach(m => { rG[m] = '-'; rI[m] = '-'; rN[m] = '-'; });
          const primaPerMomento = scegliMisurePdf(sez.data, tuttiIRecordPdf, sez.title);
          primaPerMomento.forEach((item: any, chiave: string) => {
            let col = '#34C759'; if (item.glicemia > 180) col = '#FF3B30'; if (item.glicemia < 70) col = '#FF9F0A';
            rG[chiave] = `<span style="color: ${col}; font-weight: bold;">${item.glicemia} mg/dL</span>`;
            const insulinaPdf = item.insulina && item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : '';
            const choPdf = item.cho !== null && item.cho !== undefined && item.cho !== '' && Number.isFinite(Number(item.cho)) ? `<span style="font-weight: normal;">${Number(item.cho)} CHO</span>` : '';
            rI[chiave] = [insulinaPdf, choPdf].filter(Boolean).join(' - ') || '-';
            rN[chiave] = item.note ? `<span style="font-style: italic; color: #555;">${String(item.note).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</span>` : '-';
          });
          let tG = ''; let tI = ''; let tN = '';
          COLONNE_PDF.forEach(m => { tG += `<td>${rG[m]}</td>`; tI += `<td>${rI[m]}</td>`; tN += `<td>${rN[m]}</td>`; });
          righe += `<tr><td class="cell-data" rowspan="3">${sez.title}</td><td class="cell-label">Glicemia</td>${tG}</tr><tr><td class="cell-label">Insulina</td>${tI}</tr><tr class="row-separator"><td class="cell-label">Note</td>${tN}</tr>`;
        righePerGiorno.push(righe);
      });

      const intestazioneTabella = '<thead><tr><th class="head-data">Data</th><th class="head-label">Parametro</th><th>Notte</th><th>Prima Colazione</th><th>Dopo Colazione</th><th>Spuntino</th><th>Prima Pranzo</th><th>Dopo Pranzo</th><th>Merenda</th><th>Prima Cena</th><th>Dopo Cena</th><th>Notte</th></tr></thead>';
      const titoloPrimaPagina = '<h1>Diabety - Registro Storico Giornaliero</h1>';
      const titoloAltrePagine = '<div style="height:10px;"></div>';
      const stileDocumento = `@page { size: A4 landscape; margin: 0; } body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; } .pagina-pdf { box-sizing: border-box; width: 1122px; height: 793px; padding: 36px; background: #ffffff; overflow: hidden; } .pagina-pdf:not(:last-child) { page-break-after: always; break-after: page; } h1 { font-size: 18px; color: #0A66C2; margin: 0 0 10px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 4px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; } th, td { border: 1px solid #c7c7cc; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: middle; word-wrap: break-word; } th { background-color: #f2f2f7; font-weight: bold; font-size: 9px; text-transform: uppercase; } .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 10.5px; width: 42px; } .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 5px; width: 60px; } .head-data { width: 42px; } .head-label { width: 60px; } .row-separator td { background-color: #ffffff; border-bottom: 1px solid #0A66C2; } .cell-data { border-bottom: 1px solid #0A66C2; }`;
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
            mostraAvviso('Il browser ha bloccato la nuova finestra. Consenti i popup per visualizzare il documento.');
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
          mostraAvviso('La visualizzazione HTML è disponibile nella versione web.');
        } else {
          const { uri } = await Print.printToFileAsync({ html: htmlTemplateHTML });
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Esporta Report Medico PDF' });
        }
      }
    } catch (e) {
      console.error('DIABETY: errore durante esportazione PDF', e);
      mostraAvviso('Impossibile generare il PDF: ' + (e instanceof Error ? e.message : 'errore sconosciuto'));
    }
  };
  return (
    <View style={styles.container}>
      
      <View style={styles.newHeader}>
        <View style={styles.newHeaderAccent} />
        <View style={{flex: 1}}>
          <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
            <Text style={styles.newHeaderTitle}>Storico</Text>
            <TouchableOpacity style={styles.newHelpCircle} onPress={() => setMostraHelpPDF(true)} accessibilityLabel="Guida allo Storico">
              <Text style={{color:COLORS.brandPrimary,fontSize:12,fontWeight:'800'}}>?</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.newSubtitle}>Il tuo diario glicemico</Text>
        </View>
      </View>

      {mostraNotificaSvuotato && (
        <View style={[styles.notificaTendinaGenerale,{backgroundColor:'#092414',borderColor:COLORS.success}]}>
          <Text style={[styles.notificaTesto,{color:COLORS.success}]}>✓ Intero diario glicemico svuotato</Text>
        </View>
      )}

      <View style={styles.newActions}>
        <TouchableOpacity style={styles.newDangerAction} onPress={() => setMostraConfermaSvuota(true)} disabled={datiReali.length===0}>
          <Ionicons name="trash-outline" size={17} color={COLORS.error}/>
          <Text style={styles.newDangerText}>Svuota</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newPdfAction} onPress={() => setModalPdfVisibile(true)}>
          <Ionicons name="document-text-outline" size={17} color={COLORS.brandPrimary}/>
          <Text style={styles.newPdfText}>Esporta PDF</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.newPeriodLabel}>Periodo</Text>
      <View style={styles.newFilterBar}>
        {([{id:'7',etichetta:'7 GG'},{id:'14',etichetta:'14 GG'},{id:'30',etichetta:'30 GG'},{id:'90',etichetta:'90 GG'},{id:'all',etichetta:'Tutti'}] as const).map(f => (
          <TouchableOpacity key={f.id} style={[styles.newFilter,filtroAttivo===f.id && styles.newFilterSelected]} onPress={()=>setFiltroAttivo(f.id)}>
            <Text style={[styles.newFilterText,filtroAttivo===f.id && {color:COLORS.brandPrimary,fontWeight:'800'}]}>{f.etichetta}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={ottieniDatiSezionati()}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({section}) => (
          <View style={styles.newDayHeader}>
            <Ionicons name="calendar-outline" size={17} color={COLORS.brandPrimary}/>
            <Text style={styles.newDayText}>{section.title}</Text>
            <Text style={styles.newDayCount}>{section.data.length} {section.data.length===1?'misurazione':'misurazioni'}</Text>
          </View>
        )}
        renderItem={({item,index,section}) => {
          const dotColor = item.glicemia>180 ? COLORS.error : item.glicemia<70 ? COLORS.warning : COLORS.success;
          const notePulite = item.note ? String(item.note).replace(/^\[\d{2}:\d{2}\]\s*/, '').trim() : '';
          return (
            <TouchableOpacity style={styles.newRecordRow} onPress={()=>apriModificaItem(item)} activeOpacity={0.8}>
              <View style={styles.newTimeline}>
                <View style={[styles.newDot,{backgroundColor:dotColor}]}/>
                {index<section.data.length-1 && <View style={styles.newLine}/>}
              </View>
              <View style={styles.newRecordCard}>
                <View style={styles.newRecordTop}>
                  <View style={{flexDirection:'row',alignItems:'baseline',gap:5}}>
                    <Text style={styles.newGlucose}>{item.glicemia}</Text>
                    <Text style={styles.newUnit}>mg/dL</Text>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
                    <Text style={styles.newTime}>{item.ora}</Text>
                    <Ionicons name="pencil-outline" size={16} color={COLORS.brandPrimary}/>
                  </View>
                </View>
                <View style={styles.newCardDivider}/>
                <View style={styles.newRecordDetails}>
                  <Text style={styles.newMeal} numberOfLines={2}>{item.tipo || 'Misurazione'}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
                    <Ionicons name="medkit-outline" size={14} color={COLORS.brandSecondary}/>
                    <Text style={styles.newInsulin}>{item.insulina && item.insulina!=='-' ? item.insulina : '—'}</Text>
                    {item.cho !== null && item.cho !== undefined && item.cho !== '' && Number.isFinite(Number(item.cho)) && (
                      <Text style={styles.newCho}>· {Number(item.cho)} CHO</Text>
                    )}
                  </View>
                </View>
                {!!notePulite && (
                  <View style={{flexDirection:'row',alignItems:'flex-start',gap:6,marginTop:8}}>
                    <Ionicons name="document-text-outline" size={14} color="#93A7B9"/>
                    <Text style={styles.newNotes}>{notePulite}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={{padding:35,alignItems:'center'}}><Text style={{color:COLORS.muted,textAlign:'center'}}>Nessuna misurazione salvata in questo intervallo di tempo.</Text></View>}
        contentContainerStyle={styles.newListContent}
        stickySectionHeadersEnabled={false}
      />
      <DiabetyPdfExportModal
        visible={modalPdfVisibile}
        periodo={({'all':'Tutti','7':'7 GG','14':'14 GG','30':'30 GG','90':'90 GG'} as Record<string,string>)[filtroAttivo]}
        onClose={() => setModalPdfVisibile(false)}
        onViewHtml={() => esportaDocumentoMatriceStoricoPDF('html')}
        onDownloadPdf={() => esportaDocumentoMatriceStoricoPDF('pdf')}
      />

      <Modal visible={mostraHelpPDF} animationType="fade" transparent onRequestClose={()=>setMostraHelpPDF(false)}>
        <View style={styles.newOverlay}>
          <View style={styles.newModal}>
            <View style={styles.newModalHeading}>
              <View style={styles.newModalIcon}><Ionicons name="book-outline" size={23} color={COLORS.brandPrimary}/></View>
              <View style={{flex:1}}><Text style={styles.newModalTitle}>Guida allo Storico</Text><Text style={styles.newModalSub}>Consulta e gestisci le tue misurazioni</Text></View>
              <TouchableOpacity onPress={()=>setMostraHelpPDF(false)} accessibilityLabel="Chiudi guida"><Ionicons name="close" size={24} color="#93A7B9"/></TouchableOpacity>
            </View>
            <View style={styles.newModalDivider}/>
            <ScrollView style={{flexShrink:1}} contentContainerStyle={{gap:10,paddingBottom:4}} showsVerticalScrollIndicator={false}>
              <View style={styles.newHelpBox}><Text style={styles.newHelpTitle}>⌕  Filtra le misurazioni</Text><Text style={styles.newHelpBody}>Seleziona 7, 14, 30, 90 giorni oppure Tutti per consultare il periodo desiderato.</Text></View>
              <View style={styles.newHelpBox}>
                <Text style={styles.newHelpTitle}>◉  Interpreta i colori</Text>
                <Text style={styles.newHelpBody}>I pallini colorati accanto alle misurazioni indicano l'intervallo glicemico del valore registrato.</Text>
                {[{color:COLORS.success,label:'Da 70 a 180 mg/dL'},{color:COLORS.warning,label:'Inferiore a 70 mg/dL'},{color:COLORS.error,label:'Superiore a 180 mg/dL'}].map(x=><View key={x.label} style={{flexDirection:'row',alignItems:'center',gap:9,marginTop:8}}><View style={{width:11,height:11,borderRadius:6,backgroundColor:x.color}}/><Text style={styles.newHelpBody}>{x.label}</Text></View>)}
              </View>
              <View style={styles.newHelpBox}><Text style={styles.newHelpTitle}>✎  Gestisci una misurazione</Text><Text style={styles.newHelpBody}>Tocca la matita accanto a una registrazione per modificarla o eliminarla.</Text></View>
              <View style={styles.newHelpBox}><Text style={styles.newHelpTitle}>⇩  Esporta il registro</Text><Text style={styles.newHelpBody}>Visualizza il documento HTML o scarica il report PDF del periodo selezionato.</Text></View>
              <View style={styles.newHelpBox}><Text style={styles.newHelpTitle}>✕  Cancella i dati</Text><Text style={styles.newHelpBody}>Svuota elimina tutte le registrazioni dopo una conferma.</Text></View>
            </ScrollView>
            <TouchableOpacity style={styles.newPrimaryButton} onPress={()=>setMostraHelpPDF(false)}><Text style={styles.newPrimaryText}>Ho capito</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={mostraModalModifica} animationType="slide" transparent onRequestClose={()=>setMostraModalModifica(false)}>
        <View style={styles.newOverlay}>
          <View style={styles.newModal}>
            <View style={styles.newModalHeading}>
              <View style={styles.newModalIcon}><Ionicons name="pencil-outline" size={23} color={COLORS.brandPrimary}/></View>
              <View style={{flex:1}}><Text style={styles.newModalTitle}>Modifica Misurazione</Text><Text style={styles.newModalSub}>Aggiorna i dati registrati</Text></View>
              <TouchableOpacity onPress={()=>setMostraModalModifica(false)} accessibilityLabel="Chiudi modifica"><Ionicons name="close" size={24} color="#93A7B9"/></TouchableOpacity>
            </View>
            <View style={styles.newModalDivider}/>
            <ScrollView style={{flexShrink:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:12,paddingBottom:8}} showsVerticalScrollIndicator={false}>
              <View style={styles.newEditGrid}>
                <View style={styles.newEditCard}>
                  <Text style={styles.newEditLabel}>▣  Data del Test</Text>
                  <View style={styles.newWebFieldWrap}>
                    {Platform.OS==='web' ? <input type="date" value={modDataISO} onChange={e=>setModDataISO(e.target.value)} style={{display:'block',width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box',fontSize:'16px',color:'#FFFFFF',colorScheme:'dark',backgroundColor:'#080F18',border:'1px solid #344C63',borderRadius:'8px',padding:'10px 3px',outline:'none'}}/> : <TextInput style={styles.newEditInput} value={modDataISO} onChangeText={setModDataISO}/>}
                  </View>
                </View>
                <View style={styles.newEditCard}>
                  <Text style={styles.newEditLabel}>◷  Orario del Test</Text>
                  <View style={styles.newWebFieldWrap}>
                    {Platform.OS==='web' ? <input type="time" value={modOraText} onChange={e=>setModOraText(e.target.value)} style={{display:'block',width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box',fontSize:'16px',color:'#FFFFFF',colorScheme:'dark',backgroundColor:'#080F18',border:'1px solid #344C63',borderRadius:'8px',padding:'10px 3px',outline:'none'}}/> : <TextInput style={styles.newEditInput} value={modOraText} onChangeText={setModOraText}/>}
                  </View>
                </View>
                <View style={styles.newEditCard}>
                  <Text style={styles.newEditLabel}>◉  Glicemia</Text>
                  <TextInput style={styles.newEditInput} keyboardType="numeric" value={modGlicemia} onChangeText={setModGlicemia} maxLength={3}/>
                  <Text style={styles.newUnit}>mg/dL</Text>
                </View>
                <View style={styles.newEditCard}>
                  <Text style={styles.newEditLabel}>✚  Insulina</Text>
                  <TextInput style={styles.newEditInput} keyboardType="numeric" value={modInsulina} onChangeText={setModInsulina} maxLength={2} placeholder="Nessuna" placeholderTextColor="#758A9A"/>
                  <Text style={styles.newUnit}>UI</Text>
                </View>
                <View style={styles.newEditCard}>
                    <Text style={styles.newEditLabel}>CHO</Text>
                    <TextInput style={styles.newEditInput} keyboardType="decimal-pad" value={modCho} onChangeText={setModCho} maxLength={7} placeholder="Nessuno" placeholderTextColor="#758A9A"/>
                    <Text style={styles.newUnit}>g CHO</Text>
                  </View>
                </View>
              <Text style={styles.newEditSectionTitle}>☼  Momento della Giornata</Text>
              <View style={styles.newMomentGrid}>
                {MOMENTI_COLONNE.map(m=><TouchableOpacity key={m} style={[styles.newMoment,m===modMomento && styles.newMomentSelected]} onPress={()=>setModMomento(m)}><Text style={[styles.newMomentText,m===modMomento && {color:COLORS.brandPrimary,fontWeight:'800'}]}>{m}</Text></TouchableOpacity>)}
              </View>
              <Text style={styles.newEditSectionTitle}>▤  Note Alimentari / Sintomi <Text style={{color:'#93A7B9',fontSize:11,fontWeight:'400'}}>(facoltative)</Text></Text>
              <TextInput style={[styles.newEditInput,{minHeight:50,textAlignVertical:'top'}]} multiline value={modNote} onChangeText={setModNote} placeholder="Aggiungi una nota..." placeholderTextColor="#758A9A"/>
            </ScrollView>
            {mostraNotificaModifica && <View style={[styles.notificaTendina,testoNotifica.includes('eliminata') && {backgroundColor:'#1C1314',borderColor:COLORS.error}]}><Text style={[styles.notificaTesto,testoNotifica.includes('eliminata') && {color:COLORS.error}]}>{testoNotifica}</Text></View>}
            <View style={styles.newEditActions}>
              <TouchableOpacity style={styles.newCancelSmall} onPress={()=>setMostraModalModifica(false)}><Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700'}}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity style={styles.newDeleteSmall} onPress={eliminaSingoloItem}><Ionicons name="trash-outline" size={14} color={COLORS.error}/><Text style={{color:COLORS.error,fontSize:12,fontWeight:'700'}}>Elimina</Text></TouchableOpacity>
              <TouchableOpacity style={styles.newSaveSmall} onPress={salvaModificaItem}><Ionicons name="checkmark" size={15} color="#071018"/><Text style={{color:'#071018',fontSize:12,fontWeight:'800'}}>Salva</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mostraConfermaSvuota} animationType="fade" transparent onRequestClose={()=>setMostraConfermaSvuota(false)}>
        <View style={styles.newOverlay}>
          <View style={styles.newModal}>
            <View style={styles.newModalHeading}>
              <View style={[styles.newModalIcon,{backgroundColor:'#351B23',borderColor:'#69333C',borderWidth:1}]}><Ionicons name="trash-outline" size={24} color={COLORS.error}/></View>
              <View style={{flex:1}}><Text style={styles.newModalTitle}>Svuota lo Storico</Text><Text style={styles.newModalSub}>Conferma eliminazione</Text></View>
              <TouchableOpacity onPress={()=>setMostraConfermaSvuota(false)} accessibilityLabel="Chiudi conferma"><Ionicons name="close" size={24} color="#93A7B9"/></TouchableOpacity>
            </View>
            <View style={styles.newModalDivider}/>
            <Text style={{color:'#FFFFFF',fontSize:15,fontWeight:'700'}}>Vuoi eliminare tutte le misurazioni salvate?</Text>
            <View style={styles.newWarningBox}>
              <Ionicons name="warning-outline" size={22} color={COLORS.warning}/>
              <View style={{flex:1,gap:5}}><Text style={{color:'#FFFFFF',fontSize:14,fontWeight:'700'}}>Attenzione</Text><Text style={styles.newHelpBody}>Questa operazione è irreversibile. Tutte le misurazioni registrate verranno eliminate definitivamente.</Text></View>
            </View>
            <TouchableOpacity style={styles.newPrimaryButton} onPress={()=>setMostraConfermaSvuota(false)}><Ionicons name="arrow-back" size={17} color="#071018"/><Text style={styles.newPrimaryText}>Annulla</Text></TouchableOpacity>
            <TouchableOpacity style={styles.newDeleteConfirm} onPress={confermaCancellaTutto}><Ionicons name="trash-outline" size={17} color={COLORS.error}/><Text style={{color:COLORS.error,fontSize:14,fontWeight:'800'}}>Elimina tutte le misurazioni</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  // Nuovo design Storico DIABETY; logica e PDF originali preservati.
  newHeader:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#101B28',borderWidth:1,borderColor:'#26536A',borderRadius:16,padding:12,marginHorizontal:12,marginBottom:10},
  newHeaderAccent:{width:3,height:43,borderRadius:3,backgroundColor:COLORS.brandPrimary},
  newHeaderTitle:{fontFamily:'Space Grotesk',fontSize:21,fontWeight:'700',color:'#FFFFFF'},
  newHelpCircle:{width:20,height:20,borderRadius:10,borderWidth:1,borderColor:COLORS.brandPrimary,alignItems:'center',justifyContent:'center'},
  newSubtitle:{fontFamily:'Plus Jakarta Sans',fontSize:11,color:'#93A7B9',marginTop:3},
  newActions:{flexDirection:'row',gap:8,marginHorizontal:12,marginBottom:14},
  newDangerAction:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#211820',borderWidth:1,borderColor:'#69333C',borderRadius:12,paddingVertical:12},
  newDangerText:{fontSize:13,fontWeight:'700',color:COLORS.error},
  newPdfAction:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#0C232B',borderWidth:1,borderColor:COLORS.brandPrimary,borderRadius:12,paddingVertical:12},
  newPdfText:{fontSize:13,fontWeight:'700',color:COLORS.brandPrimary},
  newPeriodLabel:{fontSize:13,fontWeight:'700',color:'#FFFFFF',marginHorizontal:12,marginBottom:8},
  newFilterBar:{flexDirection:'row',gap:5,marginHorizontal:12,marginBottom:14},
  newFilter:{flex:1,backgroundColor:'#13131A',borderWidth:1,borderColor:'#2D3440',borderRadius:10,paddingVertical:10,alignItems:'center'},
  newFilterSelected:{backgroundColor:'#0C303D',borderColor:COLORS.brandPrimary},
  newFilterText:{fontSize:10,fontWeight:'600',color:'#93A7B9'},
  newListContent:{paddingHorizontal:12,paddingBottom:110},
  newDayHeader:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#0A0A0C',paddingVertical:12},
  newDayText:{flex:1,fontSize:15,fontWeight:'700',color:'#FFFFFF'},
  newDayCount:{fontSize:11,color:'#93A7B9'},
  newRecordRow:{flexDirection:'row',gap:8,minHeight:100},
  newTimeline:{width:17,alignItems:'center'},
  newDot:{width:13,height:13,borderRadius:7,marginTop:10},
  newLine:{width:2,flex:1,backgroundColor:'#273A49',marginTop:5},
  newRecordCard:{flex:1,backgroundColor:'#111B27',borderWidth:1,borderColor:'#26536A',borderRadius:15,padding:12,marginBottom:10},
  newRecordTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  newGlucose:{fontFamily:'Space Grotesk',fontSize:25,fontWeight:'700',color:'#FFFFFF'},
  newUnit:{fontSize:11,color:'#93A7B9'},
  newTime:{fontSize:12,color:'#C3CFDB'},
  newCardDivider:{height:1,backgroundColor:'#2B4354',marginVertical:9},
  newRecordDetails:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  newMeal:{flex:1,color:'#FFFFFF',fontSize:12,fontWeight:'600'},
  newInsulin:{fontSize:12,color:'#C3CFDB'},
  newCho:{fontSize:12,color:'#C3CFDB',fontWeight:'400'},
  newNotes:{flex:1,fontSize:12,color:'#93A7B9'},
  newOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.86)',justifyContent:'center',padding:14},
  newModal:{backgroundColor:'#111B27',borderWidth:1,borderColor:'#26536A',borderRadius:22,padding:15,maxWidth:440,width:'100%',maxHeight:'90%',alignSelf:'center',gap:12},
  newModalHeading:{flexDirection:'row',alignItems:'center',gap:10},
  newModalIcon:{width:45,height:45,backgroundColor:'#0B2B39',borderRadius:12,alignItems:'center',justifyContent:'center'},
  newModalTitle:{fontFamily:'Space Grotesk',fontSize:18,fontWeight:'700',color:'#FFFFFF'},
  newModalSub:{fontSize:11,color:'#93A7B9',marginTop:3},
  newModalDivider:{height:1,backgroundColor:'#26536A'},
  newHelpBox:{backgroundColor:'#080F18',borderWidth:1,borderColor:'#344C63',borderRadius:13,padding:12,gap:7},
  newHelpTitle:{fontSize:14,color:'#FFFFFF',fontWeight:'700'},
  newHelpBody:{fontSize:13,color:'#C3CFDB',lineHeight:19},
  newPrimaryButton:{backgroundColor:COLORS.brandPrimary,borderRadius:12,padding:13,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
  newPrimaryText:{fontSize:14,fontWeight:'800',color:'#071018'},
  newWarningBox:{backgroundColor:'#25191F',borderWidth:1,borderColor:'#69333C',borderRadius:13,padding:13,flexDirection:'row',gap:10},
  newDeleteConfirm:{backgroundColor:'#341D25',borderWidth:1,borderColor:COLORS.error,borderRadius:12,padding:13,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},
  newEditGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  newEditCard:{width:'48.5%',flexGrow:1,minWidth:0,backgroundColor:'#101B28',borderWidth:1,borderColor:'#26536A',borderRadius:13,padding:9,gap:8,overflow:'hidden'},
  newEditLabel:{fontSize:11,color:'#FFFFFF',fontWeight:'700'},
  newWebFieldWrap:{width:'100%',minWidth:0,overflow:'hidden'},
  newEditInput:{backgroundColor:'#080F18',borderWidth:1,borderColor:'#344C63',borderRadius:8,paddingHorizontal:8,paddingVertical:10,fontSize:16,color:'#FFFFFF',width:'100%'},
  newEditSectionTitle:{fontSize:13,fontWeight:'700',color:'#FFFFFF'},
  newMomentGrid:{flexDirection:'row',flexWrap:'wrap',gap:5},
  newMoment:{width:'32%',flexGrow:1,minHeight:40,justifyContent:'center',alignItems:'center',backgroundColor:'#080F18',borderWidth:1,borderColor:'#344C63',borderRadius:9,padding:4},
  newMomentSelected:{backgroundColor:'#0C303D',borderColor:COLORS.brandPrimary},
  newMomentText:{fontSize:10,color:'#C3CFDB',textAlign:'center'},
  newEditActions:{flexDirection:'row',gap:7},
  newCancelSmall:{flex:1,backgroundColor:'#1C2733',borderWidth:1,borderColor:'#344C63',borderRadius:10,paddingVertical:12,alignItems:'center'},
  newDeleteSmall:{flex:1,flexDirection:'row',gap:4,justifyContent:'center',alignItems:'center',backgroundColor:'#351B23',borderWidth:1,borderColor:COLORS.error,borderRadius:10},
  newSaveSmall:{flex:1,flexDirection:'row',gap:4,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.brandPrimary,borderRadius:10},


  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  infoHelpButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  exportButtonSvuotaMinimal: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 82, 82, 0.15)' },
  exportTextSvuotaRed: { fontFamily: 'Plus Jakarta Sans', color: COLORS.error, fontWeight: '600', fontSize: 14 },

  // STYLE AGGIORNATO AL LOOK PREMIUM NEON AZZURRO CYAN COERENTE AL TARGET BRAND
  exportButtonPDFAcrobatNeon: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: "rgba(0, 229, 255, 0.05)", 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 12, 
    gap: 6, 
    borderWidth: 1, 
    borderColor: "#00E5FF" 
  },
  exportTextPDFAcrobatNeon: { fontFamily: 'Plus Jakarta Sans', color: "#00E5FF", fontWeight: '700', fontSize: 14 },

  filterBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 5, marginBottom: 16 },
  filterButton: { flex: 1, backgroundColor: COLORS.surfaceSecondary, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  filterButtonActiveNeon: { backgroundColor: "#0C232B", borderColor: COLORS.brandPrimary, borderWidth: 1 },
  filterButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  filterButtonTextActiveNeon: { color: COLORS.brandPrimary, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 }, 
  sectionHeader: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, fontWeight: '700', color: COLORS.onSurface, backgroundColor: COLORS.background, paddingVertical: 8 },
  row: { flexDirection: 'row', minHeight: 90 },
  timelineContainer: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 18, zIndex: 2 },
  timelineLine: { position: 'absolute', top: 30, bottom: 0, width: 2, backgroundColor: COLORS.surfaceSecondary, zIndex: 1 },
  card: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 12, marginLeft: 8, borderWidth: 1, borderColor: COLORS.borderGlass },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  valoreGlicemia: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: '700', color: COLORS.onSurface },
  unitaMisura: { fontSize: 12, color: COLORS.muted, fontWeight: '400' },
  oraTest: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted },
  tipoPasto: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, marginTop: 4, fontWeight: '500' },
  noteTest: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#111116', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.borderGlass },
  modalTitle: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  inputLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '600', color: COLORS.muted, marginTop: 10, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start' },
  textInput: { backgroundColor: '#1C1C24', borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.onSurface, marginBottom: 4, textAlign: 'left', width: '100%', borderWidth: 1, borderColor: COLORS.borderGlass },
  chipMomento: { backgroundColor: '#1C1C24', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  chipMomentoAttiva: { backgroundColor: '#0C232B', borderWidth: 1, borderColor: COLORS.brandPrimary },
  chipMomentoText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted },
  chipMomentoTextAttiva: { color: COLORS.brandPrimary, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 24 },
  btnAnnulla: { flex: 1, backgroundColor: '#1C1C24', padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  btnAnnullaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnElimina: { flex: 1.2, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnEliminaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  btnSalva: { flex: 1.2, backgroundColor: COLORS.brandPrimary, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSalvaText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#0A0A0C' },
  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 15, alignItems: 'center' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },
  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentSvuota: { backgroundColor: '#111116', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  iconaAvvisoContainer: { marginBottom: 12, backgroundColor: '#240F10', padding: 10, borderRadius: 999 },
  modalTitleSvuota: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  modalSubtitleSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActionsSvuota: { flexDirection: 'row', gap: 12, width: '100%' },
  btnAnnullaSvuota: { flex: 1, backgroundColor: '#1C1C24', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  btnAnnullaTextSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: COLORS.onSurface },
  btnConfermaSvuota: { flex: 1, backgroundColor: '#FF5252', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnConfermaTextSvuota: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '600', color: '#FFF' },
  notificaTendinaGenerale: { padding: 12, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, alignItems: 'center' },

  modalContentHelp: { backgroundColor: '#111116', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  modalTitleHelp: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '800', color: COLORS.onSurface, marginBottom: 24, alignSelf: 'flex-start', letterSpacing: -0.3 },
  helpSectionRow: { flexDirection: 'row', width: '100%', gap: 14, marginBottom: 20, alignItems: 'flex-start' },
  helpIconBox: { padding: 8, borderRadius: 10, justifyContent: 'center', alignItems: 'center', width: 34, height: 34 },
  helpTextContainer: { flex: 1, alignItems: 'flex-start' },
  helpSectionHeader: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginBottom: 4 },
  helpSectionBody: { fontFamily: 'Plus Jakarta Sans', fontSize: 14.5, color: COLORS.muted, lineHeight: 22, textAlign: 'left' },
  btnChiudiHelp: { marginTop: 10, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnChiudiHelpText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface }
});
