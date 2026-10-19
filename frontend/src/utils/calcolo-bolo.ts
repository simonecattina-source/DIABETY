/**
 * Motore di simulazione matematica Bolo DIABETY.
 * NON determina una dose sicura da somministrare: non conosce insulina attiva,
 * tipo/durata dell'insulina, andamento CGM o altri fattori clinici.
 * La validazione qui protegge la consistenza aritmetica, NON equivale a validazione medica.
 */
import {
  AVVISO_BOLO_MASSIMO_SUPERATO,
  ConfigurazioneBoloOrario,
  FasciaBolo,
  erroreConfigurazioneBolo,
  leggiNumeroPositivo,
} from './bolo-orario';

export type RisultatoMatematicoBolo = {
  quotaPasto: number;
  quotaCorrezione: number;
  totale: number;
  rapportoCHO: number;
  sensibilitaISF: number;
  targetGlicemico: number;
  sogliaCorrezione: number;
  boloMassimo: number;
};

export type EsitoBolo =
  | { ok: true; risultato: RisultatoMatematicoBolo }
  | { ok: false; codice: 'configurazione' | 'glicemia' | 'cho' | 'ipoglicemia' | 'sotto_target' | 'massimo' | 'calcolo'; titolo: string; messaggio: string };

const numeroNonNegativo = (testo: string): number | null => {
  if (typeof testo !== 'string' || !/^\d+(?:[.,]\d+)?$/.test(testo.trim())) return null;
  const valore = Number(testo.trim().replace(',', '.'));
  return Number.isFinite(valore) && valore >= 0 ? valore : null;
};

/** Non arrotondare alla mezza UI senza una regola clinica prescritta. */
export function simulaBoloMatematico(
  configurazione: ConfigurazioneBoloOrario | null,
  fascia: FasciaBolo | null,
  glicemiaTesto: string,
  choTesto: string,
): EsitoBolo {
  if (!configurazione || erroreConfigurazioneBolo(configurazione) || !fascia ||
      !configurazione.fasce.some(f => f.id === fascia.id && f.inizio === fascia.inizio)) {
    return { ok: false, codice: 'configurazione', titolo: 'Parametri mancanti',
      messaggio: 'Completa e salva tutti i parametri della fascia attiva e il bolo massimo personale.' };
  }
  const glicemia = numeroNonNegativo(glicemiaTesto);
  if (glicemia === null || !Number.isInteger(glicemia) || glicemia <= 0 || glicemia > 999) {
    return { ok: false, codice: 'glicemia', titolo: 'Glicemia non valida',
      messaggio: 'Inserisci la glicemia effettivamente misurata (mg/dL). Il valore iniziale 00 non è valido.' };
  }
  const carboidrati = numeroNonNegativo(choTesto);
  if (carboidrati === null) {
    return { ok: false, codice: 'cho', titolo: 'Carboidrati non validi',
      messaggio: 'Inserisci grammi CHO maggiori o uguali a zero. Sono ammesse la virgola e il punto decimale.' };
  }
  if (glicemia < 70) {
    return { ok: false, codice: 'ipoglicemia', titolo: 'Glicemia bassa',
      messaggio: "Calcolo bloccato sotto 70 mg/dL. Segui il tuo piano individuale per l'ipoglicemia." };
  }
  const rapportoCHO = leggiNumeroPositivo(fascia.rapportoCHO)!;
  const sensibilitaISF = leggiNumeroPositivo(fascia.sensibilitaISF)!;
  const targetGlicemico = leggiNumeroPositivo(fascia.targetGlicemico)!;
  const sogliaCorrezione = leggiNumeroPositivo(fascia.sogliaCorrezione)!;
  const boloMassimo = leggiNumeroPositivo(configurazione.boloMassimo)!;
  // Conservativo: senza una regola prescritta per la correzione inversa,
  // non mostrare la somma di una quota pasto con glicemia sotto target.
  if (glicemia < targetGlicemico) {
    return { ok: false, codice: 'sotto_target', titolo: 'Glicemia sotto il target',
      messaggio: 'La simulazione è sospesa: non è configurata una regola clinica per la glicemia sotto il target.' };
  }
  const quotaPasto = carboidrati / rapportoCHO;
  const quotaCorrezione = glicemia > sogliaCorrezione ? (glicemia - targetGlicemico) / sensibilitaISF : 0;
  const totale = quotaPasto + quotaCorrezione;
  if (![quotaPasto, quotaCorrezione, totale].every(Number.isFinite)) {
    return { ok: false, codice: 'calcolo', titolo: 'Calcolo non disponibile',
      messaggio: 'Controlla i dati e i parametri inseriti.' };
  }
  if (totale > boloMassimo) {
    return { ok: false, codice: 'massimo', titolo: AVVISO_BOLO_MASSIMO_SUPERATO.titolo,
      messaggio: AVVISO_BOLO_MASSIMO_SUPERATO.messaggio };
  }
  return { ok: true, risultato: { quotaPasto, quotaCorrezione, totale, rapportoCHO,
    sensibilitaISF, targetGlicemico, sogliaCorrezione, boloMassimo } };
}
