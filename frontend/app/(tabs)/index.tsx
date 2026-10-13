import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 PALETTE COLORI ELEVATA PER MASSIMO STACCO IN DARK MODE
const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  // Nero profondo tech per i contenitori
  brandPrimary: "#00E5FF",      // Azzurro Cyan elettrico neon coordinato
  onSurface: "#FFFFFF",         // Bianco purissimo ultra-nitido
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  warning: "#FF9100",           // Arancione vivo
  error: "#FF5252",             // Rosso corallo neon
  borderGlass: "rgba(255, 255, 255, 0.08)",
  borderGlassBright: "rgba(255, 255, 255, 0.15)", // Bordo ad alto contrasto per i box principali
  bgUtility: "#1A1A24",         
  borderUtility: "#3A3A4A"      
};

const ETICHETTE_MOMENTI: Record<string, string> = {
  "Prima Colazione": "Prima di colazione", "Dopo Colazione": "Dopo colazione",
  "Spuntino": "Spuntino", "Prima Pranzo": "Prima di pranzo",
  "Dopo Pranzo": "Dopo pranzo", "Merenda": "Merenda",
  "Prima Cena": "Prima di cena", "Dopo Cena": "Dopo cena", "Notte": "Notte"
};

const MOMENTI = [
  "Prima Colazione", "Dopo Colazione", "Spuntino", 
  "Prima Pranzo", "Dopo Pranzo", "Merenda", 
  "Prima Cena", "Dopo Cena", "Notte"
];
export default function InserimentoScreen() {
  const ottieniDataOdiernaISO = () => {
    const oggi = new Date();
    const g = String(oggi.getDate()).padStart(2, '0');
    const m = String(oggi.getMonth() + 1).padStart(2, '0');
    const a = oggi.getFullYear();
    return `${a}-${m}-${g}`;
  };

  const ottieniOraCorrente = () => {
    const oggi = new Date();
    const ore = String(oggi.getHours()).padStart(2, '0');
    const minuti = String(oggi.getMinutes()).padStart(2, '0');
    return `${ore}:${minuti}`;
  };

  const [dataISO, setDataISO] = useState(ottieniDataOdiernaISO());
  const [oraInserita, setOraInserita] = useState(ottieniOraCorrente());
  const [glicemia, setGlicemia] = useState('');
  const [insulina, setInsulina] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');
  const [mostraNotifica, setMostraNotifica] = useState(false);
  const [mostraModalInfo, setMostraModalInfo] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (glicemia === '' && insulina === '' && note === '') {
        setOraInserita(ottieniOraCorrente());
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [glicemia, insulina, note]);

  const ottieniDataFormattataStorico = (stringaISO: string) => {
    if (!stringaISO) return "";
    const parti = stringaISO.split('-');
    if (parti.length !== 3 || parti.some((parte) => !parte)) return "";
    const [anno, mese, giorno] = parti;
    return `${giorno}/${mese}/${anno.slice(-2)}`;
  };

  const ottieniTimestampDalTesto = (stringaData: string) => {
    if (!stringaData || !stringaData.includes('/')) return 0;
    const [giorno, mese, anno] = stringaData.split('/');
    const giornoNum = Number(giorno);
    const meseNum = Number(mese);
    const annoNum = Number(anno);
    if (![giornoNum, meseNum, annoNum].every(Number.isFinite)) return 0;
    const annoCompleto = annoNum < 50 ? 2000 + annoNum : 1900 + annoNum;
    const data = new Date(annoCompleto, meseNum - 1, giornoNum);
    if (data.getFullYear() !== annoCompleto || data.getMonth() !== meseNum - 1 || data.getDate() !== giornoNum) return 0;
    return data.getTime();
  };

  // Conserva le misurazioni degli ultimi 91 giorni di calendario rispetto a oggi.
  // I record con data non riconoscibile vengono conservati per evitare perdite accidentali.
  const filtraUltimi91Giorni = (dati: any[]) => {
    const soglia = new Date();
    soglia.setHours(0, 0, 0, 0);
    soglia.setDate(soglia.getDate() - 91);
    const timestampSoglia = soglia.getTime();

    return dati.filter((item: any) => {
      const timestamp = ottieniTimestampDalTesto(item?.dataTesto ?? '');
      return timestamp === 0 || timestamp >= timestampSoglia;
    });
  };

  // Esegue la pulizia anche quando si apre la schermata, senza attendere un nuovo salvataggio.
  useEffect(() => {
    const pulisciStoricoScaduto = async () => {
      try {
        const storico = await AsyncStorage.getItem('glicotrack_data');
        if (!storico) return;

        const dati = JSON.parse(storico);
        if (!Array.isArray(dati)) return;

        const datiFiltrati = filtraUltimi91Giorni(dati);
        if (datiFiltrati.length !== dati.length) {
          await AsyncStorage.setItem('glicotrack_data', JSON.stringify(datiFiltrati));
        }
      } catch {
        // Se lo storico non è leggibile, non sovrascrivere né cancellare i dati esistenti.
      }
    };

    pulisciStoricoScaduto();
  }, []);

  const ottieniColoreGlicemia = () => {
    if (!/^\d+$/.test(glicemia)) return COLORS.onSurface;
    const valore = Number(glicemia);
    if (!Number.isFinite(valore) || valore <= 0) return COLORS.onSurface;
    if (valore < 70) return COLORS.warning;
    if (valore > 180) return COLORS.error;
    return COLORS.success;
  };
  const salvaMisurazione = async () => {
    if (!/^\d{1,3}$/.test(glicemia) || Number(glicemia) <= 0) {
      alert("Inserisci un valore di glicemia valido in mg/dL.");
      return;
    }

    if (insulina !== '' && !/^\d{1,2}$/.test(insulina)) {
      alert("Inserisci l'insulina come numero intero di UI oppure lascia il campo vuoto.");
      return;
    }

    const dataParsata = /^\d{4}-\d{2}-\d{2}$/.test(dataISO)
      ? new Date(`${dataISO}T00:00:00`)
      : null;
    const dataValida = dataParsata !== null
      && !Number.isNaN(dataParsata.getTime())
      && `${dataParsata.getFullYear()}-${String(dataParsata.getMonth() + 1).padStart(2, '0')}-${String(dataParsata.getDate()).padStart(2, '0')}` === dataISO;
    if (!dataValida || dataISO > ottieniDataOdiernaISO()) {
      alert("Inserisci una data valida, non successiva a oggi.");
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(oraInserita)) {
      alert("Inserisci un orario valido nel formato HH:MM.");
      return;
    }

    if (salvataggioInCorso) return;
    setSalvataggioInCorso(true);

    try {
      const noteConOrarioFuso = note.trim()
        ? `[${oraInserita}] ${note.trim()}`
        : `[${oraInserita}]`;

      const nuovaMisurazione = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        glicemia: Number(glicemia),
        insulina: insulina ? `${insulina} UI` : '-',
        tipo: momentoSelezionato,
        note: noteConOrarioFuso,
        ora: oraInserita,
        dataTesto: ottieniDataFormattataStorico(dataISO)
      };

      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      const datiLetti = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      if (!Array.isArray(datiLetti)) {
        throw new Error('Il formato dello storico salvato non è valido.');
      }

      // La pulizia è riferita alla data odierna, non alla data dell'ultima misurazione.
      // Le misurazioni di 91 giorni fa restano; vengono rimosse quelle più vecchie.
      const elencoDati = filtraUltimi91Giorni([nuovaMisurazione, ...datiLetti]);

      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      setGlicemia('');
      setInsulina('');
      setNote('');
      setOraInserita(ottieniOraCorrente());
      setMostraNotifica(true);
      setTimeout(() => setMostraNotifica(false), 3000);
    } catch (error) {
      alert("Impossibile salvare i dati localmente. I dati precedenti non sono stati eliminati.");
    } finally {
      setSalvataggioInCorso(false);
    }
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerCard}>
        <View style={styles.headerAccent} />
        <View style={styles.headerContent}>
          <View style={styles.headerForm}>
            <Text style={styles.title}>Inserisci Nuovi Dati</Text>
            <TouchableOpacity style={styles.infoButtonMinimal} onPress={() => setMostraModalInfo(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Informazioni sull'inserimento">
              <View style={styles.helpCircle}><Text style={styles.helpQuestion}>?</Text></View>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Registra una nuova misurazione</Text>
        </View>
      </View>

      <View style={styles.containerRigaTemporale}>
        <View style={styles.dataCardSinistra}>
          <View style={styles.cardTitleRow}><Ionicons name="calendar-outline" size={16} color={COLORS.brandPrimary} /><Text style={styles.cardTitle}>Data del Test</Text></View>
          {Platform.OS === 'web' ? (
            <input type="date" value={dataISO} max={ottieniDataOdiernaISO()} onChange={(e) => setDataISO(e.target.value)}
              style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '600', color: '#FFFFFF', backgroundColor: '#080F18', border: '1px solid #344C63', borderRadius: '8px', padding: '9px 4px', marginTop: '6px', width: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none', colorScheme: 'dark' }} />
          ) : (
            <TextInput style={styles.timeInputBackup} value={dataISO} onChangeText={setDataISO} placeholder="AAAA-MM-GG" placeholderTextColor={COLORS.muted} maxLength={10} accessibilityLabel="Data del test nel formato AAAA-MM-GG" />
          )}
        </View>
        <View style={styles.dataCardSinistra}>
          <View style={styles.cardTitleRow}><Ionicons name="time-outline" size={16} color={COLORS.brandPrimary} /><Text style={styles.cardTitle}>Orario del Test</Text></View>
          {Platform.OS === 'web' ? (
            <input type="time" value={oraInserita} onChange={(e) => setOraInserita(e.target.value)}
              style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '600', color: '#FFFFFF', backgroundColor: '#080F18', border: '1px solid #344C63', borderRadius: '8px', padding: '9px 4px', marginTop: '6px', width: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none', colorScheme: 'dark' }} />
          ) : (
            <TextInput style={styles.timeInputBackup} value={oraInserita} onChangeText={setOraInserita} maxLength={5} />
          )}
        </View>
      </View>

      <View style={styles.rigaDatiPrincipali}>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="water-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.cardTitle}>Glicemia</Text><Text style={styles.cardUnit}>(mg/dL)</Text>
          </View>
          <TextInput style={[styles.glicemiaInput, { color: ottieniColoreGlicemia() }]} placeholder="00" placeholderTextColor="#93A7B9" keyboardType="numeric" value={glicemia} onChangeText={setGlicemia} maxLength={3} />
        </View>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="medkit-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.cardTitle}>Insulina</Text><Text style={styles.cardUnit}>(UI)</Text>
          </View>
          <TextInput style={styles.insulinaInput} placeholder="00" placeholderTextColor="#93A7B9" keyboardType="numeric" value={insulina} onChangeText={setInsulina} maxLength={2} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.cardTitleRow}><Ionicons name="partly-sunny-outline" size={19} color={COLORS.brandPrimary} /><Text style={styles.sectionTitle}>Momento della Giornata</Text></View>
        <View style={styles.chipsContainer}>
          {MOMENTI.map((m) => {
            const selezionato = momentoSelezionato === m;
            return (
              <TouchableOpacity key={m} style={[styles.chip, selezionato && styles.chipSelezionata]} onPress={() => setMomentoSelezionato(m)} accessibilityRole="button" accessibilityState={{ selected: selezionato }}>
                <Text style={[styles.chipText, selezionato && styles.chipTextSelezionato]}>{ETICHETTE_MOMENTI[m]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="document-text-outline" size={17} color={COLORS.brandPrimary} />
          <Text style={styles.cardTitle}>Note Alimentari / Sintomi</Text><Text style={styles.optionalLabel}>(facoltative)</Text>
        </View>
        <TextInput style={styles.noteInput} multiline textAlignVertical="top" placeholder="Es. Riso integrale, Stanchezza..." placeholderTextColor="#8493A5" value={note} onChangeText={setNote} />
      </View>

      {mostraNotifica && (
        <View style={styles.notificaTendina}>
          <Text style={styles.notificaTesto}>✓ Misurazione salvata nel registro</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, salvataggioInCorso && { opacity: 0.6 }]}
        onPress={salvaMisurazione}
        disabled={salvataggioInCorso}
        accessibilityRole="button"
        accessibilityState={{ disabled: salvataggioInCorso }}
      >
        <Text style={styles.saveButtonText}>
          {salvataggioInCorso ? 'Salvataggio...' : 'Salva misurazione'}
        </Text>
      </TouchableOpacity>

      {/* 🎪 POP-UP INFORMATIVO DELLA HOME - CONFORMATO AL 100% ALLA SIZE DELLO STORICO */}
      <Modal visible={mostraModalInfo} animationType="fade" transparent={true} onRequestClose={() => setMostraModalInfo(false)}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentHelp}>
            <Text style={styles.modalTitleHelp}>Guida all'Uso</Text>
            
            <ScrollView style={styles.modalScrollInfo} showsVerticalScrollIndicator={false}>
              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>📅 Data e Ora del Test</Text>
                <Text style={styles.infoBlockText}>L'applicazione imposta automaticamente il giorno corrente e l'orario attuale. Se hai dimenticato di registrare un test precedente, puoi modificarli liberamente.</Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>🩸 Inserimento Glicemia</Text>
                <Text style={styles.infoBlockText}>Digita il valore espresso in mg/dL rilevato dal tuo glucometro. Il testo cambierà colore in tempo reale seguendo le linee guida mediche standard.</Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>💉 Inserimento Insulina</Text>
                <Text style={styles.infoBlockText}>Indica il numero di Unità (UI) di insulina rapida o lenta somministrata. Se per questo controllo non hai assunto alcuna dose, lascia il campo vuoto.</Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>⏰ Momenti della Giornata</Text>
                <Text style={styles.infoBlockText}>Seleziona il bottone corrispondente al blocco temporale. Questo parametro ripartisce i dati nella giusta colonna del report clinico.</Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>📝 Note Alimentari e Sintomi</Text>
                <Text style={styles.infoBlockText}>Usa questo spazio per annotare cibo o sintomi. L'orario del test verrà fuso in automatico tra parentesi quadre all'inizio del testo.</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnChiudiHelp} onPress={() => setMostraModalInfo(false)}>
              <Text style={styles.btnChiudiHelpText}>Ho capito</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A0E' },
  content: { padding: 12, paddingTop: 14, paddingBottom: 40, gap: 12 },
  headerCard: { backgroundColor: '#101B28', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAccent: { width: 3, height: 43, backgroundColor: COLORS.brandPrimary, borderRadius: 4 },
  headerContent: { flex: 1, gap: 4 },
  headerForm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 },
  title: { fontFamily: 'Space Grotesk', fontSize: 21, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: '#93A7B9' },
  infoButtonMinimal: { justifyContent: 'center', alignItems: 'center', width: 25, height: 25 },
  helpCircle: { width: 25, height: 25, borderWidth: 1.5, borderColor: COLORS.brandPrimary, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  helpQuestion: { fontSize: 18, fontWeight: '600', color: COLORS.brandPrimary, lineHeight: 23 },
  containerRigaTemporale: { flexDirection: 'row', gap: 8, width: '100%' },
  dataCardSinistra: { flex: 1, minWidth: 0, backgroundColor: '#111B27', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' },
  cardTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  cardUnit: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: '#93A7B9' },
  optionalLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 9, color: '#8493A5' },
  timeInputBackup: { marginTop: 6, fontSize: 14, color: '#FFFFFF', backgroundColor: '#080F18', borderRadius: 8, padding: 9, borderWidth: 1, borderColor: '#344C63', width: '100%' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 8, width: '100%' },
  metaLarghezza: { flex: 1, minWidth: 0 },
  cardInputHighlight: { backgroundColor: '#111B27', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#26536A', gap: 8 },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: '700', width: '100%', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: '700', color: '#FFFFFF', width: '100%', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  sectionCard: { backgroundColor: '#111B27', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 12, gap: 12 },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  chip: { width: '31%', flexGrow: 1, minHeight: 43, paddingHorizontal: 3, paddingVertical: 5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A121D', borderWidth: 1, borderColor: '#33475A', borderRadius: 8 },
  chipSelezionata: { backgroundColor: '#103B4A', borderColor: COLORS.brandPrimary },
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, textAlign: 'center', color: '#D9E2EC', fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.brandPrimary, fontWeight: '700' },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: '#FFFFFF', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, padding: 10, minHeight: 78, width: '100%' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#001820' },
  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },
  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentHelp: { backgroundColor: '#111116', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  modalTitleHelp: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 24, alignSelf: 'flex-start', letterSpacing: -0.3 },
  modalScrollInfo: { marginBottom: 16, width: '100%', maxHeight: 300 },
  infoBlockPremium: { marginBottom: 16, backgroundColor: '#020204', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', width: '100%' },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 6, textAlign: 'left' },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14.5, color: '#7E7E86', lineHeight: 22, textAlign: 'left' },
  btnChiudiHelp: { marginTop: 10, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnChiudiHelpText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF' }
});
