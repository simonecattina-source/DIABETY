/** Motore matematico IOB solo informativo; non validato per suggerire o correggere dosi.
 * Formula esponenziale di riferimento: OpenAPS oref0/lib/iob/calculate.js
 * È una frazione teorica di effetto residuo, non una misura fisiologica diretta.
 */
import { ConfigurazioneTerapia, parametriIobRapida, istanteLocale, TipoDose } from './terapia-iob';
export type Registrazione = {
  id?:unknown; insulina?:unknown; tipoInsulina?:unknown; modalitaTerapia?:unknown;
  istanteDose?:unknown; dataTesto?:unknown; ora?:unknown; nomeInsulinaDose?:unknown;
};
export type RigaSomministrazione={id:string; ui:number; istante:number};
export type RisultatoIob = {
  stato:'stima'|'zero'|'non_disponibile'; ui:number|null; motivo:string;
  rapida:RigaSomministrazione[]; basale:RigaSomministrazione[];
  ultima:RigaSomministrazione|null;
};
export function frazioneResiduaEsponenziale(t:number,D:number,P:number):number|null {
  if (![t,D,P].every(Number.isFinite) || D<=0 || P<=0 || P>=D/2 || t<0) return null;
  if (t===0) return 1;
  if (t>=D) return 0;
  const tau=P*(1-P/D)/(1-2*P/D), a=2*tau/D;
  const S=1/(1-a+(1+a)*Math.exp(-D/tau));
  const frazione=1-S*(1-a)*(((t*t)/(tau*D*(1-a))-t/tau-1)*Math.exp(-t/tau)+1);
  return Number.isFinite(frazione)?Math.max(0,Math.min(1,frazione)):null;
}
function leggiUI(valore:unknown): number|null {
  if (valore==='-' || valore===null || valore===undefined || valore==='') return 0;
  const testo=typeof valore==='number'?String(valore):valore;
  if (typeof testo!=='string' || !/^\d+(?:[.,]\d+)?(?:\s*UI)?$/i.test(testo.trim())) return null;
  const n=Number(testo.trim().replace(/\s*UI$/i,'').replace(',','.'));
  return Number.isFinite(n) && n>=0 && n<=999 ? n:null;
}
function istante(record:Registrazione):number|null {
  if (typeof record.istanteDose==='string') {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(record.istanteDose)) return null;
    const parsed=Date.parse(record.istanteDose); return Number.isFinite(parsed)?parsed:null;
  }
  if (typeof record.dataTesto!=='string'||typeof record.ora!=='string') return null;
  const m=/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(record.dataTesto);
  if(!m)return null;
  const a=Number(m[3]);const year=m[3].length===4?a:a<50?2000+a:1900+a;
  const iso=`${year}-${m[2]}-${m[1]}`;
  const tempo=istanteLocale(iso,record.ora);
  return tempo===null?null:Date.parse(tempo);
}
const esitoNonDisponibile=(motivo:string,rapida:RigaSomministrazione[],basale:RigaSomministrazione[]):RisultatoIob=>({
  stato:'non_disponibile',ui:null,motivo,rapida,basale,ultima:rapida[0]||null,
});
export function calcolaIobDaStorico(registrazioni:unknown,terapia:ConfigurazioneTerapia|null,adessoMs:number=Date.now()):RisultatoIob {
  const rapide:RigaSomministrazione[]=[],basali:RigaSomministrazione[]=[];
  if (!Array.isArray(registrazioni)) return esitoNonDisponibile('Storico non leggibile. Verifica il backup.',rapide,basali);
  if (!Number.isFinite(adessoMs)) return esitoNonDisponibile('Ora del dispositivo non valida.',rapide,basali);
  let incoerenza='';
  const ids=new Set<string>();
  for(let i=0;i<registrazioni.length;i++) {
    const record=registrazioni[i] as Registrazione|null;
    if (!record || typeof record!=='object') {incoerenza='Una registrazione non è leggibile.';continue;}
    const ui=leggiUI(record.insulina);
    if(ui===null){incoerenza='Una quantità di insulina è malformata.';continue;}
    if(ui===0) continue;
    if(typeof record.id!=='string'||!record.id.trim()||ids.has(record.id)){
      incoerenza='Sono presenti registrazioni senza ID univoco.';continue;
    }
    ids.add(record.id);
    const quando=istante(record);
    if(quando===null){incoerenza='Verifica data e ora di una dose nello Storico.';continue;}
    if(quando>adessoMs){incoerenza='Una dose ha data o ora futura. Correggila nello Storico.';continue;}
    const tipo:TipoDose|undefined=record.tipoInsulina==='rapida'||record.tipoInsulina==='basale'||record.tipoInsulina==='non_specificata'?record.tipoInsulina:undefined;
    if (tipo==='basale') {basali.push({id:record.id,ui,istante:quando});continue;}
    if(tipo!=='rapida'){
      // La vecchia dose non classificata blocca solo se potrebbe ancora influire sulla IOB.
      const durata=terapia?parametriIobRapida(terapia)?.durataMin:undefined;
      if(durata===undefined || adessoMs-quando<=durata*60000) incoerenza='Una dose recente non è classificata. Verifica la misurazione nello Storico.';
      continue;
    }
    rapide.push({id:record.id,ui,istante:quando});
    if (record.modalitaTerapia!==undefined && record.modalitaTerapia!==null && record.modalitaTerapia!=='penne' && record.modalitaTerapia!=='microinfusore') {
      incoerenza='Modalità di una registrazione non riconosciuta.';
    }
  }
  rapide.sort((a,b)=>b.istante-a.istante);basali.sort((a,b)=>b.istante-a.istante);
  if (!terapia) return esitoNonDisponibile('Configura la modalità di terapia e i parametri IOB.',rapide,basali);
  if (terapia.modalita==='microinfusore') return esitoNonDisponibile('DIABETY non conosce tutte le erogazioni del microinfusore: IOB complessiva non disponibile.',rapide,basali);
  const parametri=parametriIobRapida(terapia);
  if(!parametri) return esitoNonDisponibile('Inserisci nome, durata e picco della rapida: modello non configurato.',rapide,basali);
  const D=parametri.durataMin,P=parametri.piccoMin;
  if(incoerenza) return esitoNonDisponibile(incoerenza,rapide,basali);
  if(rapide.some(r => {
    if(r.istante<adessoMs-D*60000) return false;
    const originale=(registrazioni as Registrazione[]).find(x=>x?.id===r.id);
    return (typeof originale?.modalitaTerapia==='string' && originale.modalitaTerapia!=='penne') ||
      (typeof originale?.nomeInsulinaDose==='string' && originale.nomeInsulinaDose.trim()!=='' && originale.nomeInsulinaDose.trim().toLocaleLowerCase()!==terapia.penne.rapida.nome.trim().toLocaleLowerCase());
  })) return esitoNonDisponibile('Una dose recente appartiene a una modalità o insulina rapida diversa.',rapide,basali);
  // Non dedurre completezza dei registri quando non è stata registrata alcuna rapida.
  if(rapide.length===0) return esitoNonDisponibile('Nessuna dose rapida verificabile registrata: non è possibile presumere IOB zero.',rapide,basali);
  let somma=0;
  for(const dose of rapide) {
    const r=frazioneResiduaEsponenziale((adessoMs-dose.istante)/60000,D,P);
    if(r===null)return esitoNonDisponibile('Impossibile calcolare il residuo di una dose.',rapide,basali);
    somma+=dose.ui*r;
  }
  if(!Number.isFinite(somma))return esitoNonDisponibile('Risultato matematico non valido.',rapide,basali);
  // Non mostrare zero per valori positivi arrotondati a 0.00.
  if(somma>0 && somma<0.005)return esitoNonDisponibile('Residuo inferiore alla precisione visualizzata: non indicato come 0 UI.',rapide,basali);
  return {stato:somma===0?'zero':'stima',ui:Math.round(somma*100)/100,
    motivo:somma===0?'Nessun residuo calcolato dalle dosi rapide registrate; non certifica la completezza dei dati.':'Stima matematica informativa, non validata per decidere dosi. Non sottratta dal bolo.',
    rapida:rapide,basale:basali,ultima:rapide[0]};
}
