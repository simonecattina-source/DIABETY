/**
 * Configurazione ORARIA della scheda Bolo (solo dati, non dosaggio insulinico).
 * La validazione qui controlla la struttura dei dati, NON la correttezza clinica.
 */
export const CHIAVE_BOLO_ORARIO = 'diabety_bolo_fasce_v1';

export type FasciaBolo = {
  id: string;
  inizio: string;
  rapportoCHO: string;
  sensibilitaISF: string;
  targetGlicemico: string;
  sogliaCorrezione: string;
};

export type ConfigurazioneBoloOrario = {
  versione: 1;
  fasce: FasciaBolo[];
  boloMassimo: string;
};

export const PRIMA_FASCIA: FasciaBolo = {
  id: 'fascia-0000', inizio: '00:00', rapportoCHO: '', sensibilitaISF: '',
  targetGlicemico: '', sogliaCorrezione: '',
};

export const creaConfigurazioneVuota = (): ConfigurazioneBoloOrario => ({
  versione: 1,
  fasce: [{ ...PRIMA_FASCIA }],
  boloMassimo: '',
});

export const minutiDaOrario = (orario: string): number | null => {
  if (typeof orario !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(orario)) return null;
  const [ore, minuti] = orario.split(':').map(Number);
  return ore * 60 + minuti;
};

export const orarioDaMinuti = (minuti: number): string => {
  const valore = ((minuti % 1440) + 1440) % 1440;
  return `${String(Math.floor(valore / 60)).padStart(2, '0')}:${String(valore % 60).padStart(2, '0')}`;
};

export const leggiNumeroPositivo = (testo: unknown): number | null => {
  if (typeof testo !== 'string' || !/^\d+(?:[.,]\d+)?$/.test(testo.trim())) return null;
  const numero = Number(testo.trim().replace(',', '.'));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
};

export const ordinaFasce = (fasce: FasciaBolo[]): FasciaBolo[] =>
  [...fasce].sort((a, b) => (minutiDaOrario(a.inizio) ?? 2000) - (minutiDaOrario(b.inizio) ?? 2000));

export const fasciaAllOra = (fasce: FasciaBolo[], ora: Date): FasciaBolo | null => {
  if (!Array.isArray(fasce) || fasce.length === 0) return null;
  const minuti = ora.getHours() * 60 + ora.getMinutes();
  const ordinate = ordinaFasce(fasce);
  if (minutiDaOrario(ordinate[0].inizio) !== 0) return null;
  let corrente = ordinate[0];
  for (const fascia of ordinate) {
    const da = minutiDaOrario(fascia.inizio);
    if (da === null) return null;
    if (da > minuti) break;
    corrente = fascia;
  }
  return corrente;
};

export const fineFascia = (fasce: FasciaBolo[], id: string): string => {
  const ordinate = ordinaFasce(fasce);
  const indice = ordinate.findIndex(f => f.id === id);
  if (indice === -1) return '—';
  if (indice === ordinate.length - 1) return '23:59';
  const prossimo = minutiDaOrario(ordinate[indice + 1].inizio);
  return prossimo === null ? '—' : orarioDaMinuti(prossimo - 1);
};

/** Restituisce un errore specifico oppure null. Non equivale a validazione clinica. */
export const erroreConfigurazioneBolo = (dati: unknown): string | null => {
  if (!dati || typeof dati !== 'object' || Array.isArray(dati)) return 'Configurazione non riconosciuta.';
  const cfg = dati as Partial<ConfigurazioneBoloOrario>;
  if (cfg.versione !== 1 || !Array.isArray(cfg.fasce) || cfg.fasce.length === 0 || cfg.fasce.length > 48) {
    return 'Deve esserci almeno una fascia oraria valida (massimo 48).';
  }
  if (leggiNumeroPositivo(cfg.boloMassimo) === null) return 'Inserisci il bolo massimo personale indicato dal diabetologo.';
  const ids = new Set<string>();
  const orari = new Set<number>();
  for (const fascia of cfg.fasce) {
    if (!fascia || typeof fascia !== 'object' || Array.isArray(fascia)) return 'Una fascia oraria non è valida.';
    if (typeof fascia.id !== 'string' || !fascia.id.trim() || ids.has(fascia.id)) return 'Le fasce devono avere identificativi univoci.';
    ids.add(fascia.id);
    const minuti = minutiDaOrario(fascia.inizio);
    if (minuti === null) return 'Inserisci gli orari nel formato HH:MM (00:00–23:59).';
    if (orari.has(minuti)) return 'Sono presenti due fasce con lo stesso orario di inizio.';
    orari.add(minuti);
    if (leggiNumeroPositivo(fascia.rapportoCHO) === null || leggiNumeroPositivo(fascia.sensibilitaISF) === null ||
        leggiNumeroPositivo(fascia.targetGlicemico) === null || leggiNumeroPositivo(fascia.sogliaCorrezione) === null) {
      return `Completa I:CHO, ISF, target e soglia di correzione della fascia ${fascia.inizio}.`;
    }
    if (leggiNumeroPositivo(fascia.sogliaCorrezione)! < leggiNumeroPositivo(fascia.targetGlicemico)!) {
      return `La soglia di correzione della fascia ${fascia.inizio} non può essere inferiore al target.`;
    }
  }
  if (!orari.has(0)) return 'La prima fascia deve iniziare alle 00:00.';
  return null;
};

export const configurazioneBoloValida = (dati: unknown): dati is ConfigurazioneBoloOrario =>
  erroreConfigurazioneBolo(dati) === null;

/** Testo di blocco già approvato; non viene mostrato prima dell'attivazione clinica del calcolo. */
export const AVVISO_BOLO_MASSIMO_SUPERATO = {
  titolo: 'Bolo massimo superato',
  messaggio: 'La dose calcolata supera il bolo massimo personale impostato. Per sicurezza, DIABETY blocca il risultato e non suggerisce una dose alternativa. Verifica i dati inseriti e segui le indicazioni del diabetologo.',
} as const;
