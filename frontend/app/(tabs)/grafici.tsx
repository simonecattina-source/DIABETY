import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, Path, Circle, Text as SvgText, G } from 'react-native-svg';

// 🎨 PALETTE NEON HIGH-CONTRAST PREMIUM COORDINATA
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan elettrico neon (Grafico 24h)
  brandSecondary: "#7D52FF",    // Viola tech (Trend macro)
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled (A Target)
  warning: "#FF9100",           // Arancione vivo (Ipo/Attenzione)
  error: "#FF5252",             // Rosso corallo neon (Iper/Alto)
  borderGlass: "rgba(255, 255, 255, 0.06)" 
};

const MOMENTI_ELENCO = [
  "Prima Colazione", "Dopo Colazione",
  "Prima Pranzo", "Dopo Pranzo",
  "Prima Cena", "Dopo Cena", "Notte"
];

const MOMENTI_SHORT = {
  "Prima Colazione": "8:00",
  "Dopo Colazione": "11:00",
  "Prima Pranzo": "12:00",
  "Dopo Pranzo": "15:00",
  "Prima Cena": "20:00",
  "Dopo Cena": "22:00",
  "Notte": "24:00"
};
// Fasce orarie del quadrante: intervalli semiaperti, ultimo fino a mezzanotte.
const FASCE_GIORNATA = [
  { nome: 'Notte iniziale', orario: '00:00–06:00', inizio: 0, fine: 360, colore: '#105077' },
  { nome: 'Prima di colazione', orario: '06:00–09:00', inizio: 360, fine: 540, colore: '#17658C' },
  { nome: 'Dopo colazione', orario: '09:00–11:00', inizio: 540, fine: 660, colore: '#187B9C' },
  { nome: 'Spuntino', orario: '11:00–12:30', inizio: 660, fine: 750, colore: '#146E95' },
  { nome: 'Prima di pranzo', orario: '12:30–14:30', inizio: 750, fine: 870, colore: '#247E9F' },
  { nome: 'Dopo pranzo', orario: '14:30–16:00', inizio: 870, fine: 960, colore: '#145B87' },
  { nome: 'Merenda', orario: '16:00–18:30', inizio: 960, fine: 1110, colore: '#1B7196' },
  { nome: 'Prima di cena', orario: '18:30–21:30', inizio: 1110, fine: 1290, colore: '#125778' },
  { nome: 'Dopo cena', orario: '21:30–22:30', inizio: 1290, fine: 1350, colore: '#1C91A5' },
  { nome: 'Notte finale', orario: '22:30–23:59', inizio: 1350, fine: 1440, colore: '#125A82' },
] as const;

