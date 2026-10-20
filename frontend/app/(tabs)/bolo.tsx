import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AppState, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHIAVE_TERAPIA_IOB, ConfigurazioneTerapia, creaTerapiaVuota, terapiaValida } from '@/src/utils/terapia-iob';
import { calcolaIobDaStorico } from '@/src/utils/iob-storico';
import { simulaBoloMatematico } from '@/src/utils/calcolo-bolo';
import { Ionicons } from '@expo/vector-icons';
import { DiabetyPageHeader } from '@/src/components/diabety-page-header';
import { DiabetyModalCloseButton } from '@/src/components/diabety-modal-close-button';
import { useDiabetyAlert } from '@/src/components/diabety-alert';
import { revisioneRipristinoBackup } from '@/src/services/backup-events';
import { DIABETY_COLORS } from '@/src/theme/diabety';
import {
  CHIAVE_BOLO_ORARIO, ConfigurazioneBoloOrario, FasciaBolo, creaConfigurazioneVuota,
  erroreConfigurazioneBolo, fasciaAllOra, fineFascia, leggiNumeroPositivo,
  minutiDaOrario, ordinaFasce,
} from '@/src/utils/bolo-orario';

const COLORS = DIABETY_COLORS;
const CYAN = COLORS.brandPrimary;
const TEXT = '#DCE8F0';
const SUB = '#9FB7C5';
const AMBER = '#FFB86B';
const RED = '#FF8585';
const CHIAVE_BOLO_PRECEDENTE = 'glicotrack_parametri_bolo';

type Parametro = 'rapportoCHO' | 'sensibilitaISF' | 'targetGlicemico' | 'sogliaCorrezione';
type Aiuto = Parametro | 'boloMassimo' | 'calcolo' | 'fasce';

const informazioni: Record<Aiuto, { titolo: string; testo: string; unita?: string }> = {
  rapportoCHO: {
    titolo: 'Rapporto I:CHO', unita: 'g CHO / UI',
    testo: "Indica quanti grammi di carboidrati vengono coperti da un'unità di insulina. Può cambiare tra le fasce della giornata. Utilizza soltanto il valore attuale concordato con il diabetologo.",
  },
  sensibilitaISF: {
    titolo: 'Sensibilità ISF', unita: 'mg/dL / UI',
    testo: "Indica la riduzione glicemica stimata per un'unità di insulina. È un parametro individuale e non misura l'insulina ancora attiva.",
  },
  targetGlicemico: {
    titolo: 'Target glicemico', unita: 'mg/dL',
    testo: 'È il valore glicemico di riferimento definito nel piano terapeutico. Può essere diverso dalla soglia oltre la quale si considera una correzione.',
  },
  sogliaCorrezione: {
    titolo: 'Soglia di correzione', unita: 'mg/dL',
    testo: 'È il valore oltre il quale può essere presa in considerazione una correzione, secondo il piano prescritto. Non coincide necessariamente con il target.',
  },
  boloMassimo: {
    titolo: 'Bolo massimo personale', unita: 'UI',
    testo: "È il limite per un singolo bolo definito dal diabetologo. Se la simulazione matematica supera questo limite, DIABETY non mostra il totale e non propone un valore sostitutivo. Non equivale a un limite verificato dal software per uso clinico.",
  },
  calcolo: {
    titolo: 'Calcolo del bolo',
    testo: "La fascia oraria viene identificata automaticamente. Il risultato visualizzato è esclusivamente un esercizio aritmetico: mostra separatamente le quote teoriche dei carboidrati e della correzione. Non incorpora l'IOB, non rappresenta una dose da somministrare e non abilita il bolo consigliato.",
  },
  fasce: {
    titolo: 'Fasce orarie',
    testo: "La prima fascia inizia sempre alle 00:00. Ogni fascia termina un minuto prima dell'inizio della successiva: nessun intervallo scoperto. Gli orari sono quelli locali del dispositivo.",
  },
};

const copiaConfig = (config: ConfigurazioneBoloOrario): ConfigurazioneBoloOrario => ({
  versione: 1, boloMassimo: config.boloMassimo,
  fasce: config.fasce.map(fascia => ({ ...fascia })),
});

