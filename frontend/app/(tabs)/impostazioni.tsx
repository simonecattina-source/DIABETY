import { esportaRegistroPdfDaHtml } from '@/src/services/pdf-export';
import { MOMENTI_COLONNE, raggruppaMisurePerDataPdf } from '@/src/utils/pdf-measurement-selection';
import { generaHtmlRegistroPdf } from '@/src/utils/pdf-report-html';
import { leggiValoreCho, formattaInsulinaChoPdf } from '@/src/utils/cho';
import { segnalaRipristinoBackup } from '@/src/services/backup-events';
import { CHIAVE_BOLO_ORARIO, ConfigurazioneBoloOrario, configurazioneBoloValida } from '@/src/utils/bolo-orario';
import { File, Paths } from 'expo-file-system';
import { DiabetyModalCloseButton } from '@/src/components/diabety-modal-close-button';
import { DiabetyStatusNotice } from '@/src/components/diabety-status-notice';
import { DiabetyPdfExportModal } from '@/src/components/diabety-pdf-export-modal';
import { DIABETY_COLORS } from '@/src/theme/diabety';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, LayoutAnimation, UIManager, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiabetyAlert } from '@/src/components/diabety-alert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import ExcelJS from 'exceljs';

// Abilita LayoutAnimation per Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const COLORS = DIABETY_COLORS;



// Etichette utilizzate nella scheda Grafici.
const ETICHETTE_MOMENTI: Record<string, string> = {
  'Prima Colazione': 'Al risveglio',
  'Dopo Colazione': 'Dopo la colazione',
  'Prima Pranzo': 'Prima di pranzo',
  'Dopo Pranzo': 'Dopo pranzo',
  'Prima Cena': 'Prima di cena',
  'Dopo Cena': 'Dopo cena',
  'Notte': 'Notte',
};
const MOMENTI_RIEPILOGO = Object.keys(ETICHETTE_MOMENTI);
const PERIODI_EXPORT = ['7 GG', '14 GG', '30 GG', '90 GG', 'Tutti'];
const CSV_HEADERS = ['DATA', 'ORA', 'GLICEMIA (mg/dL)', 'INSULINA (UI)', 'CHO (g)', 'MOMENTO DELLA GIORNATA', 'ANNOTAZIONI'];

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

