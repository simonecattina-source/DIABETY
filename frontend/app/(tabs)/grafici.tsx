import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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
export default function GraficiScreen() {
  const [datiReali, setDatiReali] = useState<any[]>([]);
  const [mediaGlicemia, setMediaGlicemia] = useState<number>(0);
  const [mediaOggi, setMediaOggi] = useState<number>(0); 
  const [totaleMisurazioni, setTotaleMisurazioni] = useState<number>(0);
  const [timeInRange, setTimeInRange] = useState<number>(0);
  
  // 🛠️ COSTRUTTORE CORRETTO: Risolto il potenziale blocco di compilazione web allineando la funzione dello stato
  const [puntiGraficoLinea, setPuntiGraficoLinea] = useState<any[]>([]);
  const [medieMomenti, setMedieMomenti] = useState<any[]>([]);
  const [puntiGrafico24Ore, setPuntiGrafico24Ore] = useState<any[]>([]);

  const [glicataStimata, setGlicataStimata] = useState<number>(0);
  const [glicataMmol, setGlicataMmol] = useState<number>(0);

  const [modalVisibile, setModalVisibile] = useState<boolean>(false);
  const [modalTitolo, setModalTitolo] = useState<string>("");
  const [modalTesto, setModalTesto] = useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      caricaDatiECalcola();
    }, [])
  );

  const apriSpiegazione = (tipo: string) => {
    if (tipo === 'trimestrale') {
      setModalTitolo("Panoramica Trimestrale");
      setModalTesto("Statistiche complessive degli ultimi 90 giorni.\n\n• Media: la media aritmetica totale di tutti i test.\n• In Range (TIR): la percentuale di test rimasti all'interno dell'intervallo ideale (70 - 180 mg/dL).");
    } else if (tipo === 'oggi') {
      setModalTitolo("Media di Oggi");
      setModalTesto("Questo box calcola in tempo reale la media aritmetica di tutte le misurazioni effettuate esclusivamente nella data corrente (dalle 00:00 ad adesso).\n\nTi permette un controllo immediato per capire se l'andamento della giornata è a target.");
    } else if (tipo === '24h') {
      setModalTitolo("Andamento sulle 24 Ore");
      setModalTesto("Questo grafico shows l'andamento della glicemia nella giornata di oggi.\n\nLa curva continua azzurra unisce cronologicamente i tuoi test. Il grafico recupera automaticamente l'ultima misurazione di ieri sera prima di mezzanotte e la usa come punto di partenza a inizio giornata.");
    } else if (tipo === 'giornaliere') {
      setModalTitolo("Andamento Medie Giornaliere");
      setModalTesto("Questo grafico mostra il trend macro della tua media glicemica includendo tutti i 90 giorni del trimestre.\n\nLa fascia entre le due linee tratteggiate evidenzia il range ideale (70 - 180 mg/dL). Le linee tratteggiate indicano i limiti di sicurezza.");
    } else if (tipo === 'momenti') {
      setModalTitolo("Medie per Momento");
      setModalTesto("Questo grafico analizza lo storico trimestrale (90 giorni) diviso per i 7 momenti della giornata.\n\nOgni colonna mostra la media calcolata in quello specifico orario. Lo stato indica: Verde (a target), Arancione (basso/ipo) o Rosso (alto/iper). Il trattino (-) indica assenza di dati.");
    } else if (tipo === 'glicata') {
      setModalTitolo("Stima Emoglobina Glicata (HbA1c)");
      setModalTesto("Questo modulo esegue una stima matematica predittiva della tua Emoglobina Glicata (HbA1c) basandosi sulla formula internazionale ADA (eAG) applicata a tutti i test degli ultimi 90 giorni.\n\nI binari indicano il livello di controllo metabolico:\n• Verde (< 7.0%): Ottimo controllo\n• Arancione (7.0% - 8.0%): Controllo moderato\n• Rosso (> 8.0%): Controllo insufficiente\n\nAttenzione: questo valore è puramente indicativo e matematico. Non sostituisce in alcun modo l'esame del sangue effettuato in laboratorio medico.");
    }
    setModalVisibile(true);
  };
  const parsingData = (stringaData: string) => {
    if (!stringaData || !stringaData.includes('/')) return new Date(0);
    const [g, m, a] = stringaData.split('/');
    const annoCompleto = parseInt(a) < 50 ? 2000 + parseInt(a) : 1900 + parseInt(a);
    return new Date(annoCompleto, parseInt(m) - 1, parseInt(g));
  };

  const caricaDatiECalcola = async () => {
    try {
      const datiSalvati = await AsyncStorage.getItem('glicotrack_data');
      if (datiSalvati) {
        const elenco = JSON.parse(datiSalvati);
        setDatiReali(elenco);
        setTotaleMisurazioni(elenco.length);

        if (elenco.length > 0) {
          const somma = elenco.reduce((acc: number, item: any) => acc + item.glicemia, 0);
          const mediaCalcolata = Math.round(somma / elenco.length);
          setMediaGlicemia(mediaCalcolata);

          const stimaPercentuale = (mediaCalcolata + 46.7) / 28.7;
          setGlicataStimata(Math.round(stimaPercentuale * 10) / 10);
          const stimaMmol = (stimaPercentuale - 2.15) * 10.978;
          setGlicataMmol(Math.round(stimaMmol));

          const testNelRange = elenco.filter((item: any) => item.glicemia >= 70 && item.glicemia <= 180).length;
          setTimeInRange(Math.round((testNelRange / elenco.length) * 100));

          const oggiObj = new Date();
          const ieriObj = new Date();
          ieriObj.setDate(oggiObj.getDate() - 1);

          const formattaDataTesto = (d: Date) => {
            const g = String(d.getDate()).padStart(2, '0');
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const a = String(d.getFullYear()).slice(-2);
            return `${g}/${m}/${a}`;
          };

          const dataOggiTesto = formattaDataTesto(oggiObj);
          const dataIeriTesto = formattaDataTesto(ieriObj);

          const logDiOggi = elenco.filter((item: any) => item.dataTesto === dataOggiTesto);
          if (logDiOggi.length > 0) {
            const sommaOggi = logDiOggi.reduce((acc: number, item: any) => acc + item.glicemia, 0);
            setMediaOggi(Math.round(sommaOggi / logDiOggi.length));
          } else {
            setMediaOggi(0);
          }

          const logDiIeri = elenco.filter((item: any) => item.dataTesto === dataIeriTesto);

          let puntiOggi = logDiOggi.map((item: any) => {
            let ore = 12, oreMinuti = 0;
            if (item.ora && item.ora.includes(':')) {
              const [h, m] = item.ora.split(':');
              ore = parseInt(h);
              oreMinuti = parseInt(m);
            }
            return { minutiAssoluti: (ore * 60) + oreMinuti, glicemia: item.glicemia };
          });

          if (logDiIeri.length > 0) {
            const logDiIeriOrdinati = logDiIeri.map((item: any) => {
              let ore = 0, oreMinuti = 0;
              if (item.ora && item.ora.includes(':')) {
                const [h, m] = item.ora.split(':');
                ore = parseInt(h);
                oreMinuti = parseInt(m);
              }
              return { minutiAssoluti: (ore * 60) + oreMinuti, glicemia: item.glicemia };
            }).sort((a: any, b: any) => a.minutiAssoluti - b.minutiAssoluti);

            const ultimoControlloIeriSera = logDiIeriOrdinati[logDiIeriOrdinati.length - 1];
            puntiOggi.unshift({ minutiAssoluti: 0, glicemia: ultimoControlloIeriSera.glicemia });
          }

          const tracciato24hFlesibile = puntiOggi.sort((a: any, b: any) => a.minutiAssoluti - b.minutiAssoluti);
          setPuntiGrafico24Ore(tracciato24hFlesibile);

          const gruppiPerGiorno: Record<string, number[]> = {};
          elenco.forEach((item: any) => {
            const dataChiave = item.dataTesto || "Oggi";
            if (!gruppiPerGiorno[dataChiave]) gruppiPerGiorno[dataChiave] = [];
            gruppiPerGiorno[dataChiave].push(item.glicemia);
          });

          const andamentoCronologico = Object.keys(gruppiPerGiorno)
            .map(dataChiave => {
              const valoriGiorno = gruppiPerGiorno[dataChiave];
              const mediaGiorno = valoriGiorno.reduce((s, v) => s + v, 0) / valoriGiorno.length;
              return { dataLabel: dataChiave, media: Math.round(mediaGiorno) };
            })
            .sort((a, b) => parsingData(a.dataLabel).getTime() - parsingData(b.dataLabel).getTime());
          
          // 🛠️ ALLINEATO: Stato corretto collegato alla funzione aggiornata senza typo
          setPuntiGraficoLinea(andamentoCronologico);

          const gruppiPerMomento: Record<string, number[]> = {};
          MOMENTI_ELENCO.forEach(m => { gruppiPerMomento[m] = []; });

          elenco.forEach((item: any) => {
            if (gruppiPerMomento[item.tipo] !== undefined) {
              gruppiPerMomento[item.tipo].push(item.glicemia);
            }
          });

          const calcoloMedieMomenti = MOMENTI_ELENCO.map(m => {
            const valori = gruppiPerMomento[m];
            const media = valori.length > 0 ? Math.round(valori.reduce((s, v) => s + v, 0) / valori.length) : 0;
            return { momento: m, media };
          });
          setMedieMomenti(calcoloMedieMomenti);

        } else {
          setMediaGlicemia(0);
          setMediaOggi(0);
          setTimeInRange(0);
          setGlicataStimata(0);
          setGlicataMmol(0);
          setPuntiGraficoLinea([]);
          setMedieMomenti([]);
          setPuntiGrafico24Ore([]);
        }
      }
    } catch (e) {
      console.log("Errore calcolo dati.");
    }
  };

  const calcolaCoordinateLineaX = (valoreGlicemia: number, altezzaGrafico: number) => {
    const GLICEMIA_MIN = 40;
    const GLICEMIA_MAX = 240;
    const valoreProtetto = Math.max(GLICEMIA_MIN, Math.min(GLICEMIA_MAX, valoreGlicemia));
    const percentuale = (valoreProtetto - GLICEMIA_MIN) / (GLICEMIA_MAX - GLICEMIA_MIN);
    return altezzaGrafico - (percentuale * altezzaGrafico);
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
    if (puntiGrafico24Ore.length === 0) return null;
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 64;
    const altezzaGrafico = 150;
    const margineLaterale = 25;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    const rigaSoglia180Y = calcolaCoordinateLineaX(180, altezzaGrafico);
    const rigaSoglia70Y = calcolaCoordinateLineaX(70, altezzaGrafico);

    const coordinataPunti = puntiGrafico24Ore.map((punto) => {
      const percentualeX = punto.minutiAssoluti / 1440;
      const x = margineLaterale + (percentualeX * spazioUtileX);
      const y = calcolaCoordinateLineaX(punto.glicemia, altezzaGrafico);
      return { x, y, ...punto };
    });

    const percorsoCurvaStr = generaPercorsoCurvoBezier(coordinataPunti);
    
    let percorsoGradienteStr = "";
    if (coordinataPunti.length > 0) {
      percorsoGradienteStr = percorsoCurvaStr + 
        ` L ${coordinataPunti[coordinataPunti.length - 1].x} ${altezzaGrafico}` + 
        ` L ${coordinataPunti[0].x} ${altezzaGrafico} Z`;
    }

    return (
      <View style={styles.containerGraficoSvg}>
        <svg width="100%" height="175" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="neonCyanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.brandPrimary} stopOpacity="0.28" />
              <stop offset="100%" stopColor={COLORS.brandPrimary} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          
          <rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(0, 230, 118, 0.04)" />
          <line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
          <text x={larghezzaGrafico - 5} y={rigaSoglia180Y + 3} fill={COLORS.error} fontSize="9" fontWeight="bold" textAnchor="end">180</text>
          
          <line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
          <text x={larghezzaGrafico - 5} y={rigaSoglia70Y + 3} fill={COLORS.warning} fontSize="9" fontWeight="bold" textAnchor="end">70</text>
          
          {percorsoGradienteStr !== "" && <path d={percorsoGradienteStr} fill="url(#neonCyanGrad)" />}
          {percorsoCurvaStr !== "" && <path d={percorsoCurvaStr} fill="none" stroke={COLORS.brandPrimary} strokeWidth="3" strokeLinecap="round" />}
          
          {coordinataPunti.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill={p.glicemia > 180 ? COLORS.error : p.glicemia < 70 ? COLORS.warning : COLORS.success} stroke="#0A0A0C" strokeWidth="1.5" />
              <text x={p.x} y={p.y - 9} fill={COLORS.onSurface} fontSize="9" fontWeight="800" textAnchor="middle">{p.glicemia}</text>
            </g>
          ))}
        </svg>
        <View style={styles.rigaEtichetteDate}>
          <Text style={styles.dataTestoLabel}>00:00</Text>
          <Text style={styles.dataTestoLabel}>06:00</Text>
          <Text style={styles.dataTestoLabel}>12:00</Text>
          <Text style={styles.dataTestoLabel}>18:00</Text>
          <Text style={styles.dataTestoLabel}>24:00</Text>
        </View>
      </View>
    );
  };

  const renderizzaGraficoLineaGiorni = () => {
    if (puntiGraficoLinea.length === 0) return null;
    const larghezzaGrafico = Platform.OS === 'web' ? 340 : Dimensions.get('window').width - 64;
    const altezzaGrafico = 150;
    const margineLaterale = 20;
    const spazioUtileX = larghezzaGrafico - (margineLaterale * 2);

    const rigaSoglia180Y = calcolaCoordinateLineaX(180, altezzaGrafico);
    const rigaSoglia70Y = calcolaCoordinateLineaX(70, altezzaGrafico);

    const coordinataPunti = puntiGraficoLinea.map((punto, indice) => {
      const x = margineLaterale + (indice * (spazioUtileX / (puntiGraficoLinea.length - 1 || 1)));
      const y = calcolaCoordinateLineaX(punto.media, altezzaGrafico);
      return { x, y, ...punto };
    });

    const percorsoCurvaStr = generaPercorsoCurvoBezier(coordinataPunti);
    
    let percorsoGradienteStr = "";
    if (coordinataPunti.length > 0) {
      percorsoGradienteStr = percorsoCurvaStr + 
        ` L ${coordinataPunti[coordinataPunti.length - 1].x} ${altezzaGrafico}` + 
        ` L ${coordinataPunti[0].x} ${altezzaGrafico} Z`;
    }

    return (
      <View style={styles.containerGraficoSvg}>
        <svg width="100%" height="175" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="neonPurpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.brandSecondary} stopOpacity="0.25" />
              <stop offset="100%" stopColor={COLORS.brandSecondary} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          
          <rect x={margineLaterale} y={rigaSoglia180Y} width={spazioUtileX} height={rigaSoglia70Y - rigaSoglia180Y} fill="rgba(0, 230, 118, 0.03)" />
          <line x1={margineLaterale} y1={rigaSoglia180Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia180Y} stroke={COLORS.error} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
          <text x={larghezzaGrafico - 5} y={rigaSoglia180Y + 3} fill={COLORS.error} fontSize="9" fontWeight="bold" textAnchor="end">180</text>
          
          <line x1={margineLaterale} y1={rigaSoglia70Y} x2={larghezzaGrafico - margineLaterale} y2={rigaSoglia70Y} stroke={COLORS.warning} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
          <text x={larghezzaGrafico - 5} y={rigaSoglia70Y + 3} fill={COLORS.warning} fontSize="9" fontWeight="bold" textAnchor="end">70</text>
          
          {percorsoGradienteStr !== "" && <path d={percorsoGradienteStr} fill="url(#neonPurpleGrad)" />}
          {percorsoCurvaStr !== "" && <path d={percorsoCurvaStr} fill="none" stroke={COLORS.brandSecondary} strokeWidth="3" strokeLinecap="round" />}
          
          {coordinataPunti.map((p, i) => {
            const nascondiScrittaValore = coordinataPunti.length > 15 && i % 3 !== 0;
            const colorePuntoTrimestre = p.media > 180 ? COLORS.error : p.media < 70 ? COLORS.warning : COLORS.success;
            return (
              <g key={`macro-${i}`}>
                <circle cx={p.x} cy={p.y} r="3.5" fill={colorePuntoTrimestre} stroke="#0A0A0C" strokeWidth="1.5" />
                {!nascondiScrittaValore && (
                  <text x={p.x} y={p.y - 9} fill={COLORS.onSurface} fontSize="9" fontWeight="800" textAnchor="middle">{p.media}</text>
                )}
              </g>
            );
          })}
        </svg>
        <View style={styles.rigaEtichetteDate}>
          {puntiGraficoLinea.map((p, i) => {
            const mostraData = i === 0 || i === Math.floor(puntiGraficoLinea.length / 2) || i === puntiGraficoLinea.length - 1;
            return <Text key={i} style={[styles.dataTestoLabel, { opacity: mostraData ? 1 : 0 }]}>{p.dataLabel.slice(0, 5)}</Text>;
          })}
        </View>
      </View>
    );
  };

  const renderizzaGraficoColonneMomenti = () => {
    if (medieMomenti.length === 0) return null;
    const altezzaMassimaColonna = 110;
    const valoreMassimoScala = 300;

    return (
      <View style={styles.containerGraficoSvg}>
        <View style={styles.rigaColonneContainer}>
          {medieMomenti.map((m, i) => {
            const altezzaCalcolata = m.media > 0 ? Math.min(altezzaMassimaColonna, (m.media / valoreMassimoScala) * altezzaMassimaColonna) : 4;
            const coloreColonna = m.media === 0 ? "#1F1F29" : m.media > 180 ? COLORS.error : m.media < 70 ? COLORS.warning : COLORS.success;

            return (
              <View key={i} style={styles.singolaColonnaWrapper}>
                <Text style={[styles.valoreColonnaTesto, { color: m.media === 0 ? COLORS.muted : COLORS.onSurface }]}>{m.media > 0 ? m.media : '-'}</Text>
                <View style={[styles.colonnaRettangolo, { height: altezzaCalcolata, backgroundColor: coloreColonna }]} />
                <Text style={styles.etichettaColonnaMomento}>{MOMENTI_SHORT[m.momento as keyof typeof MOMENTI_SHORT]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const ottieniColoreGlicata = (val: number) => {
    if (val === 0) return "#1F1F29";
    if (val < 7.0) return COLORS.success;   
    if (val <= 8.0) return COLORS.warning;  
    return COLORS.error;                    
  };

  const calcolaPercentualeBarraGlicata = (val: number) => {
    if (val === 0) return 0;
    const MIN_GLIC = 4.0;
    const MAX_GLICEMIA = 12.0;
    const protetto = Math.max(MIN_GLIC, Math.min(MAX_GLICEMIA, val));
    return ((protetto - MIN_GLIC) / (MAX_GLICEMIA - MIN_GLIC)) * 100;
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analisi e Grafici</Text>

      <Modal animationType="fade" transparent={true} visible={modalVisibile} onRequestClose={() => setModalVisibile(false)}>
        <View style={styles.sfondoModalCentrato}>
          <View style={styles.corpoSchedaModal}>
            <Text style={styles.titoloModal}>{modalTitolo}</Text>
            <Text style={styles.testoDescrizioneModal}>{modalTesto}</Text>
            <TouchableOpacity style={styles.bottoneChiudiModal} onPress={() => setModalVisibile(false)}>
              <Text style={styles.testoBottoneChiudi}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <View style={styles.rigaCardSuperioriContainer}>
        <View style={styles.cardSuperioreDueTerzi}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel} numberOfLines={1}>Trimestre (90 GG)</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('trimestrale')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.brandSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.rigaBoxInterniTrimestre}>
            <View style={[styles.infoBoxStatMini, { borderLeftColor: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : mediaGlicemia === 0 ? COLORS.borderGlass : COLORS.success }]}>
              <Text style={styles.statLabel} numberOfLines={1}>Media</Text>
              <Text style={[styles.statValueMini, { color: mediaGlicemia > 180 ? COLORS.error : mediaGlicemia < 70 ? COLORS.warning : mediaGlicemia === 0 ? COLORS.muted : COLORS.success }]}>
                {mediaGlicemia > 0 ? `${mediaGlicemia}` : '-'} <Text style={styles.unitaMisuraSub}>mg</Text>
              </Text>
            </View>
            
            <View style={[styles.infoBoxStatMini, { borderLeftColor: totaleMisurazioni === 0 ? COLORS.borderGlass : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>
              <Text style={styles.statLabel} numberOfLines={1}>In Range</Text>
              <Text style={[styles.statValueMini, { color: totaleMisurazioni === 0 ? COLORS.muted : timeInRange >= 70 ? COLORS.success : timeInRange >= 50 ? COLORS.warning : COLORS.error }]}>
                {totaleMisurazioni > 0 ? `${timeInRange}%` : '-'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardSuperioreUnTerzo}>
          <View style={styles.rigaTitoloGrafico}>
            <Text style={styles.sectionLabel} numberOfLines={1}>Media Oggi</Text>
            <TouchableOpacity onPress={() => apriSpiegazione('oggi')} style={styles.pulsanteInfoTocco}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.brandPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.containerBoxInternoOggi}>
            <View style={[styles.infoBoxStatOggiCompatto, { borderLeftColor: mediaOggi > 180 ? COLORS.error : mediaOggi < 70 ? COLORS.warning : mediaOggi === 0 ? COLORS.borderGlass : COLORS.success }]}>
              <Text style={styles.statLabel} numberOfLines={1}>Media</Text>
              <Text style={[styles.statValueOggiCentrale, { color: mediaOggi > 180 ? COLORS.error : mediaOggi < 70 ? COLORS.warning : mediaOggi === 0 ? COLORS.muted : COLORS.success }]}>
                {mediaOggi > 0 ? `${mediaOggi}` : '-'}
              </Text>
              <Text style={styles.unitaMisuraSub}>{mediaOggi > 0 ? 'mg/dL' : 'no test'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Andamento sulle 24 Ore (Oggi)</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('24h')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>Curva continua collegata dall'ultima misurazione effettuata ieri sera.</Text>
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
            <Ionicons name="information-circle-outline" size={20} color={COLORS.brandSecondary} />
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

      <View style={[styles.cardGraficoContenitore, { marginTop: 16 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Medie per Momento della Giornata</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('momenti')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>Analisi divisa per i 7 controlli del diario clinico.</Text>
        {totaleMisurazioni > 0 ? renderizzaGraficoColonneMomenti() : (
          <View style={{ paddingVertical: 30, alignItems: 'center', width: '100%' }}>
            <Ionicons name="bar-chart-outline" size={26} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Nessun dato inserito.</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardGraficoContenitore, { marginTop: 16, paddingBottom: 20 }]}>
        <View style={styles.rigaTitoloGrafico}>
          <Text style={styles.sectionLabel}>Stima Emoglobina Glicata (HbA1c)</Text>
          <TouchableOpacity onPress={() => apriSpiegazione('glicata')} style={styles.pulsanteInfoTocco}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazione}>Valore trimestrale predittivo calcolato su formula eAG (ADA).</Text>
        
        {totaleMisurazioni > 0 ? (
          <View style={styles.containerInterfacciaGlicata}>
            <View style={styles.rigaDatiGlicataPrincipale}>
              <Text style={[styles.valoreGlicataTestoCentrale, { color: ottieniColoreGlicata(glicataStimata) }]}>
                {glicataStimata > 0 ? `${glicataStimata.toFixed(1)}%` : '-'}
              </Text>
              <Text style={styles.etichettaMmolSecondaria}>
                {glicataMmol > 0 ? `~ ${glicataMmol} mmol/mol` : '-'}
              </Text>
            </View>
            
            <View style={styles.binarioGrigioBarraSfondo}>
              <View style={[styles.riempimentoAttivoBarra, { width: `${calcolaPercentualeBarraGlicata(glicataStimata)}%`, backgroundColor: ottieniColoreGlicata(glicataStimata) }]} />
            </View>

            <View style={styles.rigaLegendaGlicataLimiti}>
              <Text style={styles.testoLegendaMarcatore}>4.0%</Text>
              <Text style={[styles.testoLegendaMarcatore, { color: COLORS.success }]}>Target (&lt;7%)</Text>
              <Text style={styles.testoLegendaMarcatore}>12.0%</Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 25, alignItems: 'center', width: '100%' }}>
            <Ionicons name="flask-outline" size={26} color={COLORS.muted} style={{ marginBottom: 6 }} />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>Dati insufficienti per stimare l'HbA1c.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 15, paddingBottom: 40 },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '800', color: COLORS.onSurface, marginBottom: 16, letterSpacing: -0.5 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.2 },
  subLabelSpiegazione: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 16 },
  rigaCardSuperioriContainer: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 16 },
  cardSuperioreDueTerzi: { flex: 2, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.borderGlass, justifyContent: 'space-between' },
  rigaBoxInterniTrimestre: { flexDirection: 'row', gap: 6, marginTop: 10, width: '100%' },
  infoBoxStatMini: { flex: 1, backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, alignItems: 'flex-start', minHeight: 65 },
  cardSuperioreUnTerzo: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.borderGlass, justifyContent: 'space-between' },
  containerBoxInternoOggi: { marginTop: 10, width: '100%' },
  infoBoxStatOggiCompatto: { backgroundColor: '#020204', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGlass, borderLeftWidth: 3, alignItems: 'flex-start', minHeight: 65 },
  statLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: COLORS.muted, marginBottom: 2 },
  unitaMisuraSub: { fontSize: 9, color: COLORS.muted, fontWeight: '400' },
  statValueMini: { fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: '900', color: COLORS.onSurface },
  statValueOggiCentrale: { fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: '900' },
  cardGraficoContenitore: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass },
  rigaTitoloGrafico: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  pulsanteInfoTocco: { padding: 4, justifyContent: 'center', alignItems: 'center', opacity: 0.85 },
  containerGraficoSvg: { width: '100%', marginTop: 6, position: 'relative' },
  
  // 📐 RISOLTO CON LA PROPRIETÀ NATIVA: Ripristinato lo space-between ufficiale di React Native per separare ed allineare le ore/date sotto i grafici
  rigaEtichetteDate: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingHorizontal: 2 },
  dataTestoLabel: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '700', color: COLORS.muted },
  
  rigaColonneContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', minHeight: 140, paddingTop: 15, alignItems: 'flex-end' },
  singolaColonnaWrapper: { flex: 1, alignItems: 'center', gap: 6 },
  valoreColonnaTesto: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '800' },
  colonnaRettangolo: { width: 16, borderRadius: 4, minHeight: 4 },
  etichettaColonnaMomento: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, fontWeight: '700', color: COLORS.muted, marginTop: 2 },
  sfondoModalCentrato: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
  corpoSchedaModal: { backgroundColor: '#111116', borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: '#22222E', alignItems: 'flex-start' },
  titoloModal: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '800', color: COLORS.onSurface, marginBottom: 12 },
  testoDescrizioneModal: { fontFamily: 'Plus Jakarta Sans', fontSize: 14.5, color: COLORS.muted, lineHeight: 22, textAlign: 'left' },
  bottoneChiudiModal: { marginTop: 22, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: COLORS.borderGlass, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'stretch', alignItems: 'center' },
  testoBottoneChiudi: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  containerInterfacciaGlicata: { width: '100%', marginTop: 5 },
  rigaDatiGlicataPrincipale: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  valoreGlicataTestoCentrale: { fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  etichettaMmolSecondaria: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, fontWeight: '700' },
  binarioGrigioBarraSfondo: { width: '100%', height: 10, backgroundColor: '#171721', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGlass },
  riempimentoAttivoBarra: { height: '100%', borderRadius: 6 },
  rigaLegendaGlicataLimiti: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  testoLegendaMarcatore: { fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: '700', color: COLORS.muted }
});