type Misurazione = { glicemia: number; dataTesto: string; ora?: string; tipo?: string };
type Punto24 = { minutiAssoluti: number; glicemia: number };
type PuntoGiorno = { giornoIndice: number; dataLabel: string; media: number };
type MediaMomento = { momento: string; media: number | null };
const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const inizioGiorno = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const formattaData = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
const dataValida = (s: unknown): Date | null => {
  if (typeof s !== 'string') return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s.trim());
  if (!match) return null;
  const giorno = Number(match[1]), mese = Number(match[2]);
  const n = Number(match[3]);
  const anno = match[3].length === 4 ? n : n < 50 ? 2000+n : 1900+n;
  const d = new Date(anno, mese-1, giorno);
  return d.getFullYear() === anno && d.getMonth() === mese-1 && d.getDate() === giorno ? d : null;
};
const oraInMinuti = (s: unknown): number | null => {
  if (typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59 ? h*60+min : null;
};
const dataIndice = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const coloreValore = (v: number) => v > 500 || v > 180 ? COLORS.error : v < 70 ? COLORS.warning : COLORS.success;
// Quadrante neon compatto, condiviso dalle due statistiche superiori.
function QuadranteNeon({ valore, colore, testo, dimensione = 76 }: { valore: number; colore: string; testo: string; dimensione?: number }) {
  const r = 31;
  const circonferenza = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, valore));
  return (
    <View style={{ width: dimensione, height: dimensione, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={dimensione} height={dimensione} viewBox="0 0 80 80">
        <Circle cx="40" cy="40" r={r} stroke="#273052" strokeWidth="8" fill="#0A1024" />
        <Circle cx="40" cy="40" r={r} stroke={colore} strokeWidth="8" fill="none"
          strokeLinecap="round" strokeDasharray={`${circonferenza * progress / 100} ${circonferenza}`}
          rotation={-90} origin="40,40" />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colore, fontSize: 17, fontWeight: '900', fontFamily: 'Space Grotesk' }} numberOfLines={1}>{testo}</Text>
      </View>
    </View>
  );
}
export default function GraficiScreen() {
  const [datiReali, setDatiReali] = useState<Misurazione[]>([]);
  const [periodoQuadrante, setPeriodoQuadrante] = useState<7 | 14 | 30 | 90>(90);
  const [mediaGlicemia, setMediaGlicemia] = useState<number>(0);
  const [mediaOggi, setMediaOggi] = useState<number>(0); 
  const [totaleMisurazioni, setTotaleMisurazioni] = useState<number>(0);
  const [timeInRange, setTimeInRange] = useState<number>(0);
  
  // 🛠️ COSTRUTTORE ALLINEATO: Stato unificato e sincronizzato senza errori di battitura
  const [puntiGraficoLinea, setPuntiGraficoLinea] = useState<PuntoGiorno[]>([]);
  const [medieMomenti, setMedieMomenti] = useState<MediaMomento[]>([]);
  const [puntiGrafico24Ore, setPuntiGrafico24Ore] = useState<Punto24[]>([]);
  const [fineFinestra24, setFineFinestra24] = useState<number>(() => Date.now());

  const [glicataStimata, setGlicataStimata] = useState<number>(0);
  const [glicataMmol, setGlicataMmol] = useState<number>(0);
  const [larghezza24, setLarghezza24] = useState(0);
  const [larghezza90, setLarghezza90] = useState(0);
  const [larghezzaMomenti, setLarghezzaMomenti] = useState(0);

  const [modalVisibile, setModalVisibile] = useState<boolean>(false);
  const [modalTitolo, setModalTitolo] = useState<string>("");
  const [modalTesto, setModalTesto] = useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
      // Mantiene mobile la finestra anche se la scheda resta aperta.
      const intervallo = setInterval(() => caricaDatiECalcola(), 60_000);
      return () => clearInterval(intervallo);
    }, [])
  );

  const apriSpiegazione = (tipo: string) => {
    if (tipo === 'trimestrale') {
      setModalTitolo("Panoramica Trimestrale");
      setModalTesto("Statistiche basate sulle misurazioni disponibili negli ultimi 90 giorni di calendario, oggi incluso.\n\n• Media: la media aritmetica totale di tutti i test.\n• In Range (TIR): la percentuale di test rimasti all'interno dell'intervallo ideale (70 - 180 mg/dL).");
    } else if (tipo === 'oggi') {
      setModalTitolo("Media di Oggi");
      setModalTesto("Questo box calcola in tempo reale la media aritmetica di tutte le misurazioni effettuate esclusivamente nella data corrente (dalle 00:00 ad adesso).\n\nTi permette un controllo immediato per capire se l'andamento della giornata è a target.");
    } else if (tipo === '24h') {
      setModalTitolo("Andamento sulle 24 Ore");
      setModalTesto("Questo grafico mostra esclusivamente le misurazioni registrate nelle ultime 24 ore effettive, fino all'ora attuale.\n\nLa finestra temporale scorre automaticamente, anche oltre la mezzanotte: le nuove misurazioni entrano nel grafico secondo la data e l'ora registrate e quelle più vecchie di 24 ore escono. La Media di oggi rimane calcolata soltanto sui dati della giornata corrente.");
    } else if (tipo === 'giornaliere') {
      setModalTitolo("Andamento Medie Giornaliere");
      setModalTesto("Il grafico parte dalla prima giornata con misurazioni disponibile negli ultimi 90 giorni e arriva fino a oggi, occupando tutta la larghezza. Dopo 90 giorni diventa una finestra mobile degli ultimi 90 giorni di calendario. Le date sono distribuite secondo il calendario reale; nei giorni senza misurazioni la linea si interrompe. La fascia evidenzia l’intervallo 70–180 mg/dL.");
    } else if (tipo === 'momenti') {
      setModalTitolo("Medie per Momento");
      setModalTesto("Questo grafico analizza lo storico trimestrale (90 giorni) diviso per i 7 momenti della giornata.\n\nOgni colonna mostra la media calcolata in quello specifico orario. Lo stato indica: Verde (a target), Arancione (basso/ipo) o Rosso (alto/iper). Il trattino (-) indica assenza di dati.");
    } else if (tipo === 'glicata') {
      setModalTitolo("Stima Emoglobina Glicata (HbA1c)");
      setModalTesto("La HbA1c qui visualizzata è soltanto una stima orientativa ricavata dalla media delle misurazioni disponibili negli ultimi 90 giorni, mediante la relazione matematica eAG/HbA1c.\n\nLa frequenza e la distribuzione dei controlli possono influenzare molto il risultato: non rappresenta una previsione clinica affidabile, né sostituisce l'esame HbA1c di laboratorio o il parere del medico. La scala cromatica e le diciture delle fasce sono soltanto riferimenti grafici illustrativi, non classificazioni diagnostiche né obiettivi terapeutici personalizzati.");
    }
    setModalVisibile(true);
  };

  const caricaDatiECalcola = async () => {
    const azzera = () => {
      setDatiReali([]); setTotaleMisurazioni(0); setMediaGlicemia(0);
      setMediaOggi(0); setTimeInRange(0); setGlicataStimata(0);
      setGlicataMmol(0); setPuntiGraficoLinea([]); setMedieMomenti([]);
      setPuntiGrafico24Ore([]);
    };
    try {
      const salvati = await AsyncStorage.getItem('glicotrack_data');
      const parsed: unknown = salvati ? JSON.parse(salvati) : [];
      if (!Array.isArray(parsed)) { azzera(); return; }
      const elenco: Misurazione[] = parsed.filter((v): v is Misurazione =>
        v !== null && typeof v === 'object' && typeof v.glicemia === 'number' &&
        Number.isFinite(v.glicemia) && v.glicemia > 0 && dataValida(v.dataTesto) !== null
      );
      setDatiReali(elenco);
      const oggi = inizioGiorno(new Date());
      const indiceOggi = dataIndice(oggi);
      const inTrimestre = elenco.filter(v => {
        const d = dataValida(v.dataTesto)!;
        const distanza = indiceOggi - dataIndice(d);
        return distanza >= 0 && distanza < 90;
      });
      setTotaleMisurazioni(inTrimestre.length);
      if (inTrimestre.length) {
        const mediaEsatta = inTrimestre.reduce((sum,v)=>sum+v.glicemia,0) / inTrimestre.length;
        setMediaGlicemia(Math.round(mediaEsatta));
        setTimeInRange(Math.round(100*inTrimestre.filter(v=>v.glicemia>=70 && v.glicemia<=180).length/inTrimestre.length));
        const stima = (mediaEsatta + 46.7) / 28.7;
        setGlicataStimata(Math.round(stima*10)/10);
        setGlicataMmol(Math.round((stima-2.15)*10.978));
      } else {
        setMediaGlicemia(0); setTimeInRange(0); setGlicataStimata(0); setGlicataMmol(0);
      }
      const oggiElenco = elenco.filter(v => dataIndice(dataValida(v.dataTesto)!) === indiceOggi);
      setMediaOggi(oggiElenco.length ? Math.round(oggiElenco.reduce((sum,v)=>sum+v.glicemia,0)/oggiElenco.length) : 0);
      // Finestra temporale reale [adesso - 24 ore, adesso].
      // Le coordinate sono minuti trascorsi dall'inizio della finestra,
      // non minuti dalla mezzanotte: nessun azzeramento alle 00:00.
      const fineFinestra = Date.now();
      const inizioFinestra = fineFinestra - 24 * 60 * 60 * 1000;
      // Non raggruppare per tipo/momento: ogni record valido genera un punto,
      // anche se piu misurazioni hanno lo stesso momento della giornata.
      const puntiMobili: Punto24[] = elenco.flatMap(v => {
        const giorno = dataValida(v.dataTesto);
        const minuti = oraInMinuti(v.ora);
        if (!giorno || minuti === null) return [];
        const istante = new Date(giorno.getFullYear(), giorno.getMonth(), giorno.getDate(),
          Math.floor(minuti / 60), minuti % 60).getTime();
        if (istante < inizioFinestra || istante > fineFinestra) return [];
        return [{ minutiAssoluti: (istante - inizioFinestra) / 60000, glicemia: v.glicemia }];
      });
      setFineFinestra24(fineFinestra);
      setPuntiGrafico24Ore(puntiMobili.sort((a,b) => a.minutiAssoluti - b.minutiAssoluti));
      const giorni = new Map<number, number[]>();
      for (const v of inTrimestre) {
        const idx = dataIndice(dataValida(v.dataTesto)!)-(indiceOggi-89);
        if (!giorni.has(idx)) giorni.set(idx, []);
        giorni.get(idx)!.push(v.glicemia);
      }
      setPuntiGraficoLinea(Array.from(giorni.entries()).map(([giornoIndice, valori]) => {
        const d = new Date(oggi.getFullYear(),oggi.getMonth(),oggi.getDate()-(89-giornoIndice));
        return {giornoIndice, dataLabel:formattaData(d),media:Math.round(valori.reduce((a,b)=>a+b,0)/valori.length)};
      }).sort((a,b)=>a.giornoIndice-b.giornoIndice));
      setMedieMomenti(MOMENTI_ELENCO.map(m => {
        const valori = inTrimestre.filter(v=>v.tipo===m).map(v=>v.glicemia);
        return {momento:m,media:valori.length ? Math.round(valori.reduce((a,b)=>a+b,0)/valori.length) : null};
      }));
    } catch (e) {
      console.log('Errore lettura dati grafici:', e);
      azzera();
    }
  };

  // Scala visiva condivisa dai due grafici a linea: i valori reali non vengono alterati.
  const calcolaCoordinateLineaX = (valore: number, altezza: number) => {
    return altezza - ((Math.max(50, Math.min(350, valore)) - 50) / 300) * altezza;
  };

  const generaPercorsoCurvoBezier = (punti: any[]) => {
    if (!punti || punti.length === 0) return "";
    if (punti.length === 1) return `M ${punti[0].x} ${punti[0].y}`;
    let d = `M ${punti[0].x} ${punti[0].y}`;
    for (let i = 0; i < punti.length - 1; i++) {
      const cpX1 = punti[i].x + (punti[i + 1].x - punti[i].x) / 3;
      const cpY1 = punti[i].y;
      const cpX2 = punti[i].x + 2 * (punti[i + 1].x - punti[i].x) / 3;
      const cpY2 = punti[i + 1].y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${punti[i + 1].x} ${punti[i + 1].y}`;
    }
    return d;
  };
  const renderizzaGraficoLinea24Ore = () => {
    if (!puntiGrafico24Ore.length) return null;
    const width = larghezza24 || Math.max(240,Dimensions.get('window').width-64);
    const left=25, right=25, top=18, height=150, bottom=top+height, usable=width-left-right;
    const y=(v:number)=>top+calcolaCoordinateLineaX(v,height);
    const pts=puntiGrafico24Ore.map(p=>({...p,x:left+p.minutiAssoluti/1440*usable,y:y(p.glicemia)}));
    const curva=generaPercorsoCurvoBezier(pts);
    const area=pts.length>1 ? `${curva} L ${pts[pts.length-1].x} ${bottom} L ${pts[0].x} ${bottom} Z` : '';
    return <View style={styles.containerGraficoSvg} onLayout={e=>setLarghezza24(e.nativeEvent.layout.width)}>
      <Svg width="100%" height={207} viewBox={`0 0 ${width} 207`}>
        <Defs><LinearGradient id="neonCyanGrad" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={COLORS.brandPrimary} stopOpacity={0.28}/><Stop offset="1" stopColor={COLORS.brandPrimary} stopOpacity={0}/></LinearGradient></Defs>
        <Rect x={left} y={y(180)} width={usable} height={y(70)-y(180)} fill="rgba(0,230,118,0.04)"/>
        {[180,70].map(v=><G key={v}><Line x1={left} y1={y(v)} x2={width-right} y2={y(v)} stroke={v===180?COLORS.error:COLORS.warning} strokeWidth={1} strokeDasharray="3 3" opacity={0.6}/><SvgText x={width-5} y={y(v)+3} fill={v===180?COLORS.error:COLORS.warning} fontSize={9} fontWeight="bold" textAnchor="end">{v}</SvgText></G>)}
        <Line x1={left} y1={y(500)} x2={width-right} y2={y(500)} stroke={COLORS.muted} strokeWidth={0.8} opacity={0.5}/>
        {area ? <Path d={area} fill="url(#neonCyanGrad)"/> : null}
        {curva ? <Path d={curva} fill="none" stroke={COLORS.brandPrimary} strokeWidth={3} strokeLinecap="round"/> : null}
        {pts.map((p,i)=><G key={i}><Circle cx={p.x} cy={p.y} r={4} fill={coloreValore(p.glicemia)} stroke={COLORS.background} strokeWidth={1.5}/><SvgText x={p.x} y={Math.max(10,p.y-9)} fill={COLORS.onSurface} fontSize={9} fontWeight="800" textAnchor="middle">{p.glicemia}</SvgText></G>)}
        {[0,6,12,18,24].map(h => {
          const istante = new Date(fineFinestra24 - (24-h)*60*60*1000);
          const etichetta = `${String(istante.getHours()).padStart(2,'0')}:${String(istante.getMinutes()).padStart(2,'0')}`;
          return <SvgText key={h} x={left+(h/24)*usable} y={bottom+24} fill={COLORS.muted} fontSize={10} fontWeight="700" textAnchor={h===0?'start':h===24?'end':'middle'}>{etichetta}</SvgText>;
        })}
      </Svg>
    </View>;
  };

  const renderizzaGraficoLineaGiorni = () => {
    if (!puntiGraficoLinea.length) return null;
    const width=larghezza90 || Math.max(240,Dimensions.get('window').width-64);
    const left=27,right=27,top=18,height=150,bottom=top+height,usable=width-left-right;
    const y=(v:number)=>top+calcolaCoordinateLineaX(v,height);
    // L’asse X parte dal primo giorno misurato nel trimestre e termina sempre oggi.
    // Dopo 90 giorni il limite sinistro resta il primo giorno della finestra mobile.
    const primoIndice = Math.max(0, Math.min(89, puntiGraficoLinea[0].giornoIndice));
    const durata = Math.max(1, 89 - primoIndice);
    const posizioneX = (indice: number) => left + (indice - primoIndice) / durata * usable;
    const pts=puntiGraficoLinea.map(p=>({...p,x:posizioneX(p.giornoIndice),y:y(p.media)}));
    const segmenti: typeof pts[]=[];
    for (const p of pts) {
      const precedente=segmenti[segmenti.length-1];
      if (!precedente || !precedente.length || p.giornoIndice-precedente[precedente.length-1].giornoIndice>1) segmenti.push([p]);
      else precedente.push(p);
    }
    const oggi=inizioGiorno(new Date());
    // Etichette regolari e adattive: pochi giorni = più dettagli, 90 giorni = meno etichette.
    const giorniVisibili = 89 - primoIndice;
    const intervalli = width < 400 ? 4 : 8;
    const passoDate = Math.max(1, Math.ceil(giorniVisibili / intervalli));
    const ticks = Array.from({length:Math.floor(giorniVisibili/passoDate)+1},(_,i)=>primoIndice+i*passoDate);
    if (ticks[ticks.length-1] !== 89) ticks.push(89);
    const etichette = ticks.filter((idx,i)=>i===0 || i===ticks.length-1 || (89-idx)/durata*usable>=35);
    return <View style={styles.containerGraficoSvg} onLayout={e=>setLarghezza90(e.nativeEvent.layout.width)}>
      <Svg width="100%" height={207} viewBox={`0 0 ${width} 207`}>
        <Defs><LinearGradient id="neonPurpleGrad" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={COLORS.brandSecondary} stopOpacity={0.25}/><Stop offset="1" stopColor={COLORS.brandSecondary} stopOpacity={0}/></LinearGradient></Defs>
        <Rect x={left} y={y(180)} width={usable} height={y(70)-y(180)} fill="rgba(0,230,118,0.03)"/>
        {[180,70].map(v=><G key={v}><Line x1={left} y1={y(v)} x2={width-right} y2={y(v)} stroke={v===180?COLORS.error:COLORS.warning} strokeWidth={1} strokeDasharray="3 3" opacity={0.5}/><SvgText x={width-5} y={y(v)+3} fill={v===180?COLORS.error:COLORS.warning} fontSize={9} fontWeight="bold" textAnchor="end">{v}</SvgText></G>)}
        <Line x1={left} y1={y(500)} x2={width-right} y2={y(500)} stroke={COLORS.muted} strokeWidth={0.8} opacity={0.5}/>
        {segmenti.map((seg,i)=>{
          const path=generaPercorsoCurvoBezier(seg);
          const area=seg.length>1 ? `${path} L ${seg[seg.length-1].x} ${bottom} L ${seg[0].x} ${bottom} Z` : '';
          return <G key={i}>{area ? <Path d={area} fill="url(#neonPurpleGrad)"/> : null}{seg.length>1 ? <Path d={path} fill="none" stroke={COLORS.brandSecondary} strokeWidth={3} strokeLinecap="round"/> : null}</G>;
        })}
        {pts.map((p,i)=><G key={i}><Circle cx={p.x} cy={p.y} r={3.5} fill={coloreValore(p.media)} stroke={COLORS.background} strokeWidth={1.5}/>{(p.giornoIndice-primoIndice)%passoDate===0 ? <SvgText x={p.x} y={Math.max(10,p.y-9)} fill={COLORS.onSurface} fontSize={9} fontWeight="800" textAnchor="middle">{p.media}</SvgText> : null}</G>)}
        {etichette.map(idx=>{
          const d=new Date(oggi.getFullYear(),oggi.getMonth(),oggi.getDate()-(89-idx));
          return <SvgText key={idx} x={posizioneX(idx)} y={bottom+24} fill={COLORS.muted} fontSize={width<380?8:9} fontWeight="700" textAnchor={idx===primoIndice?'start':idx===89?'end':'middle'}>{`${d.getDate()} ${MESI[d.getMonth()]}`}</SvgText>;
        })}
      </Svg>
    </View>;
  };

  // Le chiavi dei momenti restano identiche a quelle salvate nel diario:
  // cambiano soltanto le etichette visibili, per non perdere misurazioni.
  const renderizzaGraficoColonneMomenti = () => {
    const dettagli: Record<string, { nome: string; icona: keyof typeof Ionicons.glyphMap }> = {
      "Prima Colazione": { nome: "Al risveglio", icona: "sunny-outline" },
      "Dopo Colazione": { nome: "Dopo la colazione", icona: "cafe-outline" },
      "Prima Pranzo": { nome: "Prima di pranzo", icona: "sunny-outline" },
      "Dopo Pranzo": { nome: "Dopo pranzo", icona: "restaurant-outline" },
      "Prima Cena": { nome: "Prima di cena", icona: "partly-sunny-outline" },
      "Dopo Cena": { nome: "Dopo cena", icona: "moon-outline" },
      "Notte": { nome: "Notte", icona: "moon-outline" },
    };
    // Le due soglie attraversano l'intera area delle barre, anche tra una riga e l'altra.
    // Un unico SVG evita disallineamenti su schermi piccoli e sul Web.
    const posizione = (v: number) => Math.max(0, Math.min(100, (v - 50) / 300 * 100));
    const larghezzaArea = larghezzaMomenti;
    const altezzaRiga = 53;
    const distanzaRighe = 5;
    const passo = altezzaRiga + distanzaRighe;
    const altezzaTotale = medieMomenti.length * passo - distanzaRighe;
    const xBarra = 7 + (larghezzaArea - 14) * 0.37 + 6;
    const larghezzaBarra = Math.max(1, larghezzaArea - 14 - 12 - 60 - (larghezzaArea - 14) * 0.37);
    const xSoglia = (v: number) => xBarra + larghezzaBarra * posizione(v) / 100;
    return (
      <View style={styles.momentiLista}>
        <View onLayout={e => setLarghezzaMomenti(e.nativeEvent.layout.width)} style={{ position: 'relative', width: '100%', height: altezzaTotale }}>
          {medieMomenti.map((m, i) => {
            const info = dettagli[m.momento];
            if (!info) return null;
            const presente = m.media !== null;
            const colore = presente ? coloreValore(m.media!) : COLORS.muted;
            return (
              <View key={m.momento} style={[styles.momentoRigaPremium, { position: 'absolute', top: i * passo, left: 0, right: 0, height: altezzaRiga }]}>
                <View style={[styles.momentoNomeGruppo, { width: '37%', paddingRight: 3 }]}>
                  <Ionicons name={info.icona} size={16} color="#B5D9FF" />
                  <Text style={styles.momentoNomePremium} numberOfLines={2}>{info.nome}</Text>
                </View>
                <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: '#132333', overflow: 'hidden' }}>
                  {presente && <View style={{ height: '100%', width: `${posizione(m.media!)}%`, borderRadius: 8, backgroundColor: colore }} />}
                </View>
                <View style={styles.momentoValoreGruppo}>
                  <Text style={[styles.momentoValorePremium, { color: colore }]}>{presente ? m.media : '-'}</Text>
                  <Text style={styles.momentoUnitaPremium}>mg/dL</Text>
                </View>
              </View>
            );
          })}
          {larghezzaArea > 0 && (
            <Svg pointerEvents="none" width="100%" height={altezzaTotale} style={{ position: 'absolute', top: 0, left: 0 }}>
              <Line x1={xSoglia(70)} x2={xSoglia(70)} y1={0} y2={altezzaTotale} stroke="#FFB02E" strokeWidth={1.5} strokeDasharray="5 4" opacity={1} />
              <Line x1={xSoglia(180)} x2={xSoglia(180)} y1={0} y2={altezzaTotale} stroke="#FF5252" strokeWidth={1.5} strokeDasharray="5 4" opacity={1} />
            </Svg>
          )}
        </View>
        {larghezzaArea > 0 && (
          <View style={{ height: 22, position: 'relative' }}>
            <Text style={{ position: 'absolute', left: xSoglia(70) - 12, width: 24, textAlign: 'center', color: '#FFB02E', fontSize: 11, fontWeight: '700' }}>70</Text>
            <Text style={{ position: 'absolute', left: xSoglia(180) - 15, width: 30, textAlign: 'center', color: '#FF5252', fontSize: 11, fontWeight: '700' }}>180</Text>
          </View>
        )}
      </View>
    );
  };

  // Le fasce sono una legenda grafica orientativa, non obiettivi terapeutici individuali.
  const fasciaGlicata = (val: number) => {
    if (val < 5.7) return { nome: 'Ottimale', colore: '#00E6A0' };
    if (val <= 6.4) return { nome: 'Nella norma', colore: '#00D9FF' };
    if (val <= 7.0) return { nome: 'Da monitorare', colore: '#FFBC39' };
    return { nome: 'Elevato', colore: '#FF526E' };
  };
  const posizioneGlicata = (val: number) =>
    Math.max(0, Math.min(100, ((val - 4) / 6) * 100));
  const [larghezzaBarraGlicata, setLarghezzaBarraGlicata] = useState(0);
  const legendeGlicata = [
    { limite: '< 5,7%', nome: 'Ottimale', colore: '#00E6A0', sfondo: '#07392D' },
    { limite: '5,7 – 6,4%', nome: 'Nella norma', colore: '#00D9FF', sfondo: '#082F48' },
    { limite: '6,5 – 7,0%', nome: 'Da monitorare', colore: '#FFBC39', sfondo: '#45300C' },
    { limite: '> 7,0%', nome: 'Elevato', colore: '#FF526E', sfondo: '#3B0D21' },
  ];

  const renderizzaQuadranteGiornata = () => {
    const oggiIndice = dataIndice(new Date());
    const misurazioniPeriodo = datiReali.filter(v => {
      const data = dataValida(v.dataTesto);
      if (!data || oraInMinuti(v.ora) === null) return false;
      const giorni = oggiIndice - dataIndice(data);
      return giorni >= 0 && giorni < periodoQuadrante;
    });
    const statistiche = FASCE_GIORNATA.map(fascia => {
      const valori = misurazioniPeriodo.filter(v => {
        const minuti = oraInMinuti(v.ora)!;
        return minuti >= fascia.inizio && minuti < fascia.fine;
      });
      const inRange = valori.filter(v => v.glicemia >= 70 && v.glicemia <= 180).length;
      return { ...fascia, percentuale: valori.length ? Math.round(inRange * 100 / valori.length) : null };
    });
    // Dieci settori identici da 36°, indipendenti dalla durata delle fasce.
    const centro = 200, esterno = 190, interno = 94;
    const punto = (r: number, gradi: number) => {
      const angolo = (gradi - 90) * Math.PI / 180;
      return [centro + r * Math.cos(angolo), centro + r * Math.sin(angolo)];
    };
    const settore = (da: number, a: number) => {
      const [x1,y1] = punto(esterno,da), [x2,y2] = punto(esterno,a);
      const [x3,y3] = punto(interno,a), [x4,y4] = punto(interno,da);
      return `M ${x1} ${y1} A ${esterno} ${esterno} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${interno} ${interno} 0 0 0 ${x4} ${y4} Z`;
    };
    const nomiSuRighe: string[][] = [
      ['Notte iniziale'], ['Prima', 'di colazione'], ['Dopo', 'colazione'],
      ['Spuntino'], ['Prima', 'di pranzo'], ['Dopo', 'pranzo'],
      ['Merenda'], ['Prima', 'di cena'], ['Dopo cena'], ['Notte finale'],
    ];
    return (
      <View style={[styles.cardGraficoContenitore, { marginTop: 16, borderColor: '#17465C' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name="pie-chart-outline" size={26} color="#00E5FF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Suddivisione dei momenti della giornata</Text>
            <Text style={{ color: '#A9C8E8', fontSize: 11, marginTop: 4 }}>Percentuale di misurazioni in range (70–180 mg/dL) per fascia oraria.</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, borderRadius: 10, borderWidth: 1, borderColor: '#24516B', overflow: 'hidden' }}>
          {([7,14,30,90] as const).map(giorni => (
            <TouchableOpacity key={giorni} onPress={() => setPeriodoQuadrante(giorni)} accessibilityRole="button"
              accessibilityState={{ selected: periodoQuadrante === giorni }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 11, backgroundColor: periodoQuadrante === giorni ? '#07354B' : 'transparent', borderWidth: periodoQuadrante === giorni ? 1 : 0, borderColor: '#00E5FF', borderRadius: 9 }}>
              <Text style={{ color: periodoQuadrante === giorni ? '#00E5FF' : '#B0C4E1', fontSize: 12, fontWeight: '700' }}>{giorni} giorni</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: '#A9C8E8', fontSize: 11, marginTop: 10 }}>Periodo selezionato: ultimi {periodoQuadrante} giorni, oggi compreso.</Text>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Svg width="100%" height={400} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
            <Defs>
              <LinearGradient id="spicchioScuro" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#0B1529" />
                <Stop offset="100%" stopColor="#050B10" />
              </LinearGradient>
            </Defs>
            {statistiche.map((f, i) => {
              const da = i * 36 + 0.5, a = (i + 1) * 36 - 0.5;
              const [tx, ty] = punto(145, i * 36 + 18);
              const nome = nomiSuRighe[i];
              const primaRiga = ty - (nome.length === 2 ? 26 : 19);
              // Simboli piccoli accanto ai nomi, senza cambiare le etichette originali.
              const simboli = ['☾', '☀', '☕', '◦', '♧', '♧', '☀', '♧', '☾', '☾'];
              return (
                <G key={i}>
                  <Path d={settore(da, a)} fill="url(#spicchioScuro)" stroke="#00DDF5" strokeWidth={1.7} strokeLinejoin="round" />
                  <SvgText x={tx-43} y={primaRiga+3} fill="#B5D9FF" fontSize={13} textAnchor="middle">{simboli[i]}</SvgText>
                  {nome.map((riga, j) => (
                    <SvgText key={j} x={tx} y={primaRiga + j * 15} fill="#FFFFFF" fontSize={13} fontWeight="700" textAnchor="middle">{riga}</SvgText>
                  ))}
                  <SvgText x={tx} y={primaRiga + nome.length * 15 + 1} fill="#C8E3F1" fontSize={11.5} textAnchor="middle">{f.orario}</SvgText>
                  <SvgText x={tx} y={primaRiga + nome.length * 15 + 27} fill="#FFFFFF" fontSize={21} fontWeight="bold" textAnchor="middle">{f.percentuale === null ? '—' : `${f.percentuale}%`}</SvgText>
                </G>
              );
            })}
            <Circle cx={centro} cy={centro} r={interno-4} fill="#050B10" stroke="#08364C" strokeWidth={5} />
            <Circle cx={centro} cy={centro} r={interno-15} fill="none" stroke="#00C8E7" strokeWidth={4} />
            {/* Freccia discreta sul bordo interno, senza invadere il testo centrale. */}
            <Path d="M 215 123 A 79 79 0 0 1 265 155" fill="none" stroke="#C8F9FF" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M 258 151 L 271 164 L 253 160 Z" fill="#C8F9FF" />
            {/* Testo centrale compatto: tutte le righe restano nel disco nero. */}
            <SvgText x={centro-5} y={centro+3} fill="#FFFFFF" fontSize={42} fontWeight="bold" textAnchor="end">24</SvgText>
            <SvgText x={centro-1} y={centro+3} fill="#00E5FF" fontSize={27} fontWeight="bold" textAnchor="start">ORE</SvgText>
            <SvgText x={centro} y={centro+29} fill="#FFFFFF" fontSize={9.5} letterSpacing={1.1} textAnchor="middle">DELLA GIORNATA</SvgText>
          </Svg>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: '#0A1C2C', borderWidth: 1, borderColor: '#18435B', borderRadius: 11, padding: 10, marginTop: 10, gap: 9 }}>
          <Ionicons name="information-circle-outline" size={21} color="#8CB9FF" />
          <Text style={{ flex: 1, color: '#A9C8E8', fontSize: 11, lineHeight: 17 }}>Ogni spicchio mostra la percentuale di misurazioni in range (70–180 mg/dL) per la corrispondente fascia oraria, calcolata sul periodo selezionato. Le percentuali si aggiornano automaticamente con le tue misurazioni. Il trattino indica assenza di dati.</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View style={styles.headerAccent} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Analisi e Grafici</Text>
        </View>
      </View>

      <Modal animationType="fade" transparent={true} visible={modalVisibile} onRequestClose={() => setModalVisibile(false)}>
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <View style={styles.intestazioneModal}>
              <Ionicons name="help-circle-outline" size={29} color={COLORS.brandPrimary} />
              <Text style={styles.titoloModal}>{modalTitolo}</Text>
              <TouchableOpacity
                onPress={() => setModalVisibile(false)}
                style={styles.iconaChiudiModal}
                accessibilityRole="button"
                accessibilityLabel="Chiudi spiegazione"
              >
                <Ionicons name="close" size={25} color="#A9C2D5" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.contenutoModalScroll} contentContainerStyle={styles.contenutoModalInterno} showsVerticalScrollIndicator={false}>
              <Text style={styles.testoDescrizioneModal}>{modalTesto}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.bottoneChiudiModal} onPress={() => setModalVisibile(false)}>
              <Text style={styles.testoBottoneChiudi}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <View style={styles.rigaCardSuperioriContainer}>
        <View style={[styles.cardSuperioreDueTerzi, styles.cardNeonTrimestre]}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel} >Trimestre (90 GG)</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('trimestrale')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="help-circle-outline" size={17} color="#AA7AFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.rigaQuadranteTrimestre}>
            <View style={styles.quadranteColonna}>
              <QuadranteNeon dimensione={62} valore={totaleMisurazioni ? timeInRange : 0}
                colore={totaleMisurazioni === 0 ? '#596078' : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error}
                testo={totaleMisurazioni ? `${timeInRange}%` : '-'} />
              <Text style={styles.testoSottoQuadrante}>In range</Text>
            </View>
            <View style={styles.datiLateraliNeon}>
              <Text style={styles.labelNeonPiccola}>MEDIA GLICEMICA</Text>
              <Text style={[styles.valoreNeonGrande, { color: totaleMisurazioni ? coloreValore(mediaGlicemia) : COLORS.muted }]} numberOfLines={1}>
                {totaleMisurazioni ? mediaGlicemia : '-'}
              </Text>
              <Text style={styles.unitaNeon}>mg/dL</Text>
              <Text style={[styles.statoNeon, { color: totaleMisurazioni ? coloreValore(mediaGlicemia) : COLORS.muted }]} numberOfLines={1}>
                {!totaleMisurazioni ? 'Nessun dato' : mediaGlicemia < 70 ? 'Sotto il range' : mediaGlicemia > 180 ? 'Sopra il range' : 'Nel range'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardSuperioreUnTerzo, styles.cardNeonOggi]}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel} >Media di oggi</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('oggi')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="help-circle-outline" size={17} color={COLORS.brandPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.contenutoOggiNeon}>
            <QuadranteNeon dimensione={62}
              valore={mediaOggi ? Math.min(100, mediaOggi / 250 * 100) : 0}
              colore={mediaOggi ? coloreValore(mediaOggi) : '#596078'}
              testo={mediaOggi ? String(mediaOggi) : '-'} />
            <Text style={styles.unitaNeon}>mg/dL</Text>
            <Text style={[styles.statoNeon, { color: mediaOggi ? coloreValore(mediaOggi) : COLORS.muted }]} numberOfLines={1}>
              {!mediaOggi ? 'Nessun dato' : mediaOggi < 70 ? 'Sotto il range' : mediaOggi > 180 ? 'Sopra il range' : 'Nel range'}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento sulle ultime 24 ore</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('24h')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>Misurazioni delle ultime 24 ore, aggiornate dinamicamente senza azzeramento a mezzanotte.</Text>
        {puntiGrafico24Ore.length > 0 ? renderizzaGraficoLinea24Ore() : (
          <View style={{ paddingVertical: 45, alignItems: 'center', width: '100%' }}>
            <Ionicons name="time-outline" size={26} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessuna misurazione disponibile.</Text>
          </View>
        )}
      </View>
      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento Medie Giornaliere</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('giornaliere')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.brandSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>La fascia evidenziata indica il range ideale (70-180 mg/dL).</Text>
        {puntiGraficoLinea.length > 0 ? renderizzaGraficoLineaGiorni() : (
          <View style={{ paddingVertical: 30, alignItems: 'center', width: '100%' }}>
            <Ionicons name="analytics-outline" size={26} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessun dato disponibile.</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardGraficoContenitore, styles.cardMomentiPremium, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <View style={styles.titoloMomentiPremium}>
            <Ionicons name="stats-chart" size={23} color="#A775FF" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { flexShrink: 1 }]}>Medie per Momento della Giornata</Text>
              <Text style={styles.sottotitoloMomentiPremium}>Media glicemica · mg/dL</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => apriSpiegazione('momenti')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="help-circle-outline" size={23} color="#9855FF" />
          </TouchableOpacity>
        </View>
        {totaleMisurazioni > 0 ? renderizzaGraficoColonneMomenti() : (
          <View style={{ paddingVertical: 30, alignItems: 'center', width: '100%' }}>
            <Ionicons name="bar-chart-outline" size={26} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessun dato inserito.</Text>
          </View>
        )}
        <View style={styles.notaMomentiPremium}>
          <Ionicons name="help-circle-outline" size={20} color="#9588F9" />
          <Text style={styles.notaMomentiTesto}>Le medie per momento della giornata sono calcolate sulle misurazioni disponibili negli ultimi 90 giorni e possono variare in base alla disponibilità dei dati.</Text>
        </View>
      </View>
      {renderizzaQuadranteGiornata()}
      <View style={[styles.cardGraficoContenitore, styles.cardHbPremium, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <View style={styles.titoloHbRiga}>
            <Ionicons name="water" size={25} color="#9855FF" />
            <Text style={[styles.sectionLabel, styles.titoloHbTesto]}>Stima Emoglobina Glicata (HbA1c)</Text>
          </View>
          <TouchableOpacity onPress={() => apriSpiegazione('glicata')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="help-circle-outline" size={23} color="#9855FF" />
          </TouchableOpacity>
        </View>

        {totaleMisurazioni > 0 && glicataStimata > 0 ? (
          <View style={styles.containerHbPremium}>
            <Text style={styles.valoreHbPremium}>{glicataStimata.toFixed(1).replace('.', ',')}<Text style={styles.simboloHbPremium}>%</Text></Text>
            <Text style={styles.mmolHbPremium}>{glicataMmol} <Text style={styles.unitaHbPremium}>mmol/mol</Text></Text>

            <View style={styles.barraHbContenitore} onLayout={(e) => setLarghezzaBarraGlicata(e.nativeEvent.layout.width)}>
              <Svg width="100%" height={36} viewBox="0 0 600 36" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="hbGradientPremium" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#00DA9C"/>
                    <Stop offset="28%" stopColor="#00D8D1"/>
                    <Stop offset="44%" stopColor="#02A7FF"/>
                    <Stop offset="52%" stopColor="#F9D449"/>
                    <Stop offset="70%" stopColor="#FF8C22"/>
                    <Stop offset="100%" stopColor="#F32254"/>
                  </LinearGradient>
                </Defs>
                <Rect x="1" y="4" width="598" height="27" rx="13.5" fill="url(#hbGradientPremium)" />
                {[100,200,300,400,500].map(x => <Line key={x} x1={x} x2={x} y1="5" y2="30" stroke="#0C1020" strokeWidth="2" opacity={0.75}/>)}
              </Svg>
              {larghezzaBarraGlicata > 0 && (
                <View pointerEvents="none" style={[styles.indicatoreHb, { left: Math.max(8, Math.min(larghezzaBarraGlicata - 8, larghezzaBarraGlicata * posizioneGlicata(glicataStimata) / 100)) - 8 }]}>
                  <View style={styles.lineaIndicatoreHb}/>
                  <View style={styles.pallinoIndicatoreHb}/>
                  <View style={styles.lineaIndicatoreHb}/>
                </View>
              )}
            </View>
            <View style={styles.scalaHb}>
              {['4,0','5,0','6,0','7,0','8,0','9,0','10,0'].map((n, i) => (
                <Text key={n} style={[styles.taccaHb, i === 0 && { textAlign: 'left' }, i === 6 && { textAlign: 'right' }]}>{n}</Text>
              ))}
            </View>

            <View style={styles.legendeHb}>
              {legendeGlicata.map((f) => (
                <View key={f.nome} style={[styles.legendaHb, { borderColor: f.colore, backgroundColor: f.sfondo }]}>
                  <Text style={[styles.legendaHbLimite, { color: f.colore }]} numberOfLines={1} adjustsFontSizeToFit>{f.limite}</Text>
                  <Text style={[styles.legendaHbNome, { color: f.colore }]} numberOfLines={1} adjustsFontSizeToFit>{f.nome}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.risultatoHb, { borderColor: fasciaGlicata(glicataStimata).colore + '70' }]}>
              <Ionicons name="checkmark-circle" size={25} color={fasciaGlicata(glicataStimata).colore}/>
              <View style={{ flex: 1 }}>
                <Text style={[styles.risultatoHbTitolo, { color: fasciaGlicata(glicataStimata).colore }]}>{fasciaGlicata(glicataStimata).nome}</Text>
                <Text style={styles.risultatoHbDescrizione}>Fascia grafica indicativa · Stima dai dati degli ultimi 90 giorni</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.hbSenzaDati}>
            <Text style={styles.valoreHbPremium}>-</Text>
            <Text style={styles.mmolHbPremium}>-</Text>
            <Text style={styles.testoHbSenzaDati}>Dati insufficienti per stimare l'HbA1c.</Text>
          </View>
        )}

        <View style={styles.notaHb}>
          <Ionicons name="help-circle-outline" size={20} color="#9588F9"/>
          <Text style={styles.notaHbTesto}>La stima dell'HbA1c è orientativa e non sostituisce un esame di laboratorio. Le fasce non rappresentano obiettivi clinici personalizzati.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Intestazione coerente con Bolo e Storico (DIABETY V7.0.5).
  headerCard: { backgroundColor: '#101B28', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerAccent: { width: 3, height: 43, backgroundColor: COLORS.brandPrimary, borderRadius: 4 },
  headerContent: { flex: 1, gap: 4 },
  headerTitle: { fontFamily: 'Space Grotesk', fontSize: 21, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  content: { padding: 16, paddingTop: 15, paddingBottom: 40 },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '800', color: COLORS.onSurface, marginBottom: 16, letterSpacing: -0.5 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.2 },
  subLabelSpiegazione: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 16 },
  rigaCardSuperioriContainer: { flexDirection: 'row', width: '100%', gap: 6, marginBottom: 16, minHeight: 145 },
  cardSuperioreDueTerzi: { flex: 1.2, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.borderGlass, justifyContent: 'space-between' },
  cardNeonTrimestre: { backgroundColor: '#0E1329', borderColor: '#7551C5', borderRadius: 16, padding: 10, minWidth: 0 },
  cardNeonOggi: { backgroundColor: '#0B1529', borderColor: '#1A9FC0', borderRadius: 16, padding: 10, minWidth: 0 },
  rigaQuadranteTrimestre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 5, gap: 3 },
  quadranteColonna: { alignItems: 'center', flexShrink: 0 },
  testoSottoQuadrante: { fontSize: 9, color: '#B4A9D4', marginTop: 0, fontFamily: 'Plus Jakarta Sans' },
  datiLateraliNeon: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center' },
  labelNeonPiccola: { fontSize: 8, color: '#AAA4D1', fontWeight: '700', textAlign: 'center' },
  valoreNeonGrande: { fontFamily: 'Space Grotesk', fontSize: 19, fontWeight: '900', marginTop: 1 },
  unitaNeon: { fontSize: 9, color: '#AEB8D4', fontFamily: 'Plus Jakarta Sans' },
  statoNeon: { fontSize: 9, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  contenutoOggiNeon: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  rigaBoxInterniTrimestre: { flexDirection: 'row', gap: 6, marginTop: 10, width: '100%' },
  infoBoxStatMini: { flex: 1, backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, alignItems: 'flex-start', minHeight: 65 },
  cardSuperioreUnTerzo: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.borderGlass, justifyContent: 'space-between' },
  containerBoxInternoOggi: { marginTop: 10, width: '100%' },
  infoBoxStatOggiCompatto: { backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, alignItems: 'flex-start', minHeight: 65 },
  statLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: COLORS.muted, marginBottom: 2 },
  unitaMisuraSub: { fontSize: 9, color: COLORS.muted, fontWeight: '400' },
  statValueMini: { fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: '900', color: COLORS.onSurface },
  statValueOggiCentrale: { fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: '900' },
  // 📐 CONTENITORE CARD: Forza la card ad allinearsi perfettamente senza far sbordare l'SVG interno
  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'stretch', borderWidth: 1, borderColor: COLORS.borderGlass, overflow: 'hidden' },
  rigaTitoloGrafico: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  pulsanteInfoTocco: { padding: 4, justifyContent: 'center', alignItems: 'center', opacity: 0.85 },
  
  // 📐 AREA SVG COMPACT UX: Forzata al 100% per accogliere l'asse orario ed azzerare gli sfasamenti su PC
  containerGraficoSvg: { width: '100%', marginTop: 6, position: 'relative' },
  
  // 📐 INTERVENTO: Allineato lo space-between ufficiale di React Native per separare gli istogrammi dei momenti
  rigaColonneContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', minHeight: 140, paddingTop: 15, alignItems: 'flex-end' },
  singolaColonnaWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  valoreColonnaTesto: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '800' },
  colonnaRettangolo: { width: 16, borderRadius: 4, minHeight: 4 },
  etichettaColonnaMomento: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: COLORS.muted, marginTop: 2 },
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.78)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#081723', borderRadius: 22, padding: 20, width: '100%', maxWidth: 370, maxHeight: '80%', borderWidth: 1, borderColor: '#00E5FF', alignItems: 'stretch' },
  intestazioneModal: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  titoloModal: { fontFamily: 'Space Grotesk', fontSize: 19, fontWeight: '800', color: COLORS.onSurface, flex: 1 },
  iconaChiudiModal: { padding: 5, marginRight: -5, alignItems: 'center', justifyContent: 'center' },
  contenutoModalScroll: { flexShrink: 1 },
  contenutoModalInterno: { paddingBottom: 4 },
  testoDescrizioneModal: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, color: '#E2EBF4', lineHeight: 24, textAlign: 'left' },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: '#00E5FF', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 13, alignSelf: 'stretch', alignItems: 'center' },
  testoBottoneChiudi: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '800', color: '#06141E' },
  containerInterfacciaGlicata: { width: '100%', marginTop: 5 },
  rigaDatiGlicataPrincipale: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  valoreGlicataTestoCentrale: { fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  etichettaMmolSecondaria: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, fontWeight: '700' },
  binarioGrigioBarraSfondo: { width: '100%', height: 10, backgroundColor: '#171721', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGlass },
  riempimentoAttivoBarra: { height: '100%', borderRadius: 6 },
  
  // 📐 INTERVENTO: Allineamento orizzontale legenda limiti HbA1c
  rigaLegendaGlicataLimiti: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  cardMomentiPremium: { backgroundColor: '#0C0E20', borderColor: '#5940AD', borderRadius: 20, padding: 16 },
  titoloMomentiPremium: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, paddingRight: 8 },
  sottotitoloMomentiPremium: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: '#AAA6D7', marginTop: 3 },
  momentiLista: { marginTop: 13 },
  momentoRigaPremium: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A1229', borderWidth: 1, borderColor: '#1D2850', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 7, gap: 6 },
  momentoNomeGruppo: { width: '34%', flexDirection: 'row', alignItems: 'center', gap: 7 },
  momentoNomePremium: { fontFamily: 'Plus Jakarta Sans', color: '#F4F0FF', fontSize: 10, fontWeight: '700', flex: 1, lineHeight: 13 },
  momentoBinario: { flex: 1, height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: '#24284E' },
  momentoValoreGruppo: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
  momentoValorePremium: { fontFamily: 'Space Grotesk', fontSize: 17, fontWeight: '800' },
  momentoUnitaPremium: { fontFamily: 'Plus Jakarta Sans', fontSize: 9, color: '#B3B9D8', marginTop: -2 },
  notaMomentiPremium: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#12162F', borderWidth: 1, borderColor: '#343A73', marginTop: 17 },
  notaMomentiTesto: { fontFamily: 'Plus Jakarta Sans', color: '#B9C1E9', fontSize: 11, lineHeight: 17, flex: 1 },
  cardHbPremium: { backgroundColor: '#0C0E20', borderColor: '#5940AD', borderRadius: 20, padding: 18 },
  titoloHbRiga: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 9, paddingRight: 8 },
  titoloHbTesto: { flexShrink: 1, fontSize: 14, lineHeight: 20 },
  containerHbPremium: { width: '100%', alignItems: 'center', paddingTop: 20 },
  valoreHbPremium: { fontFamily: 'Space Grotesk', color: '#F4F0FF', fontWeight: '900', fontSize: 57, letterSpacing: -2, textShadowColor: '#7645FF', textShadowRadius: 17 },
  simboloHbPremium: { fontSize: 35, color: '#B5A1FF' },
  mmolHbPremium: { fontFamily: 'Plus Jakarta Sans', color: '#FFFFFF', fontWeight: '700', fontSize: 19, marginTop: -3 },
  unitaHbPremium: { color: '#B2A5EF', fontSize: 15, fontWeight: '400' },
  barraHbContenitore: { width: '100%', height: 36, marginTop: 29, position: 'relative', justifyContent: 'center' },
  indicatoreHb: { position: 'absolute', width: 16, top: -4, height: 43, alignItems: 'center', justifyContent: 'center' },
  lineaIndicatoreHb: { width: 2, height: 10, backgroundColor: '#EAE1FF', shadowColor: '#8A55FF', shadowOpacity: 1, shadowRadius: 7 },
  pallinoIndicatoreHb: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#9A63FF', shadowColor: '#8A55FF', shadowOpacity: 1, shadowRadius: 9, elevation: 5 },
  scalaHb: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 4 },
  taccaHb: { flex: 1, textAlign: 'center', fontSize: 11, color: '#BBC2E9', fontFamily: 'Plus Jakarta Sans' },
  legendeHb: { flexDirection: 'row', width: '100%', gap: 5, marginTop: 25 },
  legendaHb: { flex: 1, minWidth: 0, borderRadius: 9, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', gap: 3 },
  legendaHbLimite: { fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  legendaHbNome: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  risultatoHb: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, backgroundColor: '#08202A', borderRadius: 12, padding: 13, marginTop: 20 },
  risultatoHbTitolo: { fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '800' },
  risultatoHbDescrizione: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: '#C4D0DD', marginTop: 3, lineHeight: 16 },
  notaHb: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#12162F', borderWidth: 1, borderColor: '#343A73', marginTop: 13 },
  notaHbTesto: { fontFamily: 'Plus Jakarta Sans', color: '#B9C1E9', fontSize: 11, lineHeight: 17, flex: 1 },
  hbSenzaDati: { alignItems: 'center', paddingVertical: 20 },
  testoHbSenzaDati: { fontFamily: 'Plus Jakarta Sans', color: COLORS.muted, fontSize: 12, marginTop: 12 },

});
