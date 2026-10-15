import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, LayoutAnimation, UIManager, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import ExcelJS from 'exceljs';

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

// Le due colonne PDF Notte condividono un unico periodo notturno (23:00–06:00).
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
    const mezzanotte = giorno.getTime();
    // Notte iniziale: 23:00 del giorno precedente fino alle 06:00 di oggi.
    // Notte finale: 23:00 di oggi fino alle 06:00 del giorno successivo.
    tuttiIRecord.forEach((item: any) => {
      if (item.tipo !== 'Notte') return;
      const data = giornoPdf(item.dataTesto);
      const minuti = minutiPdf(item.ora);
      if (!data || minuti === null) return;
      const istante = data.getTime() + minuti * 60000;
      const inizioNottePrecedente = mezzanotte - 60 * 60000;
      const fineNottePrecedente = mezzanotte + 360 * 60000;
      const inizioNotteSuccessiva = mezzanotte + 23 * 60 * 60000;
      const fineNotteSuccessiva = mezzanotte + 30 * 60 * 60000;
      if (istante >= inizioNottePrecedente && istante <= fineNottePrecedente) considera('Notte iniziale', item, istante);
      if (istante >= inizioNotteSuccessiva && istante <= fineNotteSuccessiva) considera('Notte finale', item, istante);
    });
  }
  return new Map(Array.from(scelta.entries()).map(([k, v]) => [k, v.item]));
};

// Etichette utilizzate nella scheda Grafici.
const ETICHETTE_MOMENTI: Record<string, string> = {
  'Prima Colazione': 'Al risveglio',
  'Dopo Colazione': 'Dopo la colazione',
  'Prima Pranzo': 'Prima di pranzo',
  'Dopo Pranzo': 'Dopo pranzo',
  'Prima Cena': 'Prima di cena',
  'Dopo Cena': 'Dopo cena',
  'Notte': 'Prima di Dormire',
};
const MOMENTI_RIEPILOGO = Object.keys(ETICHETTE_MOMENTI);
const PERIODI_EXPORT = ['7 GG', '14 GG', '30 GG', '90 GG', 'Tutti'];
const CSV_HEADERS = ['DATA', 'ORA', 'GLICEMIA (mg/dL)', 'INSULINA (UI)', 'MOMENTO DELLA GIORNATA', 'ANNOTAZIONI'];

const leggiDataMisurazione = (testo: unknown): Date | null => {
  if (typeof testo !== 'string') return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(testo);
  if (!match) return null;
  const giorno = Number(match[1]);
  const mese = Number(match[2]);
  const annoBreve = Number(match[3]);
  const anno = match[3].length === 4 ? annoBreve : annoBreve < 50 ? 2000 + annoBreve : 1900 + annoBreve;
  const data = new Date(anno, mese - 1, giorno);
  return data.getFullYear() === anno && data.getMonth() === mese - 1 && data.getDate() === giorno ? data : null;
};

const selezionaMisurazioni = (dati: any[], periodo: string) => {
  const oggi = new Date();
  const mezzanotte = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  const limite = periodo === 'Tutti' ? null : Number.parseInt(periodo, 10);
  return dati.map((item, index) => ({ item, index, data: leggiDataMisurazione(item?.dataTesto) }))
    .filter(({ item, data }) => {
      if (!data || !Number.isFinite(Number(item?.glicemia)) || Number(item.glicemia) <= 0) return false;
      const giorni = Math.round((mezzanotte.getTime() - data.getTime()) / 86400000);
      return giorni >= 0 && (limite === null || giorni < limite);
    })
    .sort((a, b) => b.data!.getTime() - a.data!.getTime() ||
      String(b.item.ora || '').localeCompare(String(a.item.ora || '')) || a.index - b.index)
    .map(({ item, data }) => ({ ...item, dataFormattata: `${String(data!.getDate()).padStart(2, '0')}/${String(data!.getMonth() + 1).padStart(2, '0')}/${data!.getFullYear()}` }));
};

