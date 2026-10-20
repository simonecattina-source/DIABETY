/**
 * DIABETY · Trasferimento backup QR (fase sperimentale).
 * Prepara il medesimo formato DIABETY_BACKUP v2 usato da Impostazioni.
 * Non scrive alcun dato; l'importazione reale viene validata e confermata
 * ESCLUSIVAMENTE in Impostazioni, attraverso il flusso esistente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHIAVE_BOLO_ORARIO, configurazioneBoloValida } from '@/src/utils/bolo-orario';
import { CHIAVE_TERAPIA_IOB, terapiaValida } from '@/src/utils/terapia-iob';
import { MOMENTI_COLONNE } from '@/src/utils/pdf-measurement-selection';
import { leggiValoreCho } from '@/src/utils/cho';

export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
const STORAGE_KEYS = [
  'glicotrack_data', 'glicotrack_parametri_bolo',
  'diabety_alimenti_preferiti_v1', CHIAVE_BOLO_ORARIO, CHIAVE_TERAPIA_IOB,
];

const validParams = (v: any): boolean => !!v && typeof v === 'object' && !Array.isArray(v) &&
  ['rapportoCHO', 'sensibilitaISF', 'targetGlicemico'].every(k => {
    if (!['string', 'number'].includes(typeof v[k])) return false;
    const value = String(v[k]).trim();
    return /^\d+(?:[.,]\d+)?$/.test(value) && Number(value.replace(',', '.')) > 0;
  });
const validFavorites = (v: any): boolean => Array.isArray(v) && v.every((id: any) => typeof id === 'string' && !!id);
const validMeasurement = (v: any): boolean => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (typeof v.id !== 'string' || !v.id.trim()) return false;
  if (!Number.isInteger(v.glicemia) || v.glicemia < 1 || v.glicemia > 999) return false;
  if (typeof v.insulina !== 'string' || !/^(?:-|\d{1,2} UI)$/.test(v.insulina)) return false;
  if (v.tipoInsulina != null && !['rapida', 'basale', 'non_specificata'].includes(v.tipoInsulina)) return false;
  if (v.modalitaTerapia != null && !['penne', 'microinfusore'].includes(v.modalitaTerapia)) return false;
  if (v.istanteDose != null && (typeof v.istanteDose !== 'string' || !Number.isFinite(Date.parse(v.istanteDose)))) return false;
  if (v.nomeInsulinaDose !== undefined && typeof v.nomeInsulinaDose !== 'string') return false;
  if (v.cho != null && v.cho !== '' && leggiValoreCho(v.cho) === null) return false;
  if (typeof v.tipo !== 'string' || !MOMENTI_COLONNE.includes(v.tipo)) return false;
  if (typeof v.note !== 'string') return false;
  if (typeof v.ora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.ora)) return false;
  if (typeof v.dataTesto !== 'string' || !/^\d{2}\/\d{2}\/\d{2}$/.test(v.dataTesto)) return false;
  const [day, month, shortYear] = v.dataTesto.split('/').map(Number);
  const year = shortYear < 50 ? shortYear + 2000 : shortYear + 1900;
  const date = new Date(year, month - 1, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 &&
    date.getDate() === day && date.getTime() <= today.getTime();
};

export type PreparedBackup = { json: string; records: number; bytes: number };
export async function prepareQrBackup(): Promise<PreparedBackup> {
  const rows = await AsyncStorage.multiGet(STORAGE_KEYS);
  const values = rows.map(([, v]) => v === null ? null : JSON.parse(v));
  const [measurements, bolo, favorites, scheduled, therapy] = values;
  const storico = measurements ?? [];
  const preferiti = favorites ?? [];
  if (!Array.isArray(storico) || !storico.every(validMeasurement) ||
      new Set(storico.map((v: any) => v.id)).size !== storico.length) {
    throw new Error('Lo storico locale contiene valori non validi: trasferimento bloccato.');
  }
  if ((bolo !== null && !validParams(bolo)) ||
      (scheduled !== null && !configurazioneBoloValida(scheduled)) ||
      (therapy !== null && !terapiaValida(therapy)) || !validFavorites(preferiti)) {
    throw new Error('Una configurazione locale non è valida: trasferimento bloccato.');
  }
  const normalized = storico.map((m: any) => ({
    ...m, cho: m.cho == null || m.cho === '' ? null : leggiValoreCho(m.cho),
  }));
  const json = JSON.stringify({
    formato: 'DIABETY_BACKUP', versione: 2, esportatoIl: new Date().toISOString(),
    storico: normalized, parametriBolo: bolo, configurazioneBoloOraria: scheduled,
    alimentiPreferiti: preferiti, terapiaIob: therapy,
  });
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_BACKUP_BYTES) throw new Error('Backup superiore a 8 MB: usa il backup JSON tradizionale.');
  return { json, bytes, records: storico.length };
}

export function checkReceivedBackup(text: string): { records: number } {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Backup troppo grande.');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Backup non valido.');
  const v = value as Record<string, any>;
  if (v.formato !== 'DIABETY_BACKUP' || v.versione !== 2 || !Array.isArray(v.storico)) {
    throw new Error('Il contenuto ricevuto non è un backup DIABETY v2.');
  }
  // La validazione completa rimane sempre nell'importazione esistente di Impostazioni.
  return { records: v.storico.length };
}

// Passaggio SOLO in memoria: non lascia una seconda copia del backup in AsyncStorage.
let pendingQrBackup: string | null = null;
export function queueQrBackupForImport(text: string): void {
  checkReceivedBackup(text);
  pendingQrBackup = text;
}
export function takeQrBackupForImport(): string | null {
  const value = pendingQrBackup;
  pendingQrBackup = null;
  return value;
}