const valoreCHO = leggiValoreCho;

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
  const mostraAvviso = useDiabetyAlert();
  const [statoNotifica, setStatoNotifica] = useState<string | null>(null);
  const [filtroPdfSelezionato, setFiltroPdfSelezionato] = useState<string>('Tutti');
  const [modalPdfVisibile, setModalPdfVisibile] = useState(false);
  const [filtroTabellare, setFiltroTabellare] = useState('Tutti');
  const [modalTabellare, setModalTabellare] = useState<'excel' | 'csv' | null>(null);
  const [expandedPointId, setExpandedPointId] = useState<number | null>(null);
  const [backupDaRipristinare, setBackupDaRipristinare] = useState<{
    datiValidi: any[];
    esclusi: number;
    vecchioFormato: boolean;
    parametriBolo: any;
    configurazioneBoloOraria: ConfigurazioneBoloOrario | null;
    alimentiPreferiti: string[];
  } | null>(null);
  const [importazioneInCorso, setImportazioneInCorso] = useState(false);

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
        mostraAvviso('Questa esportazione è disponibile nella versione web di DIABETY.');
        return;
      }
      const salvati = await AsyncStorage.getItem('glicotrack_data');
      const parsed = salvati ? JSON.parse(salvati) : [];
      if (!Array.isArray(parsed)) throw new Error('Storico non valido');
      const misurazioni = selezionaMisurazioni(parsed, filtroTabellare);
      if (misurazioni.length === 0) {
        mostraAvviso('Non ci sono misurazioni nel periodo selezionato.');
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
        valoreCHO(m.cho),
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
        ws.columns = [{ width: 16 }, { width: 11 }, { width: 23 }, { width: 18 }, { width: 15 }, { width: 27 }, { width: 50 }];
        impostaTitolo(ws, 7);
        ws.getRow(4).values = CSV_HEADERS;
        intestazione(ws.getRow(4));
        righe.forEach((riga, i) => {
          const row = ws.addRow(riga);
          row.height = 21;
          if (i % 2 === 1) row.eachCell((c: any) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8FB' } }; });
          row.getCell(3).numFmt = '0';
          row.getCell(4).numFmt = '0.##';
          row.getCell(5).numFmt = '0.##';
        });
        ws.autoFilter = { from: 'A4', to: 'G4' };
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
      mostraAvviso('Impossibile creare il file. Riprova.');
    }
  };

  // Backup v2: il piatto alimentare resta escluso per scelta dell'utente.
  const CHIAVE_STORICO = 'glicotrack_data';
  const CHIAVE_BOLO = 'glicotrack_parametri_bolo';
  const CHIAVE_PREFERITI = 'diabety_alimenti_preferiti_v1';
  const parametriBoloValidi = (valore: any): boolean => {
    if (!valore || typeof valore !== 'object' || Array.isArray(valore)) return false;
    return ['rapportoCHO', 'sensibilitaISF', 'targetGlicemico'].every(chiave => {
      const campo = valore[chiave];
      if (typeof campo !== 'string' && typeof campo !== 'number') return false;
      const testo = String(campo).trim();
      if (!/^\d+(?:[.,]\d+)?$/.test(testo)) return false;
      const numero = Number(testo.replace(',', '.'));
      return Number.isFinite(numero) && numero > 0;
    });
  };
  const preferitiValidi = (valore: any): boolean =>
    Array.isArray(valore) && valore.every(id => typeof id === 'string' && id.length > 0);

  const esportaBackupJSON = async () => {
    try {
      const [storicoRaw, boloRaw, preferitiRaw, boloOrarioRaw] = await Promise.all([
        AsyncStorage.getItem(CHIAVE_STORICO),
        AsyncStorage.getItem(CHIAVE_BOLO),
        AsyncStorage.getItem(CHIAVE_PREFERITI),
        AsyncStorage.getItem(CHIAVE_BOLO_ORARIO),
      ]);
      const storico = storicoRaw ? JSON.parse(storicoRaw) : [];
      const bolo = boloRaw ? JSON.parse(boloRaw) : null;
      const preferiti = preferitiRaw ? JSON.parse(preferitiRaw) : [];
      const boloOrario = boloOrarioRaw ? JSON.parse(boloOrarioRaw) : null;
      if (!Array.isArray(storico) || !storico.every(validaMisurazioneBackup)) throw new Error('Storico non valido');
      // I CHO testuali di vecchie versioni (12,5 oppure 12.5) vengono
      // normalizzati SOLO nella copia del backup: lo storico locale non cambia.
      const storicoPerBackup = storico.map(normalizzaMisurazioneBackup);
      if (bolo !== null && !parametriBoloValidi(bolo)) throw new Error('Parametri bolo non validi');
      if (boloOrario !== null && !configurazioneBoloValida(boloOrario)) throw new Error('Configurazione fasce bolo non valida');
      if (!preferitiValidi(preferiti)) throw new Error('Preferiti non validi');
      const backup = JSON.stringify({
        formato: 'DIABETY_BACKUP', versione: 2,
        esportatoIl: new Date().toISOString(),
        storico: storicoPerBackup, parametriBolo: bolo, configurazioneBoloOraria: boloOrario, alimentiPreferiti: preferiti,
      }, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'backup_diabety_completo.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        mostraMessaggioNotifica('✓ Backup completo scaricato');
      } else {
        if (await Sharing.isAvailableAsync()) {
          // Expo Sharing nativo richiede un vero file locale, non una data URI.
          const fileBackup = new File(Paths.cache, 'backup_diabety_completo.json');
          fileBackup.create({ overwrite: true });
          await fileBackup.write(backup);
          await Sharing.shareAsync(fileBackup.uri, {
            dialogTitle: 'Salva il tuo Backup Diabety',
            mimeType: 'application/json',
            UTI: 'public.json',
          });
        } else {
          mostraAvviso('La condivisione non è supportata su questo dispositivo.');
        }
      }
    } catch (errore) {
      console.error('Errore backup:', errore);
      mostraAvviso('Impossibile creare il backup: alcuni dati salvati non sono validi. Nessun dato è stato modificato.');
    }
  };
  // Converte i vecchi CHO testuali in numeri senza cambiare gli altri campi.
  const normalizzaMisurazioneBackup = (item: any): any => ({
    ...item,
    cho: item.cho === undefined || item.cho === null || item.cho === ''
      ? null : leggiValoreCho(item.cho),
  });

  // I vecchi backup in formato array restano importabili.
  const validaMisurazioneBackup = (item: any): boolean => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (typeof item.id !== 'string' || item.id.trim() === '') return false;
    if (typeof item.glicemia !== 'number' || !Number.isInteger(item.glicemia) || item.glicemia < 1 || item.glicemia > 999) return false;
    if (typeof item.insulina !== 'string' || !/^(?:-|\d{1,2} UI)$/.test(item.insulina)) return false;
    // CHO facoltativo: accetta numeri e vecchi testi con virgola o punto.
    // Non accettare mai valori negativi o testi numericamente ambigui.
    if (item.cho !== undefined && item.cho !== null && item.cho !== '' &&
        leggiValoreCho(item.cho) === null) return false;
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

  // Web e smartphone condividono tutti i controlli e lo stesso popup DIABETY.
  // Nessuna scrittura su AsyncStorage avviene prima della conferma.
  const preparaImportazioneBackup = async (contenutoTesto: string) => {
    try {
      const contenuto: any = JSON.parse(contenutoTesto);
      const vecchioFormato = Array.isArray(contenuto);
      if (!vecchioFormato && (!contenuto || contenuto.formato !== 'DIABETY_BACKUP' || contenuto.versione !== 2)) {
        mostraAvviso('Formato backup non riconosciuto. Nessun dato modificato.');
        return;
      }
      const datiOriginali: any[] = vecchioFormato ? contenuto : contenuto.storico;
      if (!Array.isArray(datiOriginali) || !datiOriginali.every(validaMisurazioneBackup)) {
        mostraAvviso('Backup non valido: storico malformato. Nessun dato modificato.');
        return;
      }
      if (!vecchioFormato && (
        !(contenuto.parametriBolo === null || parametriBoloValidi(contenuto.parametriBolo)) ||
        !(contenuto.configurazioneBoloOraria == null || configurazioneBoloValida(contenuto.configurazioneBoloOraria)) ||
        !preferitiValidi(contenuto.alimentiPreferiti)
      )) {
        mostraAvviso('Backup non valido: parametri del bolo, fasce orarie o preferiti non corretti. Nessun dato modificato.');
        return;
      }
      const datiImportati = datiOriginali.map(normalizzaMisurazioneBackup);
      const ids = datiImportati.map((item: any) => item.id);
      if (new Set(ids).size !== ids.length) {
        mostraAvviso('Backup non valido: sono presenti identificativi duplicati. Lo storico attuale non è stato modificato.');
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
      if (datiValidi.length === 0 && datiImportati.length > 0) {
        mostraAvviso(`Il backup contiene ${datiImportati.length} misurazioni, tutte oltre il limite di 91 giorni. Nessun dato è stato sovrascritto.`);
        return;
      }

      // Nessuna scrittura avviene qui: si attende la conferma nel popup DIABETY.
      setBackupDaRipristinare({
        datiValidi,
        esclusi,
        vecchioFormato,
        parametriBolo: vecchioFormato ? null : contenuto.parametriBolo,
        configurazioneBoloOraria: vecchioFormato ? null : (contenuto.configurazioneBoloOraria ?? null),
        alimentiPreferiti: vecchioFormato ? [] : contenuto.alimentiPreferiti,
      });
    } catch (errore) {
      mostraAvviso('Impossibile leggere o importare il backup. Nessun dato è stato modificato.');
    }
  };

  const gestisciImportazioneWeb = async (evento: any) => {
    const inputFile = evento.target;
    const file = inputFile.files?.[0];
    if (!file) return;
    // Consente la riselezione dello stesso file dopo annullamento o errore.
    inputFile.value = '';
    try {
      await preparaImportazioneBackup(await file.text());
    } catch (errore) {
      mostraAvviso('Impossibile leggere o importare il backup. Nessun dato è stato modificato.');
    }
  };

  const gestisciImportazioneNativa = async () => {
    if (importazioneInCorso || backupDaRipristinare) return;
    try {
      // Selettore nativo già disponibile tramite expo-file-system (SDK 57).
      // Non richiede nuove dipendenze o modifiche alla configurazione Vercel.
      const selezione = await File.pickFileAsync({
        multipleFiles: false,
        mimeTypes: ['application/json', 'text/plain', 'application/octet-stream'],
      });
      if (selezione.canceled || !selezione.result) return;
      const file = selezione.result;
      if (file.name && !file.name.toLowerCase().endsWith('.json')) {
        mostraAvviso('Seleziona un file di backup JSON. Nessun dato è stato modificato.');
        return;
      }
      await preparaImportazioneBackup(await file.text());
    } catch (errore) {
      mostraAvviso('Impossibile selezionare o leggere il backup. Nessun dato è stato modificato.');
    }
  };

  const annullaImportazioneBackup = () => {
    if (!importazioneInCorso) setBackupDaRipristinare(null);
  };

  const confermaImportazioneBackup = async () => {
    if (!backupDaRipristinare || importazioneInCorso) return;
    setImportazioneInCorso(true);
    const { datiValidi, vecchioFormato, parametriBolo, configurazioneBoloOraria, alimentiPreferiti } = backupDaRipristinare;
    try {
      // Preserva il rollback della precedente importazione in caso di errore.
      const chiavi = vecchioFormato ? [CHIAVE_STORICO] : [CHIAVE_STORICO, CHIAVE_BOLO, CHIAVE_PREFERITI, CHIAVE_BOLO_ORARIO];
      const precedenti = await AsyncStorage.multiGet(chiavi);
      try {
        const nuovi: [string, string][] = [[CHIAVE_STORICO, JSON.stringify(datiValidi)]];
        if (!vecchioFormato) {
          if (parametriBolo !== null) nuovi.push([CHIAVE_BOLO, JSON.stringify(parametriBolo)]);
          if (configurazioneBoloOraria !== null) nuovi.push([CHIAVE_BOLO_ORARIO, JSON.stringify(configurazioneBoloOraria)]);
          nuovi.push([CHIAVE_PREFERITI, JSON.stringify(alimentiPreferiti)]);
        }
        await AsyncStorage.multiSet(nuovi);
        if (!vecchioFormato && parametriBolo === null) await AsyncStorage.removeItem(CHIAVE_BOLO);
        if (!vecchioFormato && configurazioneBoloOraria === null) await AsyncStorage.removeItem(CHIAVE_BOLO_ORARIO);
      } catch (erroreScrittura) {
        for (const [chiave, valore] of precedenti) {
          if (valore === null) await AsyncStorage.removeItem(chiave);
          else await AsyncStorage.setItem(chiave, valore);
        }
        throw erroreScrittura;
      }
      // Solo a scrittura COMPLETATA: le schede già montate rileggeranno i dati
      // al prossimo focus, evitando di sovrascrivere i preferiti ripristinati.
      if (!vecchioFormato) segnalaRipristinoBackup();
      setBackupDaRipristinare(null);
      mostraMessaggioNotifica(`✓ Ripristinate ${datiValidi.length} misurazioni${vecchioFormato ? '' : ', parametri e preferiti'}`);
    } catch (errore) {
      mostraAvviso('Impossibile importare il backup. È stato tentato il ripristino dei dati precedenti.');
    } finally {
      setImportazioneInCorso(false);
    }
  };
  const esportaDocumentoMatriceStoricoPDF = async (modalita: 'html' | 'pdf') => {
    setModalPdfVisibile(false);
    try {
      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let dati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      if (dati.length === 0) { mostraAvviso("Non ci sono dati disponibili nel diario per generare il report."); return; }
      const tuttiIRecordPdf: any[] = dati; // Le due colonne Notte usano solo i record della data della riga.

      if (filtroPdfSelezionato !== 'Tutti') {
        const giorniFiltro = parseInt(filtroPdfSelezionato); const oggi = new Date(); const dataInizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime();
        dati = dati.filter((item: any) => {
          if (!item.dataTesto || !item.dataTesto.includes('/')) return false;
          const [g, m, a] = item.dataTesto.split('/'); const tsItem = new Date(parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a), parseInt(m) - 1, parseInt(g)).getTime();
          const diff = (dataInizioOggi - tsItem) / (1000 * 60 * 60 * 24); return diff <= giorniFiltro && diff >= -1;
        });
      }

      if (dati.length === 0) { mostraAvviso(`Nessun dato registrato nell'intervallo selezionato.`); return; }

      // Il PDF seleziona per ogni data e momento la misurazione con orario più antico.
      const sezioniOrdinate = raggruppaMisurePerDataPdf(dati);

      const htmlTemplateHTML = generaHtmlRegistroPdf(
        sezioniOrdinate,
        tuttiIRecordPdf,
        formattaInsulinaChoPdf,
      );

      await esportaRegistroPdfDaHtml(htmlTemplateHTML, modalita, mostraAvviso);
    } catch (e) {
      console.error('DIABETY: errore durante esportazione PDF', e);
      mostraAvviso('Impossibile generare il PDF: ' + (e instanceof Error ? e.message : 'errore sconosciuto'));
    }
  };
  const manualPoints = [
    { id: 1, title: "1. Registrazione dei Dati", icon: "pulse-outline", color: "#00C8D7", content: "Nella schermata 'Inserisci' puoi registrare manualmente una misurazione, scegliendo Data e Ora del Test. L'app propone automaticamente data e ora attuali, ma puoi modificarle per registrare un test precedente.\n\nGLICEMIA (mg/dL)\nInserisci il valore della glicemia misurata in milligrammi per decilitro (mg/dL). Questo campo è obbligatorio per salvare una misurazione. Il valore viene conservato nello Storico e utilizzato nei Grafici e nelle analisi dell'app. Puoi correggerlo dalla finestra 'Modifica Misurazione'.\n\nINSULINA (UI)\nInserisci la quantità di insulina somministrata, espressa in UI. Il campo è facoltativo: puoi salvare una misurazione anche senza insulina. Se presente, il valore viene memorizzato nello Storico e può essere modificato o cancellato in seguito.\n\nCARBOIDRATI - CHO (g)\nInserisci i carboidrati assunti, espressi in grammi (g). Il campo è facoltativo. Il valore viene salvato con la misurazione, visualizzato nello Storico accanto all'insulina e può essere aggiunto, corretto o cancellato dalla finestra di modifica.\n\nMOMENTO DELLA GIORNATA\nSeleziona il momento a cui si riferisce la misurazione, ad esempio prima di colazione, dopo pranzo o notte.\n\nNOTE ALIMENTARI / SINTOMI\nPuoi inserire informazioni aggiuntive su pasti, attività o sintomi. Le note sono facoltative e vengono salvate con il test; l'app può riportare nelle note anche l'orario della misurazione.\n\nSALVATAGGIO ED ESPORTAZIONE\nPremendo 'Salva misurazione', i dati vengono registrati nel diario locale di DIABETY. Le registrazioni seguono la pulizia automatica prevista dall'app dopo 90 giorni." },
    { id: 7, title: "7. Calcolatore del Bolo Insulinico", icon: "calculator-outline", color: "#E9A45B", content: "Calcola le unità di insulina necessarie per i pasti e per correggere i picchi alti in un attimo. Sblocca la scheda inserendo i tuoi rapporti personali (Rapporto I:CHO, Sensibilità ISF e Target) concordati con il medico: l'applicazione li terrà salvati sul dispositivo per semplificare ogni calcolo futuro. Puoi inserire il valore della tua Glicemia con la quantità di Carboidrati (CHO) che stai assumendo per elaborare secondo i tuoi parametri la dose di Insulina da fare. Puoi anche inserire solo il valore della Glicemia per calcolare la quantità di Insulina per la correzione della Glicemia per rientrare nel tuo target." },
    { id: 8, title: "8. Database Alimenti e Carboidrati", icon: "restaurant-outline", color: "#53C98B", content: "Consulta un archivio completo con le marche e i cibi più comuni per comporre il tuo piatto virtuale. L'applicazione somma automaticamente i carboidrati totali mentre aggiungi i prodotti, aiutandoti a calcolare al volo la dose corretta di insulina senza dover fare calcoli a mente. Usa la barra di ricerca per trovare l'alimento che ti interessa, impostane la quantità che stai assumendo espressa in grammi e clicca sull'icona ' + ' per aggiungerla al Piatto Virtuale. L'applicazione genererà in basso una scheda momentanea dove simulerà l'insieme del tuo pasto. Qui puoi aggiungere tutti gli alimenti relativi al pasto tenendo traccia del totale dei Carboidrati (CHO)." },
    { id: 3, title: "3. Archivio e Auto-Pulizia", icon: "trash-outline", color: "#D5D7DE", content: "L'applicazione applica un algoritmo rigoroso di conservazione locale calcolato su una finestra mobile di 90 giorni rispetto al record più recente. I vecchi dati vengono eliminati automaticamente per ottimizzare la memoria del dispositivo: ricordati di salvare periodicamente un file di backup per non perderli. L'Eliminazione dei vecchi dati non significa perdere 'Tutti i dati' ma si intende perdere la singola misurazione registrata a partire da 90 giorni precedenti la data attuale." },
    { id: 6, title: "6. Analisi Avanzata e Grafici", icon: "stats-chart-outline", color: "#A78BFA", content: "Controlla l'andamento della tua Glicemia. Questa sezione mostra grafici chiari con l'andamento della tua Glicemia nelle ultime 24 ore e nei tre mesi passati. Inoltre, calcola in automatico una stima indicativa della tua Emoglobina Glicata (HbA1c) per aiutarti a capire subito si sei a target. Nota molto importante, tutti i dati e i grafici che vedi non sono dati medici ufficiali in quanto si basano solo ed esclusivamente su dati inseriti da te nel monitoraggio della Glicemia. La funzione del grafico è basata per avvicinarsi molto alla rapresentazione di un CGM ma non lo è! Un CGM (Monitoraggio Continuo del Glucosio) è un sistema tecnologico che misura i livelli di zucchero (glucosio) nel liquido interstiziale 24 ore su 24 tramite l'utilizzo di un Sensore. Il sensore rileva il glucosio ogni pochi minuti e invia i dati in tempo reale a un ricevitore, a uno smartphone o a uno smartwatch. L'app Diabety non ha questa funzione. Tutto ciò che vedi nella sezione Grafici è puramente a scopo indicativo basato soltanto su dati inseriti da te." },
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
        <DiabetyStatusNotice variant="impostazioni" message={statoNotifica} />
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
              <Text style={styles.descAzione}>Salva storico, parametri del bolo e alimenti preferiti</Text>
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
                <Text style={styles.descAzione}>Ripristina i dati da un backup JSON</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            <input type="file" accept=".json" onChange={gestisciImportazioneWeb} style={{ display: 'none' }} />
          </label>
        ) : (
          <TouchableOpacity style={[styles.rowAzione, { borderBottomWidth: 0 }]} onPress={gestisciImportazioneNativa} disabled={importazioneInCorso} accessibilityRole="button" accessibilityLabel="Seleziona un backup JSON da importare">
            <View style={styles.leftAzione}>
              <View style={[styles.iconWrapper, { backgroundColor: '#1A1A24' }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#A855F7" />
              </View>
              <View>
                <Text style={styles.titoloAzione}>Importa Backup</Text>
                <Text style={styles.descAzione}>Ripristina i dati da un backup JSON</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
        <View style={styles.dividerBackupPdf} />

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

      {/* Conferma di importazione con lo stesso tema nero/ciano di DIABETY. */}
      <Modal
        visible={backupDaRipristinare !== null}
        transparent
        animationType="fade"
        onRequestClose={annullaImportazioneBackup}
      >
        <View style={styles.backupModalOverlay}>
          <View style={styles.backupModalCard}>
            <View style={styles.backupModalAccento} />
            <View style={styles.backupModalHeader}>
              <View style={styles.backupModalIcona}>
                <Ionicons name="cloud-upload-outline" size={23} color={COLORS.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.backupModalTitolo}>Importa backup</Text>
                <Text style={styles.backupModalSottotitolo}>DIABETY · Conferma ripristino</Text>
              </View>
                            <DiabetyModalCloseButton
                              onPress={annullaImportazioneBackup}
                              disabled={importazioneInCorso}
                              accessibilityLabel="Chiudi finestra importazione"
                              iconSize={23}
                              iconColor="#9FAFB9"
                            />
            </View>

            <View style={styles.backupModalEsito}>
              <Ionicons name="checkmark-circle-outline" size={19} color={COLORS.success} />
              <Text style={styles.backupModalEsitoTesto}>Backup verificato e pronto al ripristino</Text>
            </View>

            <View style={styles.backupModalStatistiche}>
              <View style={styles.backupModalStatRiga}>
                <Text style={styles.backupModalStatEtichetta}>Misurazioni da ripristinare</Text>
                <Text style={styles.backupModalStatValore}>{backupDaRipristinare?.datiValidi.length ?? 0}</Text>
              </View>
              <View style={styles.backupModalSeparatore} />
              <View style={styles.backupModalStatRiga}>
                <Text style={styles.backupModalStatEtichetta}>Misurazioni escluse perché più vecchie di 90 giorni</Text>
                <Text style={styles.backupModalStatEscluse}>{backupDaRipristinare?.esclusi ?? 0}</Text>
              </View>
            </View>

            <View style={styles.backupModalInfo}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.brandPrimary} />
              <Text style={styles.backupModalInfoTesto}>
                {backupDaRipristinare?.vecchioFormato
                  ? 'Backup precedente: verrà ripristinato soltanto lo storico.'
                  : 'Verranno ripristinati anche i parametri del bolo e gli alimenti preferiti. Il piatto non sarà modificato.'}
              </Text>
            </View>

            <View style={styles.backupModalAvviso}>
              <Ionicons name="alert-circle-outline" size={21} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.backupModalAvvisoTitolo}>Attenzione alla sovrascrittura</Text>
                <Text style={styles.backupModalAvvisoTesto}>
                  Il ripristino sostituirà tutto lo storico attuale. Assicurati di aver salvato prima un backup dei tuoi dati.
                </Text>
              </View>
            </View>

            <View style={styles.backupModalAzioni}>
              <TouchableOpacity
                style={styles.backupModalAnnulla}
                onPress={annullaImportazioneBackup}
                disabled={importazioneInCorso}
                accessibilityRole="button"
                accessibilityLabel="Annulla importazione backup"
              >
                <Text style={styles.backupModalAnnullaTesto}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupModalConferma, importazioneInCorso && styles.backupModalDisabilitato]}
                onPress={confermaImportazioneBackup}
                disabled={importazioneInCorso}
                accessibilityRole="button"
                accessibilityLabel="Conferma ripristino backup"
              >
                <Ionicons name="checkmark-outline" size={18} color="#051B21" />
                <Text style={styles.backupModalConfermaTesto}>
                  {importazioneInCorso ? 'Ripristino…' : 'Ripristina backup'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalTabellare !== null} transparent animationType="fade" onRequestClose={() => setModalTabellare(null)}>
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalCard}>
            <View style={styles.pdfModalHeader}>
              <Ionicons name="documents-outline" size={24} color={COLORS.brandPrimary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pdfModalTitle}>Conferma esportazione</Text>
                <Text style={styles.pdfModalSubtitle}>DIABETY · Diario glicemico</Text>
              </View>
                            <DiabetyModalCloseButton onPress={() => setModalTabellare(null)} accessibilityLabel="Chiudi finestra" iconSize={24} iconColor={COLORS.muted} />
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

      <DiabetyPdfExportModal
        visible={modalPdfVisibile}
        periodo={filtroPdfSelezionato}
        onClose={() => setModalPdfVisibile(false)}
        onViewHtml={() => esportaDocumentoMatriceStoricoPDF('html')}
        onDownloadPdf={() => esportaDocumentoMatriceStoricoPDF('pdf')}
      />

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

  backupModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.84)', justifyContent: 'center', padding: 16 },
  backupModalCard: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: '#13131A', borderRadius: 20, borderWidth: 1, borderColor: '#32606B', overflow: 'hidden', padding: 18 },
  backupModalAccento: { height: 3, backgroundColor: COLORS.brandPrimary, position: 'absolute', top: 0, left: 0, right: 0 },
  backupModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 3, marginBottom: 16 },
  backupModalIcona: { width: 43, height: 43, backgroundColor: '#113039', borderRadius: 12, borderWidth: 1, borderColor: '#276577', justifyContent: 'center', alignItems: 'center' },
  backupModalTitolo: { color: COLORS.onSurface, fontSize: 19, fontWeight: '700' },
  backupModalSottotitolo: { color: '#9AABBB', fontSize: 11, marginTop: 3 },
  backupModalEsito: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
  backupModalEsitoTesto: { color: '#B6EBC8', fontSize: 12, fontWeight: '600', flex: 1 },
  backupModalStatistiche: { backgroundColor: '#0C2029', borderWidth: 1, borderColor: '#244651', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 7 },
  backupModalStatRiga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 13, paddingVertical: 10 },
  backupModalStatEtichetta: { color: '#D5E0E7', fontSize: 12, lineHeight: 17, flex: 1 },
  backupModalStatValore: { color: COLORS.brandPrimary, fontSize: 19, fontWeight: '800' },
  backupModalStatEscluse: { color: '#F8B66B', fontSize: 19, fontWeight: '800' },
  backupModalSeparatore: { height: 1, backgroundColor: '#244651' },
  backupModalInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 13, marginBottom: 12 },
  backupModalInfoTesto: { color: '#B5C8D3', fontSize: 12, lineHeight: 18, flex: 1 },
  backupModalAvviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 12, backgroundColor: '#291F17', borderWidth: 1, borderColor: '#655037' },
  backupModalAvvisoTitolo: { color: '#FFBB78', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  backupModalAvvisoTesto: { color: '#E8C9A7', fontSize: 11, lineHeight: 17 },
  backupModalAzioni: { flexDirection: 'row', gap: 9, marginTop: 17 },
  backupModalAnnulla: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#49505C', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backupModalAnnullaTesto: { color: '#CCD1DB', fontSize: 13, fontWeight: '700' },
  backupModalConferma: { flex: 1.55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.brandPrimary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 4 },
  backupModalConfermaTesto: { color: '#051B21', fontSize: 12, fontWeight: '800' },
  backupModalDisabilitato: { opacity: 0.55 },

  pdfModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 20 },
  pdfModalCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderGlassBright, padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
  pdfModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  pdfModalTitle: { color: COLORS.onSurface, fontSize: 18, fontWeight: '700' },
  pdfModalSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headerForm: { marginBottom: 20, width: '100%', borderLeftWidth: 0, paddingLeft: 16, justifyContent: 'center', minHeight: 48 },
  headerAccent: { position: 'absolute', left: 0, top: 0, height: 48, width: 4, backgroundColor: COLORS.brandPrimary, borderRadius: 8 },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, marginTop: 4 },
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 22, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardAzioni: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: "#30303A", width: '100%', overflow: 'hidden', marginBottom: 12 },
  rowAzione: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, borderBottomWidth: 1, borderBottomColor: COLORS.borderGlass, width: '100%' },
  rowAzioneLabel: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, height: 68, cursor: 'pointer', width: '100%', boxSizing: 'border-box', borderBottomWidth: 0 },
  
  dividerBackupPdf: { height: 1, backgroundColor: COLORS.borderGlass, width: '100%' },
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

});