const valoreInsulina = (valore: unknown): number | null => {
  if (typeof valore === 'number' && Number.isFinite(valore)) return valore;
  if (typeof valore !== 'string' || !valore.trim() || valore.trim() === '-') return null;
  const numero = Number(valore.replace(/\s*UI\s*$/i, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
};

const scaricaBlobWeb = (blob: Blob, nome: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Il ritardo evita di revocare l'URL prima che Safari abbia iniziato il download.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const campoCSV = (valore: unknown): string => {
  const originale = String(valore ?? '');
  const testo = /^[\s]*[=+@]/.test(originale) ? `\'${originale}` : originale;
  return /[;"\r\n]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo;
};

export default function StrumentiScreen() {
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);
  const [filtroPdfSelezionato, setFiltroPdfSelezionato] = useState<string>('Tutti');
  const [modalPdfVisibile, setModalPdfVisibile] = useState(false);
  const [filtroTabellare, setFiltroTabellare] = useState('Tutti');
  const [modalTabellare, setModalTabellare] = useState<'excel' | 'csv' | null>(null);
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
  const confermaEsportazioneTabellare = async () => {
    const formato = modalTabellare;
    if (!formato) return;
    setModalTabellare(null);
    try {
      if (Platform.OS !== 'web') {
        alert('Questa esportazione è disponibile nella versione web di DIABETY.');
        return;
      }
      const salvati = await AsyncStorage.getItem('glicotrack_data');
      const parsed = salvati ? JSON.parse(salvati) : [];
      if (!Array.isArray(parsed)) throw new Error('Storico non valido');
      const misurazioni = selezionaMisurazioni(parsed, filtroTabellare);
      if (misurazioni.length === 0) {
        alert('Non ci sono misurazioni nel periodo selezionato.');
        return;
      }
      const periodoDescrizione = filtroTabellare === 'Tutti' ? 'Tutti i dati disponibili' : `Ultimi ${Number.parseInt(filtroTabellare, 10)} giorni`;
      const nomePeriodo = filtroTabellare === 'Tutti' ? 'tutti' : filtroTabellare.replace(' ', '_').toLowerCase();
      const nomeBase = `DIABETY_Report_Glicemico_${nomePeriodo}`;
      const righe = misurazioni.map((m: any) => [
        m.dataFormattata,
        String(m.ora || ''),
        Number(m.glicemia),
        valoreInsulina(m.insulina),
        ETICHETTE_MOMENTI[m.tipo] || String(m.tipo || ''),
        String(m.note || ''),
      ]);

      if (formato === 'csv') {
        const lines = [
          'DIABETY - Report Glicemico',
          `Periodo: ${periodoDescrizione}`,
          '',
          CSV_HEADERS.map(campoCSV).join(';'),
          ...righe.map(riga => riga.map(campoCSV).join(';')),
        ];
        scaricaBlobWeb(new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${nomeBase}.csv`);
      } else {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'DIABETY';
        wb.title = 'DIABETY - Report Glicemico';
        wb.created = new Date();
        const verde = 'FF00E676';
        const ciano = 'FF00B8D4';
        const blu = 'FF102D40';
        const bianco = 'FFFFFFFF';
        const impostaTitolo = (ws: any, colonne: number) => {
          ws.mergeCells(1, 1, 1, colonne);
          const titolo = ws.getCell(1, 1);
          titolo.value = 'DIABETY - Report Glicemico';
          titolo.font = { name: 'Calibri', size: 17, bold: true, color: { argb: bianco } };
          titolo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blu } };
          titolo.alignment = { horizontal: 'center', vertical: 'middle' };
          ws.getRow(1).height = 34;
          ws.mergeCells(2, 1, 2, colonne);
          const sottotitolo = ws.getCell(2, 1);
          sottotitolo.value = `Periodo: ${periodoDescrizione}`;
          sottotitolo.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF3F5364' } };
          sottotitolo.alignment = { horizontal: 'center' };
          ws.getRow(2).height = 22;
        };
        const intestazione = (riga: any) => {
          riga.height = 25;
          riga.eachCell((c: any) => {
            c.font = { name: 'Calibri', bold: true, color: { argb: bianco } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ciano } };
            c.alignment = { vertical: 'middle', wrapText: true };
          });
        };
        const ws = wb.addWorksheet('Misurazioni', { views: [{ state: 'frozen', ySplit: 4 }] });
        ws.columns = [{ width: 16 }, { width: 11 }, { width: 23 }, { width: 18 }, { width: 27 }, { width: 50 }];
        impostaTitolo(ws, 6);
        ws.getRow(4).values = CSV_HEADERS;
        intestazione(ws.getRow(4));
        righe.forEach((riga, i) => {
          const row = ws.addRow(riga);
          row.height = 21;
          if (i % 2 === 1) row.eachCell((c: any) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8FB' } }; });
          row.getCell(3).numFmt = '0';
          row.getCell(4).numFmt = '0.##';
        });
        ws.autoFilter = { from: 'A4', to: 'F4' };
        ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        ws.headerFooter.oddHeader = '&CDIABETY - Report Glicemico';

        const riepilogo = wb.addWorksheet('Riepilogo', { views: [{ state: 'frozen', ySplit: 4 }] });
        riepilogo.columns = [{ width: 34 }, { width: 23 }];
        impostaTitolo(riepilogo, 2);
        riepilogo.getRow(4).values = ['STATISTICA', 'VALORE (mg/dL)'];
        intestazione(riepilogo.getRow(4));
        const valori = misurazioni.map((m: any) => Number(m.glicemia));
        const media = (v: number[]) => v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : '—';
        riepilogo.addRow(['Media glicemica', media(valori)]);
        riepilogo.addRow(['Minimo', Math.min(...valori)]);
        riepilogo.addRow(['Massimo', Math.max(...valori)]);
        riepilogo.addRow([]);
        const sez = riepilogo.addRow(['MEDIE PER MOMENTO DELLA GIORNATA', 'mg/dL']);
        intestazione(sez);
        MOMENTI_RIEPILOGO.forEach(momento => {
          const v = misurazioni.filter((m: any) => m.tipo === momento).map((m: any) => Number(m.glicemia));
          riepilogo.addRow([ETICHETTE_MOMENTI[momento], media(v)]);
        });
        riepilogo.headerFooter.oddHeader = '&CDIABETY - Report Glicemico';
        const buffer = await wb.xlsx.writeBuffer();
        scaricaBlobWeb(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nomeBase}.xlsx`);
      }
      mostraMessaggioNotifica(`✓ Esportazione ${formato.toUpperCase()} avviata`);
    } catch (errore) {
      console.error('Errore esportazione tabellare:', errore);
      alert('Impossibile creare il file. Riprova.');
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
      const tuttiIRecordPdf: any[] = dati; // Inclusi i giorni adiacenti al filtro per il raccordo Notte.

      if (filtroPdfSelezionato !== 'Tutti') {
        const giorniFiltro = parseInt(filtroPdfSelezionato); const oggi = new Date(); const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/'); const tsItem = new Date(parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a), parseInt(m) - 1, parseInt(g)).getTime();
          const diff = (dataInizioOggi - tsItem) / (1000 * 60 * 60 * 24); return diff <= giorniFiltro && diff >= -1;
        });
      }

      if (dati.length === 0) { alert(`Nessun dato registrato nell'intervallo selezionato.`); return; }

      // Il PDF seleziona per ogni data e momento la misurazione con orario più antico.
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
            rI[chiave] = item.insulina !== '-' ? `<span style="font-weight: 600;">${item.insulina}</span>` : '-';
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
      const stileDocumento = `@page { size: A4 landscape; margin: 0; } body { font-family: sans-serif; color: #1c1c1e; padding: 0; margin: 0; background: #ffffff; } .pagina-pdf { box-sizing: border-box; width: 1122px; height: 793px; padding: 36px; background: #ffffff; overflow: hidden; } .pagina-pdf:not(:last-child) { page-break-after: always; break-after: page; } h1 { font-size: 18px; color: #0A66C2; margin: 0 0 10px 0; font-weight: bold; border-bottom: 2px solid #0A66C2; padding-bottom: 4px; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 5px; } th, td { border: 1px solid #c7c7cc; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: middle; word-wrap: break-word; } th { background-color: #f2f2f7; font-weight: bold; font-size: 9px; text-transform: uppercase; } .cell-data { font-weight: bold; background-color: #f0f5fa; color: #0A66C2; font-size: 10.5px; width: 42px; } .cell-label { font-weight: 600; background-color: #f2f2f7; text-align: left; padding-left: 5px; width: 60px; } .head-data { width: 42px; } .head-label { width: 60px; } .row-separator td { background-color: #ffffff; }`;
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
    { id: 1, title: "1. Registrazione dei Dati", icon: "pulse-outline", color: "#00C8D7", content: "Registra i tuoi dati in un attimo. Nella schermata 'Inserisci' puoi selezionare Data e Ora per la registrazione dei tuoi dati. Di default l'app indicherà sempre Data e Ora attuali ma puoi comunque modificare a tuo piacimento questi parametri per aggiungere dei dati in moments specifici del tuo registro Storico. Tramite i riquadri 'Glicemia' e 'Insulina' puoi inserire i valori corrispondenti che ti interessa registrare, nella sezione subito sotto puoi impostare il momento della giornata relativo al dato che stai registrando. Nel box 'Note' puoi inserire ulteriori informazioni che verranno registrate nel tuo Storico dei dati. L'app Diabety è stata programmata per inserire all'interno del riquadro delle 'Note' l'orario in cui stai effettuando il test cosi da tenerne traccia quando esporti il file in PDF." },
    { id: 7, title: "7. Calcolatore del Bolo Insulinico", icon: "calculator-outline", color: "#E9A45B", content: "Calcola le unità di insulina necessarie per i pasti e per correggere i picchi alti in un attimo. Sblocca la scheda inserendo i tuoi rapporti personali (Rapporto I:CHO, Sensibilità ISF e Target) concordati con il medico: l'applicazione li terrà salvati sul dispositivo per semplificare ogni calcolo futuro. Puoi inserire il valore della tua Glicemia con la quantità di Carboidrati (CHO) che stai assumendo per elaborare secondo i tuoi parametri la dose di Insulina da fare. Puoi anche inserire solo il valore della Glicemia per calcolare la quantità di Insulina per la correzione della Glicemia per rientrare nel tuo target." },
    { id: 8, title: "8. Database Alimenti e Carboidrati", icon: "restaurant-outline", color: "#53C98B", content: "Consulta un archivio completo con le marche e i cibi più comuni per comporre il tuo piatto virtuale. L'applicazione somma automaticamente i carboidrati totali mentre aggiungi i prodotti, aiutandoti a calcolare al volo la dose corretta di insulina senza dover fare calcoli a mente. Usa la barra di ricerca per trovare l'alimento che ti interessa, impostane la quantità che stai assumendo espressa in grammi e clicca sull'icona ' + ' per aggiungerla al Piatto Virtuale. L'applicazione genererà in basso una scheda momentanea dove simulerà l'insieme del tuo pasto. Qui puoi aggiungere tutti gli alimenti relativi al pasto tenendo traccia del totale dei Carboidrati (CHO)." },
    { id: 3, title: "3. Archivio e Auto-Pulizia", icon: "trash-outline", color: "#D5D7DE", content: "L'applicazione applica un algoritmo rigoroso di conservazione locale calcolato su una finestra mobile di 90 giorni rispetto al record più recente. I vecchi dati vengono eliminati automaticamente per ottimizzare la memoria del dispositivo: ricordati di salvare periodicamente un file di backup per non perderli. L'Eliminazione dei vecchi dati non significa perdere 'Tutti i dati' ma si intende perdere la singola misurazione registrata a partire da 90 giorni precedenti la data attuale." },
    { id: 6, title: "6. Analisi Avanzata e Grafici", icon: "stats-chart-outline", color: "#A78BFA", content: "Controlla l'andamento della tua Glicemia. Questa sezione mostra grafici chiari con l'andamento della tua Glicemia nelle ultime 24 ore e nei tre mesi passati. Inoltre, calcola in automatico una stima indicativa della tua Emoglobina Glicata (HbA1c) per aiutarti a capire subito si sei a target. Nota molto importante, tutti i dati e i grafici che vedi non sono dati medici ufficiali in quanto si basano solo ed esclusivamente su dati inseriti da te nel monitoraggio della Glicemia. La funzione del grafico è basata per avvicinarsi molto alla rapresentazione di un CGM ma non lo è! Un CGM (Monitoraggio Continuo del Glucosio) è un sistema tecnologico che misura i livelli di zucchero (glucosio) nel liquido interstiziale 24 ore su 24 tramite l'utilizzo di un Sensore. Il sensore rileva il glucosio ogni pochi minuti e invia i dati in tempo real a un ricevitore, a uno smartphone o a uno smartwatch. L'app Diabety non ha questa function. Tutto ciò che vedi nella sezione Grafici è puramente a scopo indicativo basato soltanto su dati inseriti da te." },
    { id: 2, title: "2. Target Colorati", icon: "color-palette-outline", color: "#E38BB5", content: "Monitora istantaneamente il tuo stato metabolico tramite la codifica dinamica dei colori di sicurezza:\n• Verde (Euglicemia): Valori compresi nel range ideale tra 70 e 180 mg/dL.\n• Arancione (Ipoglicemia): Rilevazioni critiche inferiori a 70 mg/dL.\n• Rosso (Iperglicemia): Rilevazioni elevate superiori a 180 mg/dL." },
    { id: 4, title: "4. Esportazione dei File", icon: "document-text-outline", color: "#5BA8F2", content: "La sezione Manutenzione e Report, situata nella parte superiore del Pannello di Controllo, permette di salvare, ripristinare ed esportare i dati registrati in DIABETY. Contiene quattro funzioni principali.\n\nESPORTA BACKUP\nCrea un file JSON contenente il database dell'app. Premendo il pulsante puoi salvare una copia dei dati, utile per conservarli al sicuro o trasferirli su un altro dispositivo.\n\nIMPORTA BACKUP\nPermette di caricare un file di backup JSON precedentemente esportato per ripristinare i dati nell'app. Prima di procedere, verifica di aver selezionato il file corretto.\n\nESPORTA PDF\nGenera un documento PDF con le misurazioni del diario glicemico, comodo da consultare, stampare o condividere con il medico. Seleziona prima il periodo desiderato (7, 14, 30, 90 giorni oppure Tutti) e poi premi Esporta PDF.\n\nESPORTA EXCEL / CSV\nEsporta le misurazioni in formato Excel (.xlsx) oppure CSV (.csv), per consultarle ed elaborarle con programmi di foglio di calcolo. Seleziona il periodo desiderato e premi Esporta Excel oppure Esporta CSV, in base al formato che preferisci.\n\nDA SAPERE\nI filtri temporali del PDF e di Excel/CSV sono indipendenti: puoi scegliere periodi diversi per ciascuna esportazione. L'esportazione dei report non modifica le misurazioni salvate." },
    { id: 5, title: "5. Backup e Sicurezza Dati", icon: "sync-outline", color: "#BA93E8", content: "Salva e proteggi i tuoi dati in pochi clic. Puoi esportare un file di sicurezza con tutto lo storico del tuo diario oppure caricarne uno vecchio per ripristinare i log. L'importazione sovrascrive il database attuale e richiede sempre una conferma per evitare cancellazioni involontarie." },
  ];
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerForm}>
        <View style={styles.headerAccent} />
        <Text style={styles.title}>Pannello di Controllo</Text>
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
              <Ionicons name="cloud-download-outline" size={20} color="#FF9800" />
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
                <Ionicons name="cloud-upload-outline" size={20} color="#A855F7" />
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
                <Ionicons name="cloud-upload-outline" size={20} color="#A855F7" />
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
              <View style={[styles.iconWrapper, { backgroundColor: COLORS.bgUtility }]}>
                <Ionicons name="document-text-outline" size={20} color="#ED1C24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titoloAzione}>Esporta PDF</Text>
                <Text style={styles.descAzione}>Esporta le misurazioni del diario glicemico</Text>
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
        <View style={styles.dividerAzione} />
        <View style={styles.cardExportTabellare}>
        <View style={styles.exportTabellareHeader}>
          <View style={styles.iconWrapper}><Ionicons name="documents-outline" size={21} color={COLORS.success} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.exportTabellareTitle}>Esporta Excel / CSV</Text>
            <Text style={styles.exportTabellareSubtitle}>Esporta le misurazioni del diario glicemico</Text>
          </View>
        </View>
        <View style={styles.exportTabellareButtons}>
          <TouchableOpacity style={styles.exportTabellareButton} onPress={() => setModalTabellare('excel')}>
            <View style={styles.exportButtonTop}><Ionicons name="grid-outline" size={24} color={COLORS.success} /><Ionicons name="chevron-forward" size={20} color={COLORS.brandPrimary} /></View>
            <Text style={styles.exportTabellareButtonTitle}>Esporta Excel</Text>
            <Text style={styles.exportTabellareExtension}>.xlsx</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportTabellareButton} onPress={() => setModalTabellare('csv')}>
            <View style={styles.exportButtonTop}><Ionicons name="document-text-outline" size={24} color={COLORS.success} /><Ionicons name="chevron-forward" size={20} color={COLORS.brandPrimary} /></View>
            <Text style={styles.exportTabellareButtonTitle}>Esporta CSV</Text>
            <Text style={styles.exportTabellareExtension}>.csv</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.containerMiniFiltriPdf}>
          {PERIODI_EXPORT.map(intervallo => {
            const attivo = filtroTabellare === intervallo;
            return (
              <TouchableOpacity key={intervallo} style={[styles.chipMiniPdf, attivo && styles.chipMiniPdfAttiva]} onPress={() => setFiltroTabellare(intervallo)}>
                <Text style={[styles.textMiniChipPdf, attivo && styles.textMiniChipPdfAttivo]}>{intervallo}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
      </View>

      <Modal visible={modalTabellare !== null} transparent animationType="fade" onRequestClose={() => setModalTabellare(null)}>
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalCard}>
            <View style={styles.pdfModalHeader}>
              <Ionicons name="documents-outline" size={24} color={COLORS.brandPrimary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalTitle}>Conferma esportazione</Text>
                <Text style={styles.pdfModalSubtitle}>DIABETY · Diario glicemico</Text>
              </View>
              <TouchableOpacity onPress={() => setModalTabellare(null)} accessibilityLabel="Chiudi finestra">
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.exportModalDetails}>
              <Text style={styles.exportModalDetail}>Formato: {modalTabellare === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}</Text>
              <Text style={styles.exportModalDetail}>Periodo: {filtroTabellare}</Text>
            </View>
            <View style={styles.exportModalActions}>
              <TouchableOpacity style={styles.exportModalCancel} onPress={() => setModalTabellare(null)}>
                <Text style={styles.exportModalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportModalConfirm} onPress={confermaEsportazioneTabellare}>
                <Text style={styles.exportModalConfirmText}>Conferma esportazione</Text>
              </TouchableOpacity>
            </View>
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

      <Text style={styles.sectionLabel}>Manuale & Linee Guida</Text>

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
  cardExportTabellare: { backgroundColor: COLORS.surfaceSecondary, padding: 13 },
  exportTabellareHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  exportButtonTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  exportTabellareTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  exportTabellareSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  exportTabellareButtons: { flexDirection: 'row', gap: 9, marginBottom: 13 },
  exportTabellareButton: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', gap: 5, padding: 12, backgroundColor: COLORS.bgUtility, borderWidth: 1, borderColor: COLORS.borderUtility, borderRadius: 13 },
  exportTabellareButtonTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  exportTabellareExtension: { color: '#A5B3C7', fontSize: 11 },
  exportModalDetails: { backgroundColor: '#112D34', borderRadius: 12, padding: 14, marginBottom: 17, gap: 9 },
  exportModalDetail: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  exportModalActions: { flexDirection: 'row', gap: 10 },
  exportModalCancel: { flex: 1, borderColor: '#3A3A4A', borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  exportModalCancelText: { color: '#A5B3C7', fontWeight: '700', fontSize: 12 },
  exportModalConfirm: { flex: 1.5, backgroundColor: '#123E48', borderColor: '#00DFFF', borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  exportModalConfirmText: { color: '#00E5FF', fontWeight: '700', fontSize: 12, textAlign: 'center' },

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
  headerForm: { marginBottom: 20, width: '100%', borderLeftWidth: 0, paddingLeft: 16, justifyContent: 'center', minHeight: 48 },
  headerAccent: { position: 'absolute', left: 0, top: 0, height: 48, width: 4, backgroundColor: COLORS.brandPrimary, borderRadius: 8 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, marginTop: 4 },
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardAzioni: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: "#30303A", width: '100%', overflow: 'hidden', marginBottom: 12 },
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  rowAzioneLabel: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, cursor: 'pointer', width: '100%', boxSizing: 'border-box', borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass },
  
  dividerAzione: { height: 1, backgroundColor: '#30303A', width: '100%' },
  leftAzione: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrapper: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgUtility },
  titoloAzione: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  descAzione: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted, marginTop: 2 },

  rowAzionePdfComplessa: { width: '100%', padding: 14, paddingTop: 12, paddingBottom: 14, flexDirection: 'column' },
  rowPdfClickArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  
  containerMiniFiltriPdf: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 6, paddingLeft: 2 },
  chipMiniPdf: { flex: 1, backgroundColor: '#1A1A24', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#30303A' },
  chipMiniPdfAttiva: { backgroundColor: '#123E48', borderColor: COLORS.brandPrimary },
  textMiniChipPdf: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: '#A5B3C7' },
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
    borderColor: '#30303A',
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
    borderColor: '#30303A',
    width: '100%'
  },
  contentText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.muted, lineHeight: 22, textAlign: 'left', paddingLeft: 2 },

  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 13 }
});
