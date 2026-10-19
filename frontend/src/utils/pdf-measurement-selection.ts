/**
 * Funzioni PDF condivise da Storico e Impostazioni.
 * Selezione e ordinamento trasferiti letteralmente, senza normalizzare
 * i periodi né le regole di conservazione 90/91 giorni.
 */
export const MOMENTI_COLONNE = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];

// Le colonne PDF Notte sono distinte: 00:00–06:00 e 22:30–23:59 della stessa data.
// Le altre voci, inclusi Spuntino e Merenda, rimangono invariate.
export const COLONNE_PDF = ['Notte iniziale', ...MOMENTI_COLONNE.filter(m => m !== 'Notte'), 'Notte finale'];
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
export const scegliMisurePdf = (righe: any[], tuttiIRecord: any[], dataRiga: string): Map<string, any> => {
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

export const raggruppaMisurePerDataPdf = (dati: any[]) => {
      const sezioni: Record<string, any[]> = {};
      dati.forEach((item: any) => { const k = item.dataTesto || "Oggi"; if (!sezioni[k]) sezioni[k] = []; sezioni[k].push(item); });

      const sezioniOrdinate = Object.keys(sezioni).sort((a, b) => {
        const [gA, mA, anA] = a.split('/'); const [gB, mB, anB] = b.split('/');
        return new Date(parseInt(anB) < 50 ? 2000+parseInt(anB) : 1900+parseInt(anB), parseInt(mB)-1, parseInt(gB)).getTime() - new Date(parseInt(anA) < 50 ? 2000+parseInt(anA) : 1900+parseInt(anA), parseInt(mA)-1, parseInt(gA)).getTime();
      }).map(ch => ({ title: ch, data: sezioni[ch] }));

      return sezioniOrdinate;
};
