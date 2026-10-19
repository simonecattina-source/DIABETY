/** Configurazione informativa. Non valida parametri clinici né abilita dosi consigliate. */
export const CHIAVE_TERAPIA_IOB = 'diabety_terapia_iob_v1';
export type ModalitaTerapia = 'penne' | 'microinfusore';
export type TipoDose = 'rapida' | 'basale' | 'non_specificata';
export type InsulinaConfigurata = { nome: string; durataOre: string; piccoMin: string };
export type ConfigurazioneTerapia = {
  versione: 1;
  modalita: ModalitaTerapia;
  penne: { rapida: InsulinaConfigurata; basale: {nome:string; durataOre:string} };
  microinfusore: {
    bolo: InsulinaConfigurata;
    basaleAggiuntiva: { abilitata: boolean; nome:string; durataOre:string };
  };
};
export const creaTerapiaVuota = (): ConfigurazioneTerapia => ({
  versione: 1, modalita: 'penne',
  penne: {rapida:{nome:'',durataOre:'',piccoMin:''},basale:{nome:'',durataOre:''}},
  microinfusore: {bolo:{nome:'',durataOre:'',piccoMin:''},basaleAggiuntiva:{abilitata:false,nome:'',durataOre:''}},
});
const stringa = (s:unknown) => typeof s === 'string' && s.length <= 90 && !/[\x00-\x1f]/.test(s);
export function terapiaValida(value: unknown): value is ConfigurazioneTerapia {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as ConfigurazioneTerapia;
  return v.versione===1 && (v.modalita==='penne' || v.modalita==='microinfusore') &&
    !!v.penne && !!v.penne.rapida && !!v.penne.basale && !!v.microinfusore && !!v.microinfusore.bolo && !!v.microinfusore.basaleAggiuntiva &&
    [v.penne.rapida.nome,v.penne.rapida.durataOre,v.penne.rapida.piccoMin,
     v.penne.basale.nome,v.penne.basale.durataOre,
     v.microinfusore.bolo.nome,v.microinfusore.bolo.durataOre,v.microinfusore.bolo.piccoMin,
     v.microinfusore.basaleAggiuntiva.nome,v.microinfusore.basaleAggiuntiva.durataOre].every(stringa) &&
    typeof v.microinfusore.basaleAggiuntiva.abilitata==='boolean';
}
/** Valida esclusivamente la forma matematica, senza suggerire valori personalizzati. */
export function parametriIobRapida(config:ConfigurazioneTerapia): {durataMin:number;piccoMin:number}|null {
  const r=config.modalita==='penne' ? config.penne.rapida : config.microinfusore.bolo;
  if (!r.nome.trim() || !/^\d+(?:[.,]\d+)?$/.test(r.durataOre.trim()) || !/^\d+(?:[.,]\d+)?$/.test(r.piccoMin.trim())) return null;
  const D=Number(r.durataOre.replace(',','.'))*60, P=Number(r.piccoMin.replace(',','.'));
  return Number.isFinite(D) && Number.isFinite(P) && D>0 && P>0 && P<D/2 && D<=24*60 ? {durataMin:D,piccoMin:P} : null;
}

/** Una data locale ambigua al ritorno all'ora solare è priva di timestamp verificabile. */
export function istanteLocale(dataISO:string,ora:string):string|null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)|| !/^([01]\d|2[0-3]):[0-5]\d$/.test(ora)) return null;
  const [y,m,d]=dataISO.split('-').map(Number),[h,min]=ora.split(':').map(Number);
  const timestamp=new Date(y,m-1,d,h,min);
  const corrisponde=(x:Date)=>x.getFullYear()===y && x.getMonth()===m-1 && x.getDate()===d && x.getHours()===h && x.getMinutes()===min;
  if (!corrisponde(timestamp) || corrisponde(new Date(timestamp.getTime()+3600000)) || corrisponde(new Date(timestamp.getTime()-3600000))) return null;
  return timestamp.toISOString();
}