const mostraOrario = (data: Date): string =>
  `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;

export default function CalcolatoreBoloScreen() {
  const mostraAvviso = useDiabetyAlert();
  const [glicemia, setGlicemia] = useState('00');
  const [cho, setCho] = useState('00');
  const [riepilogoAperto, setRiepilogoAperto] = useState(false);
  const [configSalvata, setConfigSalvata] = useState<ConfigurazioneBoloOrario | null>(null);
  const [bozza, setBozza] = useState<ConfigurazioneBoloOrario>(creaConfigurazioneVuota);
  const [caricamento, setCaricamento] = useState(true);
  const [modificaAttiva, setModificaAttiva] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);
  const [parametriPrecedenti, setParametriPrecedenti] = useState(false);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [erroreTerapiaIob, setErroreTerapiaIob] = useState<string | null>(null);
  const [dialogoFascia, setDialogoFascia] = useState<FasciaBolo | null>(null);
  const [dialogoNuova, setDialogoNuova] = useState(false);
  const [erroreFascia, setErroreFascia] = useState<string | null>(null);
  const [aiuto, setAiuto] = useState<Aiuto | null>(null);
  const [aiutoFasciaId, setAiutoFasciaId] = useState<string | null>(null);
  const [adesso, setAdesso] = useState(() => new Date());
  const [terapiaSalvata, setTerapiaSalvata] = useState<ConfigurazioneTerapia|null>(null);
  const [terapiaBozza, setTerapiaBozza] = useState<ConfigurazioneTerapia>(creaTerapiaVuota);
  const [storicoIob, setStoricoIob] = useState<unknown>([]);
  const [erroreStoricoIob, setErroreStoricoIob] = useState(false);
  const [insulineAperte, setInsulineAperte] = useState(false);
  const [fasceAperte, setFasceAperte] = useState(false);
  const [fasciaApertaId, setFasciaApertaId] = useState<string | null>(null);
  const [glicemiaInserita, setGlicemiaInserita] = useState(false);
  const [richiestaRiepilogo, setRichiestaRiepilogo] = useState(false);
  const [iobAperta, setIobAperta] = useState(false);
  const [somministrazioniAperte, setSomministrazioniAperte] = useState(false);
  const [tabSomministrazioni, setTabSomministrazioni] = useState<'rapida'|'basale'>('rapida');
  const revisioneBackup = useRef(revisioneRipristinoBackup());

  const chiudiRiepilogo = () => setRiepilogoAperto(false);
  const aggiornaStoricoIob = useCallback(async () => {
    try {
      const raw=await AsyncStorage.getItem('glicotrack_data');
      const dati=raw?JSON.parse(raw):[];
      setStoricoIob(dati);
      setErroreStoricoIob(!Array.isArray(dati));
    } catch {setStoricoIob(null);setErroreStoricoIob(true);}
  }, []);
  const caricaParametri = useCallback(async () => {
    setCaricamento(true);
    try {
      const [attualiRaw, vecchiRaw, terapiaRaw] = await Promise.all([
        AsyncStorage.getItem(CHIAVE_BOLO_ORARIO),
        AsyncStorage.getItem(CHIAVE_BOLO_PRECEDENTE),
        AsyncStorage.getItem(CHIAVE_TERAPIA_IOB),
      ]);
      const dati: unknown = attualiRaw ? JSON.parse(attualiRaw) : null;
      const configurazione:unknown=terapiaRaw?JSON.parse(terapiaRaw):null;
      if(configurazione!==null && !terapiaValida(configurazione)) {
        // L'errore della terapia IOB non deve bloccare una simulazione aritmetica indipendente.
        setErroreTerapiaIob('Configurazione terapia IOB non leggibile: i dati originali non sono stati modificati.');
        setTerapiaSalvata(null);
        setTerapiaBozza(creaTerapiaVuota());
      } else {
        setErroreTerapiaIob(null);
        const terapia= (configurazione as ConfigurazioneTerapia|null);
        setTerapiaSalvata(terapia);
        setTerapiaBozza(terapia?JSON.parse(JSON.stringify(terapia)):creaTerapiaVuota());
      }
      const problema = dati === null ? null : erroreConfigurazioneBolo(dati);
      if (problema) {
        setErroreCaricamento('Configurazione oraria memorizzata non valida. Non è stata sovrascritta.');
        setConfigSalvata(null);
        setBozza(creaConfigurazioneVuota());
      } else {
        const valida = dati as ConfigurazioneBoloOrario | null;
        setErroreCaricamento(null);
        setConfigSalvata(valida);
        setBozza(valida ? copiaConfig(valida) : creaConfigurazioneVuota());
      }
      setParametriPrecedenti(Boolean(vecchiRaw));
      setModificaAttiva(false);
      setDialogoFascia(null);
      setAiuto(null);
      setRiepilogoAperto(false);
      setAdesso(new Date());
    } catch (errore) {
      setErroreCaricamento('Impossibile leggere i parametri salvati. Nessun dato è stato modificato.');
      setConfigSalvata(null);
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => { void caricaParametri(); }, [caricaParametri]);
  useFocusEffect(useCallback(() => {
    const nuovaRevisione = revisioneRipristinoBackup();
    if (nuovaRevisione !== revisioneBackup.current) {
      revisioneBackup.current = nuovaRevisione;
      void caricaParametri();
    }
    setAdesso(new Date());
    setIobAperta(false);
    setSomministrazioniAperte(false);
    setFasceAperte(false);
    setFasciaApertaId(null);
    void aggiornaStoricoIob();
  }, [caricaParametri, aggiornaStoricoIob]));

  // Aggiorna automaticamente la fascia al cambio di minuto e al ritorno in primo piano.
  useEffect(() => {
    const timer = setInterval(() => {setAdesso(new Date());void aggiornaStoricoIob();}, 60_000);
    const subscription = AppState.addEventListener('change', stato => {
      if (stato === 'active') {setAdesso(new Date());void aggiornaStoricoIob();}
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [aggiornaStoricoIob]);

  const fasciaCorrente = configSalvata ? fasciaAllOra(configSalvata.fasce, adesso) : null;
  const fasciaId = fasciaCorrente?.id ?? null;
  const oraAttuale = mostraOrario(adesso);
  const fasciaPrecedente = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (fasciaPrecedente.current !== undefined && fasciaPrecedente.current !== fasciaId) {
      setRiepilogoAperto(false);
    }
    fasciaPrecedente.current = fasciaId;
  }, [fasciaId]);

  const iob=calcolaIobDaStorico(erroreStoricoIob?null:storicoIob,terapiaSalvata,adesso.getTime());
  const dataSomministrazioni=tabSomministrazioni==='rapida'?iob.rapida:iob.basale;
  const glicemiaValida = /^\d+$/.test(glicemia.trim()) && Number(glicemia.trim()) > 0 && Number(glicemia.trim()) <= 999;

  // Il calcolo puramente aritmetico non usa la stima IOB e NON determina una dose terapeutica.
  // Validare qui prima di mostrare un totale: mai trasformare un errore in 0 UI.
  const inputGlicemiaAttivato = glicemiaInserita || richiestaRiepilogo;
  const simulazione = (inputGlicemiaAttivato && !caricamento && !modificaAttiva && !erroreCaricamento)
    ? simulaBoloMatematico(configSalvata, fasciaCorrente, glicemia, cho)
    : null;
  const simulazioneDisponibile = simulazione?.ok === true;
  let titoloAvviso = 'Stima matematica non terapeutica';
  let testoAvviso = 'Il risultato è solo aritmetico e non considera IOB o altre variabili cliniche. Non indica una dose da somministrare: il Bolo consigliato resta disabilitato.';
  let avvisoRosso = false;
  if (modificaAttiva) {
    titoloAvviso = 'Modifica dei parametri in corso';
    testoAvviso = 'Salva e blocca i parametri oppure annulla le modifiche prima di visualizzare la simulazione.';
  } else if (erroreCaricamento) {
    titoloAvviso = 'Parametri non leggibili';
    testoAvviso = erroreCaricamento;
    avvisoRosso = true;
  } else if (caricamento) {
    titoloAvviso = 'Caricamento parametri';
    testoAvviso = 'Verifica dei dati in corso.';
  } else if (simulazione && !simulazione.ok) {
    titoloAvviso = simulazione.titolo;
    testoAvviso = simulazione.messaggio;
    avvisoRosso = simulazione.codice !== 'configurazione';
  }
  // Evitare che una IOB incompleta venga interpretata come pari a zero.
  if (simulazioneDisponibile && iob.stato === 'non_disponibile') {
    testoAvviso += ' IOB non disponibile: non presumere che l’insulina attiva sia assente.';
  }
  // Il valore iniziale '00' è solo un segnaposto visivo: nessun avviso all'apertura.
  const mostraAvvisoCalcolo = inputGlicemiaAttivato || modificaAttiva || Boolean(erroreCaricamento) || caricamento;

  const iniziaModifica = () => {
    if (caricamento || salvataggio) return;
    setBozza(configSalvata ? copiaConfig(configSalvata) : creaConfigurazioneVuota());
    setTerapiaBozza(terapiaSalvata?JSON.parse(JSON.stringify(terapiaSalvata)):creaTerapiaVuota());
    setModificaAttiva(true);
    setAiuto(null);
    chiudiRiepilogo();
  };
  const annullaModifiche = () => {
    setBozza(configSalvata ? copiaConfig(configSalvata) : creaConfigurazioneVuota());
    setTerapiaBozza(terapiaSalvata?JSON.parse(JSON.stringify(terapiaSalvata)):creaTerapiaVuota());
    setModificaAttiva(false);
    setDialogoFascia(null);
    setAiuto(null);
    chiudiRiepilogo();
  };
  const salvaEBlocca = async () => {
    if (!modificaAttiva || salvataggio) return;
    const normale = { ...bozza, fasce: ordinaFasce(bozza.fasce) };
    const errore = erroreConfigurazioneBolo(normale);
    if (errore) { mostraAvviso(errore); return; }
    if (!terapiaValida(terapiaBozza)) {mostraAvviso('Configurazione insuline non valida.');return;}
    setSalvataggio(true);
    try {
      // Chiave nuova: non altera i tre parametri salvati nelle versioni precedenti.
      const precedenti=await AsyncStorage.multiGet([CHIAVE_BOLO_ORARIO,CHIAVE_TERAPIA_IOB]);
      try {
        await AsyncStorage.multiSet([[CHIAVE_BOLO_ORARIO,JSON.stringify(normale)],[CHIAVE_TERAPIA_IOB,JSON.stringify(terapiaBozza)]]);
      } catch (erroreScrittura) {
        for(const [chiave,valore] of precedenti) {if(valore===null) await AsyncStorage.removeItem(chiave);else await AsyncStorage.setItem(chiave,valore);}
        throw erroreScrittura;
      }
      setTerapiaSalvata(JSON.parse(JSON.stringify(terapiaBozza)));
      setConfigSalvata(copiaConfig(normale));
      setBozza(copiaConfig(normale));
      setModificaAttiva(false);
      setAiuto(null);
      chiudiRiepilogo();
    } catch (erroreScrittura) {
      mostraAvviso('Impossibile salvare i parametri. Riprova: le modifiche restano aperte.');
    } finally {
      setSalvataggio(false);
    }
  };

  const nuovaFascia = () => {
    if (!modificaAttiva || bozza.fasce.length >= 48) return;
    setDialogoNuova(true);
    setErroreFascia(null);
    setDialogoFascia({ id: `fascia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inizio: '', nome: '', rapportoCHO: '', sensibilitaISF: '', targetGlicemico: '', sogliaCorrezione: '' });
    setAiuto(null);
  };
  const apriFascia = (fascia: FasciaBolo) => {
    if (!modificaAttiva) return;
    setDialogoNuova(false);
    setErroreFascia(null);
    setDialogoFascia({ ...fascia });
    setAiuto(null);
  };
  const cambiaCampoFascia = (campo: keyof FasciaBolo, valore: string) => {
    setErroreFascia(null);
    setDialogoFascia(precedente => precedente ? { ...precedente, [campo]: valore } : null);
  };

  const confermaFascia = () => {
    if (!dialogoFascia) return;
    const fascia = { ...dialogoFascia, inizio: dialogoFascia.inizio.trim(), nome: (dialogoFascia.nome ?? '').trim() };
    if (fascia.nome.length > 22 || /[\r\n\x00-\x1f]/.test(fascia.nome)) {
      setErroreFascia('Il nome può contenere al massimo 22 caratteri, su una sola riga.'); return;
    }
    const minuti = minutiDaOrario(fascia.inizio);
    if (minuti === null) { setErroreFascia('Inserisci un orario valido nel formato HH:MM.'); return; }
    if (fascia.id === 'fascia-0000' && fascia.inizio !== '00:00') {
      setErroreFascia('La prima fascia deve iniziare alle 00:00.'); return;
    }
    if (fascia.id !== 'fascia-0000' && fascia.inizio === '00:00') {
      setErroreFascia('La fascia delle 00:00 è già presente e non può essere duplicata.'); return;
    }
    if (bozza.fasce.some(f => f.id !== fascia.id && f.inizio === fascia.inizio)) {
      setErroreFascia('Esiste già una fascia con lo stesso orario di inizio.'); return;
    }
    if ([fascia.rapportoCHO, fascia.sensibilitaISF, fascia.targetGlicemico, fascia.sogliaCorrezione]
      .some(campo => leggiNumeroPositivo(campo) === null)) {
      setErroreFascia('Completa tutti e quattro i parametri con valori positivi concordati con il medico.'); return;
    }
    if (leggiNumeroPositivo(fascia.sogliaCorrezione)! < leggiNumeroPositivo(fascia.targetGlicemico)!) {
      setErroreFascia('La soglia di correzione non può essere inferiore al target.'); return;
    }
    setBozza(precedente => ({ ...precedente,
      fasce: ordinaFasce(dialogoNuova ? [...precedente.fasce, fascia] : precedente.fasce.map(f => f.id === fascia.id ? fascia : f)),
    }));
    setDialogoFascia(null);
    setErroreFascia(null);
    setAiuto(null);
  };
  const eliminaFascia = () => {
    if (!dialogoFascia || dialogoFascia.id === 'fascia-0000') return;
    setBozza(precedente => ({ ...precedente, fasce: precedente.fasce.filter(f => f.id !== dialogoFascia.id) }));
    setDialogoFascia(null);
    setAiuto(null);
  };

  const fasceDaMostrare = ordinaFasce(modificaAttiva ? bozza.fasce : (configSalvata?.fasce ?? creaConfigurazioneVuota().fasce));
  const fineFasciaDialogo = dialogoFascia && minutiDaOrario(dialogoFascia.inizio) !== null
    ? fineFascia(
        [...bozza.fasce.filter(f => f.id !== dialogoFascia.id), dialogoFascia],
        dialogoFascia.id,
      ) : '—';
  // Il nome inserito direttamente nella mini-card modifica soltanto la bozza.
  const cambiaNomeMiniCard = (id: string, nome: string) => {
    if (!modificaAttiva) return;
    setBozza(precedente => ({ ...precedente,
      fasce: precedente.fasce.map(fascia => fascia.id === id ? { ...fascia, nome } : fascia),
    }));
  };
  const testoAiuto = (chiave: Aiuto) => (
    <View style={styles.helpInline}>
      <Text style={styles.helpTitle}>{informazioni[chiave].titolo}</Text>
      <Text style={styles.helpText}>{informazioni[chiave].testo}</Text>
    </View>
  );
  const pulsanteAiuto = (chiave: Aiuto, idFascia?: string) => (
    <TouchableOpacity
      style={styles.helpButton} onPress={() => {
        const stesso = aiuto === chiave && aiutoFasciaId === (idFascia ?? null);
        setAiuto(stesso ? null : chiave);
        setAiutoFasciaId(stesso ? null : (idFascia ?? null));
      }}
      accessibilityRole="button" accessibilityLabel={`Informazioni: ${informazioni[chiave].titolo}`} hitSlop={8}>
      <Text style={styles.helpMark}>?</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <DiabetyPageHeader variant="bolo">
        <View style={styles.headerContent}>
          <Text style={styles.title}>Calcolo Bolo</Text>
          <Text style={styles.subtitle}>Parametri orari e sicurezza personalizzata</Text>
        </View>
      </DiabetyPageHeader>

      {/* CARD 1 — CALCOLO: nessun algoritmo terapeutico viene attivato */}
      <View style={styles.mainCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardHeading}>Calcolo del bolo</Text>
            <Text style={styles.cardSubheading}>Verifica i tuoi dati e i parametri della fascia</Text>
          </View>
          {pulsanteAiuto('calcolo')}
        </View>
        {aiuto === 'calcolo' && testoAiuto('calcolo')}

        <View style={{backgroundColor:'#0B1921',borderWidth:1,borderColor:'#245263',borderRadius:12,padding:12,gap:8,marginBottom:12}}>
          <TouchableOpacity
            style={styles.rowSpace}
            onPress={() => { setIobAperta(aperta => !aperta); setSomministrazioniAperte(false); }}
            accessibilityRole="button"
            accessibilityState={{ expanded: iobAperta }}
            accessibilityLabel={`Insulina attiva (IOB), ${iob.stato==='zero'?'0 UI':iob.ui===null?'— UI':`${iob.ui.toFixed(2)} UI`}, ${iobAperta?'chiudi':'apri'} dettagli`}>
            <Text style={styles.subheading}>Insulina attiva (IOB)</Text>
            <View style={styles.rowSmall}>
              <Text style={{fontSize:20,fontWeight:'800',color:CYAN}}>{iob.stato==='zero'?'0 UI':iob.ui===null?'— UI':`${iob.ui.toFixed(2)} UI`}</Text>
              <Ionicons name={iobAperta ? 'chevron-up' : 'chevron-down'} size={17} color={CYAN}/>
            </View>
          </TouchableOpacity>
          {iobAperta && <View style={{gap:8}}>
          <Text style={styles.secondaryText}>Ultima dose rapida: {iob.ultima?`${iob.ultima.ui} UI · ${new Date(iob.ultima.istante).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`:'—'}</Text>
          <Text style={styles.microNote}>{erroreTerapiaIob ?? iob.motivo}</Text>
          <Text style={styles.microNote}>IOB informativa non validata: non utilizzarla per decidere dosi e non viene sottratta dal bolo.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={somministrazioniAperte?'Nascondi somministrazioni':'Mostra somministrazioni'} onPress={()=>setSomministrazioniAperte(x=>!x)}>
            <Text style={{color:CYAN,fontWeight:'700',fontSize:12}}>{somministrazioniAperte?'Nascondi somministrazioni ▲':'Mostra somministrazioni ▼'}</Text>
          </TouchableOpacity>
          {somministrazioniAperte && <View style={{gap:7}}>
            <View style={{flexDirection:'row',gap:7}}>
              {(['rapida','basale'] as const).map(t=><TouchableOpacity key={t} accessibilityRole="button" onPress={()=>setTabSomministrazioni(t)} style={{borderWidth:1,borderColor:tabSomministrazioni===t?CYAN:'#42606B',paddingHorizontal:9,paddingVertical:6,borderRadius:7}}>
                <Text style={{color:tabSomministrazioni===t?CYAN:TEXT,fontSize:12}}>{t==='rapida'?'Rapida':'Basale'}</Text>
              </TouchableOpacity>)}
            </View>
            {dataSomministrazioni.length===0?<Text style={styles.secondaryText}>Nessuna somministrazione registrata.</Text>:
             dataSomministrazioni.map(d=><Text key={d.id} style={styles.secondaryText}>{d.ui} UI · {new Date(d.istante).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</Text>)}
          </View>}
          </View>}
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputCard}>
            <View style={styles.rowSmall}>
              <Ionicons name="water-outline" color={CYAN} size={16}/>
              <Text style={styles.inputLabel}>Glicemia</Text>
            </View>
            <TextInput
              style={[styles.primaryInput, { color: glicemiaValida ? '#FFFFFF' : SUB }]}
              keyboardType="number-pad" inputMode="numeric" selectTextOnFocus
              value={glicemia} onChangeText={valore => { setGlicemia(valore); setGlicemiaInserita(true); setRichiestaRiepilogo(false); chiudiRiepilogo(); }}
              onBlur={() => { if (glicemia.trim() === '') { setGlicemia('00'); setGlicemiaInserita(false); setRichiestaRiepilogo(false); } }}
              maxLength={3} accessibilityLabel="Glicemia in mg/dL"/>
            <Text style={styles.unit}>mg/dL</Text>
          </View>
          <View style={styles.inputCard}>
            <View style={styles.rowSmall}>
              <Ionicons name="nutrition-outline" color={CYAN} size={16}/>
              <Text style={styles.inputLabel}>Carboidrati</Text>
            </View>
            <TextInput
              style={styles.primaryInput} keyboardType="decimal-pad" selectTextOnFocus
              value={cho} onChangeText={valore => { setCho(valore); chiudiRiepilogo(); }}
              onBlur={() => { if (cho.trim() === '') setCho('00'); }}
              maxLength={9} accessibilityLabel="Carboidrati in grammi"/>
            <Text style={styles.unit}>g CHO</Text>
          </View>
        </View>
        <Text style={styles.microNote}>CHO a 00 consentiti; la glicemia 00 è soltanto un valore iniziale, non una misurazione.</Text>

        <View style={styles.resultBox}>
          <Text style={styles.eyebrow}>STIMA MATEMATICA · NON TERAPEUTICA</Text>
          <Text style={styles.resultValue}>
            {simulazione?.ok === true ? simulazione.risultato.totale.toFixed(2) : '—'} <Text style={styles.resultUnit}>UI</Text>
          </Text>
          <Text style={[styles.secondaryText, { textAlign: 'center' }]}>
            {simulazione?.ok === true
              ? 'Somma puramente teorica delle quote CHO e correzione · IOB non sottratta'
              : inputGlicemiaAttivato ? 'Simulazione non disponibile: controlla l’avviso presente nella scheda' : 'Inserisci la glicemia per visualizzare la stima matematica'}
          </Text>
          <Text style={[styles.microNote, { textAlign: 'center' }]}>Non usare questo valore per decidere una somministrazione di insulina. Bolo consigliato: non abilitato.</Text>
        </View>
        <View style={styles.fasciaAttivaBox}>
          <View style={styles.rowSpace}>
            <View style={styles.rowSmall}>
              <Ionicons name="time-outline" color={CYAN} size={16} />
              <Text style={styles.eyebrow}>FASCIA ORARIA ATTIVA</Text>
            </View>
            <Text style={styles.oraLabel}>{oraAttuale}</Text>
          </View>
          <Text style={styles.fasciaAttivaTitolo}>
            {fasciaCorrente ? `${fasciaCorrente.inizio} – ${fineFascia(configSalvata!.fasce, fasciaCorrente.id)}${fasciaCorrente.nome?.trim() ? ` · ${fasciaCorrente.nome.trim()}` : ''}` : 'Da configurare'}
          </Text>
          <Text style={styles.secondaryText}>Selezione automatica dall'orario locale del dispositivo</Text>
        </View>

        <View style={styles.paramsUsed}>
          <View style={styles.rowSpace}>
            <Text style={styles.subheading}>Parametri selezionati</Text>
            <Ionicons name="options-outline" color={CYAN} size={18}/>
          </View>
          <View style={styles.threeColumns}>
            {([
              ['I:CHO', fasciaCorrente?.rapportoCHO],
              ['ISF', fasciaCorrente?.sensibilitaISF],
              ['Target', fasciaCorrente?.targetGlicemico],
            ] as [string, string | undefined][]).map(([titolo, valore]) => (
              <View style={styles.paramPreview} key={titolo}>
                <Text style={styles.paramPreviewLabel}>{titolo}</Text>
                <Text style={styles.paramPreviewValue}>{valore || '—'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.divider}/>
          <View style={styles.rowSpace}>
            <Text style={styles.secondaryText}>Soglia di correzione</Text>
            <Text style={styles.paramSmallValue}>{fasciaCorrente?.sogliaCorrezione ? `${fasciaCorrente.sogliaCorrezione} mg/dL` : 'Da configurare'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reviewButton} onPress={() => { if (!riepilogoAperto) setRichiestaRiepilogo(true); setRiepilogoAperto(v => !v); }}
          accessibilityRole="button" accessibilityLabel="Rivedi dati: apri o chiudi il riepilogo">
          <Ionicons name={riepilogoAperto ? 'chevron-up-outline' : 'clipboard-outline'} size={18} color="#08151B"/>
          <Text style={styles.reviewButtonText}>Rivedi dati</Text>
        </TouchableOpacity>
        {riepilogoAperto && (
          <View style={styles.reviewPanel}>
            <View style={styles.rowSpace}>
              <Text style={styles.subheading}>Riepilogo dei dati</Text>
              <TouchableOpacity onPress={chiudiRiepilogo} accessibilityRole="button" accessibilityLabel="Chiudi riepilogo" hitSlop={8}>
                <Ionicons name="close-outline" size={24} color={SUB}/>
              </TouchableOpacity>
            </View>
            <View style={styles.rowSpace}>
              <Text style={styles.secondaryText}>Glicemia</Text>
              <Text style={styles.paramSmallValue}>{glicemia} mg/dL</Text>
            </View>
            <View style={styles.rowSpace}>
              <Text style={styles.secondaryText}>Carboidrati</Text>
              <Text style={styles.paramSmallValue}>{cho} g</Text>
            </View>
            <View style={styles.rowSpace}>
              <Text style={styles.secondaryText}>Fascia selezionata</Text>
              <Text style={styles.paramSmallValue}>{fasciaCorrente ? `${fasciaCorrente.inizio}${fasciaCorrente.nome?.trim() ? ` · ${fasciaCorrente.nome.trim()}` : ''}` : 'Non disponibile'}</Text>
            </View>
            <View style={styles.rowSpace}>
              <Text style={styles.secondaryText}>IOB informativa</Text>
              <Text style={styles.paramSmallValue}>{iob.stato==='zero'?'0 UI':iob.ui===null?'Non disponibile':`${iob.ui.toFixed(2)} UI`}</Text>
            </View>
            {simulazione?.ok === true && (
              <>
                <View style={styles.rowSpace}>
                  <Text style={styles.secondaryText}>Quota CHO · solo aritmetica</Text>
                  <Text style={styles.paramSmallValue}>{simulazione.risultato.quotaPasto.toFixed(2)} UI</Text>
                </View>
                <View style={styles.rowSpace}>
                  <Text style={styles.secondaryText}>Quota correzione · solo aritmetica</Text>
                  <Text style={styles.paramSmallValue}>{simulazione.risultato.quotaCorrezione.toFixed(2)} UI</Text>
                </View>
                <View style={styles.rowSpace}>
                  <Text style={styles.secondaryText}>Somma teorica, senza IOB</Text>
                  <Text style={styles.paramSmallValue}>{simulazione.risultato.totale.toFixed(2)} UI</Text>
                </View>
              </>
            )}
            <Text style={styles.microNote}>Esercizio matematico, NON dose consigliata. La stima IOB non modifica le quote: servono valutazioni tecniche e cliniche prima di qualsiasi utilizzo terapeutico.</Text>
          </View>
        )}

        {mostraAvvisoCalcolo && <View style={[styles.alertBox, avvisoRosso && styles.alertRed]}>
          <Ionicons name="shield-outline" color={avvisoRosso ? RED : AMBER} size={20}/>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.alertTitle, { color: avvisoRosso ? RED : AMBER }]}>{titoloAvviso}</Text>
            <Text style={styles.alertText}>{testoAvviso}</Text>
          </View>
        </View>}
      </View>

      {/* CARD 2 — PARAMETRI, lucchetto con semantica originale di salvataggio */}
      <View style={styles.mainCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.cardHeading}>Parametri terapeutici</Text>
            <View style={styles.rowSmall}>
              <Ionicons name={modificaAttiva ? 'lock-open-outline' : 'lock-closed-outline'} color={modificaAttiva ? AMBER : CYAN} size={13}/>
              <Text style={styles.cardSubheading}>{modificaAttiva ? 'Modifica in corso' : 'Parametri protetti'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.lockButton} onPress={modificaAttiva ? salvaEBlocca : iniziaModifica}
            disabled={caricamento || salvataggio} accessibilityRole="button"
            accessibilityLabel={modificaAttiva ? 'Salva e blocca i parametri' : 'Modifica i parametri terapeutici'}>
            <Ionicons name={modificaAttiva ? 'lock-open-outline' : 'lock-closed-outline'} color={modificaAttiva ? AMBER : CYAN} size={15}/>
            <Text style={styles.lockText}>{modificaAttiva ? (salvataggio ? 'Salvataggio…' : 'Salva e blocca') : 'Modifica'}</Text>
          </TouchableOpacity>
        </View>
        {modificaAttiva && (
          <TouchableOpacity style={styles.cancelEdit} onPress={annullaModifiche} disabled={salvataggio}
            accessibilityRole="button" accessibilityLabel="Annulla modifiche ai parametri">
            <Ionicons name="arrow-undo-outline" color={SUB} size={15}/>
            <Text style={styles.cancelEditText}>Annulla modifiche</Text>
          </TouchableOpacity>
        )}
        {erroreCaricamento && <Text style={styles.errorText}>{erroreCaricamento}</Text>}
        {parametriPrecedenti && !configSalvata && (
          <View style={styles.oldParamsNote}>
            <Ionicons name="archive-outline" color={AMBER} size={17}/>
            <Text style={styles.oldParamsText}>I tre parametri della versione precedente sono conservati, ma non vengono applicati automaticamente alle nuove fasce.</Text>
          </View>
        )}

        <View style={{borderWidth:1,borderColor:'#245263',borderRadius:10,padding:10,gap:9,marginBottom:12}}>
          <Text style={styles.subheading}>Seleziona la Modalità di Terapia</Text>
          <View style={{flexDirection:'row',gap:8}}>
            {(['penne','microinfusore'] as const).map(m=><TouchableOpacity key={m} disabled={!modificaAttiva} onPress={()=>setTerapiaBozza(prev=>({...prev,modalita:m}))} style={{borderWidth:1,borderColor:(modificaAttiva?terapiaBozza:terapiaSalvata)?.modalita===m?CYAN:'#42606B',borderRadius:8,padding:8}}>
              <Text style={{color:(modificaAttiva?terapiaBozza:terapiaSalvata)?.modalita===m?CYAN:TEXT,fontSize:12,fontWeight:'600'}}>{m==='penne'?'Penne':'Microinfusore'}</Text>
            </TouchableOpacity>)}
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={()=>setInsulineAperte(v=>!v)} style={styles.rowSpace}>
            <Text style={styles.subheading}>Insuline utilizzate</Text>
            <Ionicons name={insulineAperte?'chevron-up':'chevron-down'} color={CYAN} size={16}/>
          </TouchableOpacity>
          {insulineAperte && <View style={{gap:9}}>
            <Text style={styles.microNote}>Parametri non precompilati. Nome, durata in ore e picco in minuti del modello esponenziale; nessun valore è validato per dosi terapeutiche.</Text>
            {((modificaAttiva?terapiaBozza:terapiaSalvata)?.modalita??'penne')==='penne' ? <>
              <Text style={styles.secondaryText}>Insulina rapida · Penne</Text>
              {(['nome','durataOre','piccoMin'] as const).map(c=><View key={'rapida'+c} style={{gap:3}}>
                <Text style={styles.microNote}>{c==='nome'?'Nome insulina':c==='durataOre'?'Durata (ore)':'Picco del modello (minuti)'}</Text>
                <TextInput style={{borderWidth:1,borderColor:'#42606B',borderRadius:7,padding:8,color:TEXT,fontSize:16}} editable={modificaAttiva} value={(modificaAttiva?terapiaBozza:terapiaSalvata)?.penne.rapida[c]??''} onChangeText={v=>setTerapiaBozza(prev=>({...prev,penne:{...prev.penne,rapida:{...prev.penne.rapida,[c]:v}}}))} placeholder="Da configurare" placeholderTextColor={SUB} keyboardType={c==='nome'?'default':'decimal-pad'} />
              </View>)}
              <Text style={styles.secondaryText}>Insulina basale · Penne</Text>
              {(['nome','durataOre'] as const).map(c=><View key={'basale'+c} style={{gap:3}}>
                <Text style={styles.microNote}>{c==='nome'?'Nome insulina':'Durata (ore)'}</Text>
                <TextInput style={{borderWidth:1,borderColor:'#42606B',borderRadius:7,padding:8,color:TEXT,fontSize:16}} editable={modificaAttiva} value={(modificaAttiva?terapiaBozza:terapiaSalvata)?.penne.basale[c]??''} onChangeText={v=>setTerapiaBozza(prev=>({...prev,penne:{...prev.penne,basale:{...prev.penne.basale,[c]:v}}}))} placeholder="Da configurare" placeholderTextColor={SUB} keyboardType={c==='nome'?'default':'decimal-pad'} />
              </View>)}
            </> : <>
              <Text style={styles.secondaryText}>Insulina dei boli · Microinfusore</Text>
              {(['nome','durataOre','piccoMin'] as const).map(c=><View key={'pompa'+c} style={{gap:3}}>
                <Text style={styles.microNote}>{c==='nome'?'Nome insulina':c==='durataOre'?'Durata (ore)':'Picco del modello (minuti)'}</Text>
                <TextInput style={{borderWidth:1,borderColor:'#42606B',borderRadius:7,padding:8,color:TEXT,fontSize:16}} editable={modificaAttiva} value={(modificaAttiva?terapiaBozza:terapiaSalvata)?.microinfusore.bolo[c]??''} onChangeText={v=>setTerapiaBozza(prev=>({...prev,microinfusore:{...prev.microinfusore,bolo:{...prev.microinfusore.bolo,[c]:v}}}))} placeholder="Da configurare" placeholderTextColor={SUB} keyboardType={c==='nome'?'default':'decimal-pad'} />
              </View>)}
              <TouchableOpacity disabled={!modificaAttiva} onPress={()=>setTerapiaBozza(prev=>({...prev,microinfusore:{...prev.microinfusore,basaleAggiuntiva:{...prev.microinfusore.basaleAggiuntiva,abilitata:!prev.microinfusore.basaleAggiuntiva.abilitata}}}))}>
                <Text style={{color:CYAN}}>Basale aggiuntiva con penna: {(modificaAttiva?terapiaBozza:terapiaSalvata)?.microinfusore.basaleAggiuntiva.abilitata?'Sì':'No'}</Text>
              </TouchableOpacity>
              {(modificaAttiva?terapiaBozza:terapiaSalvata)?.microinfusore.basaleAggiuntiva.abilitata && (['nome','durataOre'] as const).map(c=><View key={'extra'+c} style={{gap:3}}>
                <Text style={styles.microNote}>{c==='nome'?'Nome basale aggiuntiva':'Durata (ore)'}</Text>
                <TextInput style={{borderWidth:1,borderColor:'#42606B',borderRadius:7,padding:8,color:TEXT,fontSize:16}} editable={modificaAttiva} value={(modificaAttiva?terapiaBozza:terapiaSalvata)?.microinfusore.basaleAggiuntiva[c]??''} onChangeText={v=>setTerapiaBozza(prev=>({...prev,microinfusore:{...prev.microinfusore,basaleAggiuntiva:{...prev.microinfusore.basaleAggiuntiva,[c]:v}}}))} placeholder="Da configurare" placeholderTextColor={SUB} keyboardType={c==='nome'?'default':'decimal-pad'} />
              </View>)}
            </>}
          </View>}
        </View>
        {/* FASCE ORARIE — doppio menu a tendina, chiuso di default e una sola fascia visibile. */}
        <View style={styles.fasceAccordion}>
          <TouchableOpacity
            style={styles.fasceAccordionHeader}
            onPress={() => {
              setFasceAperte(precedente => !precedente);
              setFasciaApertaId(null);
              setAiuto(null);
              setAiutoFasciaId(null);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: fasceAperte }}
            accessibilityLabel={`Fasce orarie, ${fasceDaMostrare.length} configurate, ${fasceAperte ? 'chiudi' : 'apri'} elenco`}>
            <View style={styles.fasceAccordionIcon}>
              <Ionicons name="time-outline" size={19} color={CYAN}/>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.subheading}>Fasce orarie</Text>
              <Text style={styles.secondaryText}>{fasceDaMostrare.length} {fasceDaMostrare.length === 1 ? 'fascia configurata' : 'fasce configurate'}</Text>
            </View>
            <Ionicons name={fasceAperte ? 'chevron-up' : 'chevron-down'} size={19} color={CYAN}/>
          </TouchableOpacity>
          {fasceAperte && <View style={styles.fasceAccordionBody}>
            <View style={styles.rowSpace}>
              <Text style={[styles.secondaryText, { flex: 1 }]}>Ogni fascia termina prima dell'inizio della successiva.</Text>
              {pulsanteAiuto('fasce')}
            </View>
            {aiuto === 'fasce' && testoAiuto('fasce')}
            {fasceDaMostrare.map(fascia => {
              const aperta = fasciaApertaId === fascia.id;
              return (
                <View style={styles.fasciaMiniCard} key={fascia.id}>
                  <TouchableOpacity
                    style={styles.fasciaCollapsedHeader}
                    onPress={() => { setFasciaApertaId(aperta ? null : fascia.id); setAiuto(null); setAiutoFasciaId(null); }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: aperta }}
                    accessibilityLabel={`${fascia.inizio} - ${fineFascia(fasceDaMostrare, fascia.id)}, ${fascia.nome?.trim() || 'senza nome'}, ${aperta ? 'chiudi' : 'apri'} parametri`}>
                    <View style={{flex:1, minWidth:0, gap:3}}>
                      <Text style={styles.fasciaName}>{fascia.inizio} – {fineFascia(fasceDaMostrare, fascia.id)}</Text>
                      <Text style={styles.fasciaCollapsedName} numberOfLines={1}>{fascia.nome?.trim() || 'Senza nome'}</Text>
                    </View>
                    <Ionicons name={aperta ? 'chevron-up' : 'chevron-down'} size={18} color={CYAN}/>
                  </TouchableOpacity>
                  {aperta && <View style={styles.fasciaExpandedBody}>
                    <View style={styles.metricGrid}>
                      {([
                        ['rapportoCHO', 'I:CHO'], ['sensibilitaISF', 'ISF'],
                        ['targetGlicemico', 'Target'], ['sogliaCorrezione', 'Soglia'],
                      ] as [Parametro, string][]).map(([campo, etichetta]) => (
                        <View style={styles.metricCell} key={campo}>
                          <TouchableOpacity
                            style={styles.metricHelpTarget}
                            accessibilityRole="button"
                            accessibilityLabel={`Informazioni: ${etichetta}`}
                            onPress={() => {
                              const stesso = aiuto === campo && aiutoFasciaId === fascia.id;
                              setAiuto(stesso ? null : campo);
                              setAiutoFasciaId(stesso ? null : fascia.id);
                            }}>
                            <Text style={styles.metricLabel}>{etichetta}</Text>
                            <Ionicons name="help-circle-outline" size={13} color={CYAN}/>
                          </TouchableOpacity>
                          <Text style={styles.metricValue} numberOfLines={1}>{fascia[campo] || '—'}</Text>
                        </View>
                      ))}
                    </View>
                    {aiuto && ['rapportoCHO', 'sensibilitaISF', 'targetGlicemico', 'sogliaCorrezione'].includes(aiuto) &&
                      aiutoFasciaId === fascia.id && testoAiuto(aiuto)}
                    {modificaAttiva && <View style={{gap:8}}>
                      <Text style={styles.fasciaNameFieldLabel}>Nome fascia (facoltativo)</Text>
                      <TextInput style={styles.fasciaNameInput} value={fascia.nome ?? ''}
                        onChangeText={valore => cambiaNomeMiniCard(fascia.id, valore)}
                        placeholder="Es. Notte" placeholderTextColor={SUB} maxLength={22}
                        accessibilityLabel={`Nome della fascia ${fascia.inizio}`} />
                      <TouchableOpacity style={styles.fasciaEditButton} onPress={() => apriFascia(fascia)} accessibilityRole="button"
                        accessibilityLabel={`Modifica orario e parametri della fascia ${fascia.inizio}`}>
                        <Ionicons name="create-outline" color={CYAN} size={17}/>
                        <Text style={styles.fasciaEditText}>Modifica orario e parametri</Text>
                      </TouchableOpacity>
                    </View>}
                  </View>}
                </View>
              );
            })}
            {modificaAttiva && (
              <TouchableOpacity style={styles.addButton} onPress={nuovaFascia} accessibilityRole="button"
                accessibilityLabel="Aggiungi fascia oraria">
                <Ionicons name="add-circle-outline" color={CYAN} size={19}/>
                <Text style={styles.addText}>Aggiungi fascia oraria</Text>
              </TouchableOpacity>
            )}
          </View>}
        </View>

        <View style={styles.globalParamBox}>
          <View style={styles.rowSpace}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.subheading}>Bolo massimo personale</Text>
              <Text style={styles.secondaryText}>Limite globale per singolo bolo (UI)</Text>
            </View>
            {pulsanteAiuto('boloMassimo')}
          </View>
          {aiuto === 'boloMassimo' && testoAiuto('boloMassimo')}
          {modificaAttiva ? (
            <TextInput style={styles.maxInput} keyboardType="decimal-pad" value={bozza.boloMassimo}
              placeholder="Da configurare" placeholderTextColor={SUB}
              onChangeText={valore => setBozza(precedente => ({ ...precedente, boloMassimo: valore }))}
              accessibilityLabel="Bolo massimo personale in UI" maxLength={9}/>
          ) : (
            <Text style={styles.maxValue}>{configSalvata?.boloMassimo ? `${configSalvata.boloMassimo} UI` : 'Non definito'}</Text>
          )}
          <View style={styles.divider}/>
          <View style={styles.rowSpace}>
            <Text style={styles.secondaryText}>Validazione clinica</Text>
            <Text style={styles.statusAmber}>Non effettuata nell'app</Text>
          </View>
        </View>
        <Text style={styles.footerNote}>Il lucchetto impedisce modifiche accidentali; non certifica che i parametri siano clinicamente corretti.</Text>
      </View>

      {/* Unica finestra dedicata alla modifica di una fascia, compatibile Web/iOS/Android */}
      <Modal visible={dialogoFascia !== null} transparent animationType="fade"
        onRequestClose={() => { setDialogoFascia(null); setAiuto(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowSpace}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.modalTitle}>{dialogoNuova ? 'Aggiungi fascia oraria' : 'Modifica fascia oraria'}</Text>
                <Text style={styles.secondaryText}>Configurazione individuale · non terapeutica</Text>
              </View>
              <DiabetyModalCloseButton onPress={() => { setDialogoFascia(null); setAiuto(null); }}
                accessibilityLabel="Chiudi modifica fascia" iconSize={22} iconColor={SUB}/>
            </View>
            <View style={styles.divider}/>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {dialogoFascia && (
                <View style={{ gap: 13, paddingBottom: 8 }}>
                  <View style={styles.modalTimeNameRow}>
                    <View style={[styles.modalInputBlock, styles.modalTimeBlock]}>
                      <Text style={styles.modalFieldLabel}>Intervallo orario</Text>
                      <View style={styles.modalTimeInputs}>
                        <TextInput style={[styles.modalInput, styles.modalStartInput, dialogoFascia.id === 'fascia-0000' && { opacity: 0.7 }]}
                          value={dialogoFascia.inizio} onChangeText={valore => cambiaCampoFascia('inizio', valore)}
                          editable={dialogoFascia.id !== 'fascia-0000'} placeholder="HH:MM" placeholderTextColor={SUB}
                          keyboardType="numbers-and-punctuation" maxLength={5}
                          accessibilityLabel="Ora inizio fascia in formato HH:MM"/>
                        <Text style={styles.modalTimeDash}>–</Text>
                        <Text style={styles.modalEndTime}>{fineFasciaDialogo}</Text>
                      </View>
                    </View>
                    <View style={[styles.modalInputBlock, styles.modalNameBlock]}>
                      <Text style={styles.modalFieldLabel}>Nome</Text>
                      <TextInput style={[styles.modalInput, styles.modalNameInput]}
                        value={dialogoFascia.nome ?? ''} onChangeText={valore => cambiaCampoFascia('nome', valore)}
                        placeholder="Es. Notte" placeholderTextColor={SUB} maxLength={22}
                        accessibilityLabel="Nome personalizzato della fascia oraria" />
                    </View>
                  </View>
                  <Text style={styles.microNote}>Nome facoltativo. La fine viene calcolata dalla fascia successiva.</Text>
                  {([
                    ['rapportoCHO', 'Rapporto I:CHO'],
                    ['sensibilitaISF', 'Sensibilità ISF'],
                    ['targetGlicemico', 'Target glicemico'],
                    ['sogliaCorrezione', 'Soglia di correzione'],
                  ] as [Parametro, string][]).map(([campo, label]) => (
                    <View style={styles.modalInputBlock} key={campo}>
                      <View style={styles.rowSpace}>
                        <Text style={styles.modalFieldLabel}>{label}</Text>
                        {pulsanteAiuto(campo)}
                      </View>
                      <TextInput style={styles.modalInput} keyboardType="decimal-pad" maxLength={9}
                        value={dialogoFascia[campo]} onChangeText={valore => cambiaCampoFascia(campo, valore)}
                        placeholder="Da configurare" placeholderTextColor={SUB}
                        accessibilityLabel={label}/>
                      <Text style={styles.unit}>{informazioni[campo].unita}</Text>
                      {aiuto === campo && testoAiuto(campo)}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            {erroreFascia && <Text style={styles.errorText}>{erroreFascia}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModal} onPress={() => { setDialogoFascia(null); setAiuto(null); }} accessibilityRole="button">
                <Text style={styles.cancelModalText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModal} onPress={confermaFascia} accessibilityRole="button">
                <Text style={styles.confirmModalText}>Conferma fascia</Text>
              </TouchableOpacity>
            </View>
            {!dialogoNuova && dialogoFascia?.id !== 'fascia-0000' && (
              <TouchableOpacity style={styles.deleteButton} onPress={eliminaFascia} accessibilityRole="button">
                <Ionicons name="trash-outline" color={RED} size={16}/>
                <Text style={styles.deleteText}>Elimina questa fascia</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: 20, paddingBottom: 45, gap: 16 },
  headerContent: { flex: 1, gap: 4 },
  title: { fontFamily: 'Space Grotesk', color: '#FFFFFF', fontSize: 21, fontWeight: '700' },
  subtitle: { fontFamily: 'Plus Jakarta Sans', color: '#93A7B9', fontSize: 12 },
  mainCard: { backgroundColor: '#111B27', borderColor: '#29465B', borderWidth: 1, borderRadius: 19, padding: 14, gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardHeading: { fontFamily: 'Space Grotesk', fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
  cardSubheading: { fontFamily: 'Plus Jakarta Sans', color: SUB, fontSize: 11, lineHeight: 17 },
  subheading: { fontFamily: 'Plus Jakarta Sans', color: TEXT, fontSize: 13, fontWeight: '700' },
  secondaryText: { fontFamily: 'Plus Jakarta Sans', color: SUB, fontSize: 11, lineHeight: 17, flexShrink: 1 },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowSmall: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  helpButton: { borderWidth: 1, borderColor: '#37758D', backgroundColor: '#14323D', borderRadius: 12, width: 25, height: 25, alignItems: 'center', justifyContent: 'center' },
  helpMark: { color: CYAN, fontSize: 12, fontWeight: '800' },
  helpInline: { backgroundColor: '#102B37', borderWidth: 1, borderColor: '#275365', borderRadius: 10, padding: 10, gap: 5, marginTop: 3 },
  helpTitle: { fontSize: 12, fontWeight: '700', color: CYAN },
  helpText: { fontSize: 11, color: '#D4E4EC', lineHeight: 18 },
  fasciaAttivaBox: { backgroundColor: '#102934', borderWidth: 1, borderColor: '#286178', borderRadius: 13, padding: 12, gap: 7 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#A3C4D0', letterSpacing: 0.4 },
  oraLabel: { color: CYAN, fontSize: 12, fontWeight: '700' },
  fasciaAttivaTitolo: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputCard: { flex: 1, borderRadius: 12, backgroundColor: '#172938', borderColor: '#35556A', borderWidth: 1, padding: 10, gap: 7, minWidth: 0 },
  inputLabel: { fontSize: 12, color: TEXT, fontWeight: '700' },
  primaryInput: { backgroundColor: '#0B1924', borderColor: '#35566A', borderWidth: 1, borderRadius: 9, color: '#FFFFFF', fontSize: 23, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8, minHeight: 49 },
  unit: { fontSize: 10, color: SUB },
  microNote: { color: SUB, fontSize: 10, lineHeight: 16 },
  paramsUsed: { backgroundColor: '#0E202C', borderRadius: 12, borderColor: '#2C4658', borderWidth: 1, padding: 12, gap: 9 },
  threeColumns: { flexDirection: 'row', gap: 5 },
  paramPreview: { flex: 1, alignItems: 'center', gap: 5, minWidth: 0 },
  paramPreviewLabel: { fontSize: 10, color: SUB },
  paramPreviewValue: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
  paramSmallValue: { fontSize: 11, color: TEXT, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#29465B' },
  reviewButton: { backgroundColor: CYAN, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reviewButtonText: { fontWeight: '800', fontSize: 14, color: '#07161C' },
  reviewPanel: { backgroundColor: '#102934', borderColor: '#347287', borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  alertBox: { flexDirection: 'row', gap: 10, borderRadius: 12, backgroundColor: '#29231D', borderWidth: 1, borderColor: '#695037', padding: 12 },
  alertRed: { borderColor: '#7D454D', backgroundColor: '#291C22' },
  alertTitle: { fontSize: 12, fontWeight: '700' },
  alertText: { fontSize: 11, color: '#E1D8CC', lineHeight: 18 },
  resultBox: { backgroundColor: '#102631', borderColor: '#24556B', borderWidth: 1, borderRadius: 15, alignItems: 'center', padding: 19, gap: 8 },
  resultValue: { color: '#FFFFFF', fontSize: 35, fontWeight: '800' },
  resultUnit: { color: CYAN, fontSize: 18 },
  lockButton: { borderRadius: 9, borderColor: '#37758D', borderWidth: 1, backgroundColor: '#122E3A', paddingVertical: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockText: { color: CYAN, fontSize: 11, fontWeight: '800' },
  cancelEdit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 8, borderWidth: 1, borderRadius: 9, borderColor: '#465867' },
  cancelEditText: { color: '#C6D6DF', fontSize: 12, fontWeight: '700' },
  errorText: { color: RED, fontSize: 11, lineHeight: 16 },
  oldParamsNote: { flexDirection: 'row', gap: 8, backgroundColor: '#29231D', borderRadius: 9, padding: 10 },
  oldParamsText: { flex: 1, color: '#E1C9AD', fontSize: 11, lineHeight: 17 },
  fasciaMiniCard: { backgroundColor: '#0B1821', borderRadius: 11, borderColor: '#2B485B', borderWidth: 1, overflow: 'hidden' },
  fasceAccordion: { backgroundColor: '#11212C', borderWidth: 1, borderColor: '#294453', borderRadius: 13, overflow: 'hidden' },
  fasceAccordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 57 },
  fasceAccordionIcon: { backgroundColor: '#17343E', borderRadius: 9, padding: 8 },
  fasceAccordionBody: { borderTopWidth: 1, borderTopColor: '#2A4553', padding: 9, gap: 8 },
  fasciaCollapsedHeader: { minHeight: 48, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  fasciaCollapsedName: { color: '#95B4C1', fontSize: 11 },
  fasciaExpandedBody: { borderTopWidth: 1, borderTopColor: '#294451', padding: 9, gap: 8 },
  metricHelpTarget: { minHeight: 44, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 3 },
  fasciaEditButton: { backgroundColor: '#14323D', borderColor: '#37758D', borderWidth: 1, borderRadius: 9, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  fasciaEditText: { color: CYAN, fontSize: 12, fontWeight: '700' },
  fasciaName: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  fasciaHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fasciaTimeTap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3, paddingVertical: 4 },
  fasciaNameField: { width: 116, flexShrink: 1, backgroundColor: '#0C202B', borderRadius: 9, borderWidth: 1, borderColor: '#376078', paddingHorizontal: 7, paddingVertical: 4, gap: 3 },
  fasciaNameFieldLabel: { fontSize: 9, color: '#9AB8C8', fontWeight: '700' },
  fasciaNameInput: { color: '#FFFFFF', backgroundColor: '#0C202B', borderWidth: 1, borderColor: '#376078', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 16, minHeight: 42 },
  fasciaNameBadge: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', minHeight: 23, paddingTop: 3 },
  metricGrid: { flexDirection: 'row', gap: 4 },
  metricCell: { flex: 1, minWidth: 0, backgroundColor: '#142A36', borderRadius: 7, padding: 4, gap: 2, alignItems: 'center' },
  metricLabel: { fontSize: 10, color: SUB, fontWeight: '600' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  addButton: { borderRadius: 11, borderColor: CYAN, borderStyle: 'dashed', borderWidth: 1, padding: 13, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  addText: { color: CYAN, fontSize: 12, fontWeight: '700' },
  globalParamBox: { backgroundColor: '#0C202B', padding: 12, borderRadius: 11, borderWidth: 1, borderColor: '#2B485B', gap: 12 },
  maxInput: { borderWidth: 1, borderColor: '#3A6174', backgroundColor: '#162C37', color: '#FFFFFF', padding: 10, borderRadius: 8, fontSize: 16 },
  maxValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  statusAmber: { fontSize: 11, color: AMBER, textAlign: 'right', flexShrink: 1 },
  footerNote: { fontSize: 10, color: SUB, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', padding: 15 },
  modalCard: { width: '100%', maxWidth: 430, alignSelf: 'center', maxHeight: '94%', backgroundColor: '#111B27', borderRadius: 20, borderWidth: 1, borderColor: '#326075', padding: 15, gap: 13 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  modalScroll: { flexShrink: 1 },
  modalInputBlock: { backgroundColor: '#172938', borderColor: '#34566E', borderWidth: 1, borderRadius: 11, padding: 11, gap: 8 },
  modalTimeNameRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  modalTimeBlock: { flex: 1.35, minWidth: 0, padding: 9 },
  modalNameBlock: { flex: 0.9, minWidth: 0, padding: 9 },
  modalTimeInputs: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  modalStartInput: { flex: 1, minWidth: 0, paddingHorizontal: 5, textAlign: 'center', fontSize: 16 },
  modalTimeDash: { color: SUB, fontSize: 13 },
  modalEndTime: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalNameInput: { paddingHorizontal: 6, fontSize: 16 },
  modalFieldLabel: { color: TEXT, fontWeight: '700', fontSize: 12 },
  modalInput: { color: '#FFFFFF', borderColor: '#35576B', borderWidth: 1, borderRadius: 9, backgroundColor: '#0C1C28', paddingVertical: 8, paddingHorizontal: 11, fontSize: 16, minHeight: 42 },
  modalActions: { flexDirection: 'row', gap: 9 },
  cancelModal: { flex: 1, paddingVertical: 12, borderColor: '#4B6070', borderWidth: 1, borderRadius: 11, alignItems: 'center' },
  cancelModalText: { color: TEXT, fontSize: 12, fontWeight: '700' },
  confirmModal: { flex: 1.25, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: CYAN },
  confirmModalText: { color: '#06171D', fontSize: 12, fontWeight: '800' },
  deleteButton: { alignItems: 'center', paddingVertical: 6, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  deleteText: { color: RED, fontSize: 12, fontWeight: '700' },
});
