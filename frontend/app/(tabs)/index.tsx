import { DIABETY_COLORS } from '@/src/theme/diabety';
import { DiabetyHelpButton } from '@/src/components/diabety-help-button';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiabetyAlert } from '@/src/components/diabety-alert';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 PALETTE COLORI ELEVATA PER MASSIMO STACCO IN DARK MODE
const COLORS = DIABETY_COLORS;

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
  const mostraAvviso = useDiabetyAlert();
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
  const [cho, setCho] = useState('');
  const [momentoSelezionato, setMomentoSelezionato] = useState('Prima Colazione');
  const [note, setNote] = useState('');
  const [mostraNotifica, setMostraNotifica] = useState(false);
  const [mostraModalInfo, setMostraModalInfo] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (glicemia === '' && insulina === '' && cho === '' && note === '') {
        setOraInserita(ottieniOraCorrente());
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [glicemia, insulina, cho, note]);

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
      mostraAvviso("Inserisci un valore di glicemia valido in mg/dL.");
      return;
    }

    if (insulina !== '' && !/^\d{1,2}$/.test(insulina)) {
      mostraAvviso("Inserisci l'insulina come numero intero di UI oppure lascia il campo vuoto.");
      return;
    }

    if (cho !== '' && (!/^\d{1,4}$/.test(cho) || Number(cho) > 9999)) {
      mostraAvviso("Inserisci i CHO come numero intero di grammi oppure lascia il campo vuoto.");
      return;
    }

    const dataParsata = /^\d{4}-\d{2}-\d{2}$/.test(dataISO)
      ? new Date(`${dataISO}T00:00:00`)
      : null;
    const dataValida = dataParsata !== null
      && !Number.isNaN(dataParsata.getTime())
      && `${dataParsata.getFullYear()}-${String(dataParsata.getMonth() + 1).padStart(2, '0')}-${String(dataParsata.getDate()).padStart(2, '0')}` === dataISO;
    if (!dataValida || dataISO > ottieniDataOdiernaISO()) {
      mostraAvviso("Inserisci una data valida, non successiva a oggi.");
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(oraInserita)) {
      mostraAvviso("Inserisci un orario valido nel formato HH:MM.");
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
        cho: cho === '' ? null : Number(cho),
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
      setCho('');
      setNote('');
      setOraInserita(ottieniOraCorrente());
      setMostraNotifica(true);
      setTimeout(() => setMostraNotifica(false), 3000);
    } catch (error) {
      mostraAvviso("Impossibile salvare i dati localmente. I dati precedenti non sono stati eliminati.");
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
            <DiabetyHelpButton variant="inserisci" onPress={() => setMostraModalInfo(true)} accessibilityLabel="Informazioni sull'inserimento" />
          </View>
          <Text style={styles.subtitle}>Registra una nuova misurazione</Text>
        </View>
      </View>

      <View style={styles.containerRigaTemporale}>
        <View style={styles.dataCardSinistra}>
          <View style={styles.cardTitleRow}><Ionicons name="calendar-outline" size={16} color={COLORS.brandPrimary} /><Text style={styles.cardTitle}>Data del Test</Text></View>
          {Platform.OS === 'web' ? (
            <View style={styles.dateTimeFieldClip}><input type="date" value={dataISO} max={ottieniDataOdiernaISO()} onChange={(e) => setDataISO(e.target.value)}
              style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '600', color: '#FFFFFF', backgroundColor: '#080F18', border: '1px solid #344C63', borderRadius: '8px', padding: '0 4px', position: 'absolute', inset: 0, height: '100%', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none', colorScheme: 'dark' }} /></View>
          ) : (
            <TextInput style={styles.timeInputBackup} value={dataISO} onChangeText={setDataISO} placeholder="AAAA-MM-GG" placeholderTextColor={COLORS.muted} maxLength={10} accessibilityLabel="Data del test nel formato AAAA-MM-GG" />
          )}
        </View>
        <View style={styles.dataCardSinistra}>
          <View style={styles.cardTitleRow}><Ionicons name="time-outline" size={16} color={COLORS.brandPrimary} /><Text style={styles.cardTitle}>Orario del Test</Text></View>
          {Platform.OS === 'web' ? (
            <View style={styles.dateTimeFieldClip}><input type="time" value={oraInserita} onChange={(e) => setOraInserita(e.target.value)}
              style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '600', color: '#FFFFFF', backgroundColor: '#080F18', border: '1px solid #344C63', borderRadius: '8px', padding: '0 4px', position: 'absolute', inset: 0, height: '100%', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0, outline: 'none', colorScheme: 'dark' }} /></View>
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
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="nutrition-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.cardTitle}>CHO</Text><Text style={styles.cardUnit}>(g)</Text>
          </View>
          <TextInput style={styles.insulinaInput} placeholder="00" placeholderTextColor="#93A7B9" keyboardType="numeric" value={cho} onChangeText={setCho} maxLength={4} accessibilityLabel="Carboidrati in grammi" />
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

      {/* Guida premium: solo la finestra informativa del pulsante ? */}
      <Modal visible={mostraModalInfo} animationType="fade" transparent onRequestClose={() => setMostraModalInfo(false)}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentHelp}>
            <View style={styles.helpHeader}>
              <View style={styles.helpHeaderIcon}><Ionicons name="book-outline" size={23} color="#00E5FF" /></View>
              <View style={styles.helpHeaderText}>
                <Text style={styles.modalTitleHelp}>Guida all'uso</Text>
                <Text style={styles.helpSubtitle}>DIABETY · Inserimento dati</Text>
              </View>
              <TouchableOpacity onPress={() => setMostraModalInfo(false)} style={styles.helpCloseIcon} accessibilityRole="button" accessibilityLabel="Chiudi guida">
                <Ionicons name="close" size={21} color="#CFD8E3" />
              </TouchableOpacity>
            </View>
            <View style={styles.helpDivider} />
            <Text style={styles.helpIntro}>Tutto quello che serve per registrare correttamente una misurazione.</Text>
            <ScrollView style={styles.modalScrollInfo} contentContainerStyle={styles.helpScrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <View style={styles.infoBlockPremium}>
                <View style={styles.helpBlockHeading}><Ionicons name="calendar-outline" size={19} color="#00D8F7" /><Text style={styles.infoBlockTitle}>Data e ora del test</Text></View>
                <Text style={styles.infoBlockText}>La data e l'ora vengono impostate automaticamente. Puoi modificarle per registrare un controllo precedente.</Text>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.helpBlockHeading}><Ionicons name="water-outline" size={19} color="#FF6C86" /><Text style={styles.infoBlockTitle}>Inserimento glicemia</Text></View>
                <Text style={styles.infoBlockText}>Inserisci il valore rilevato in mg/dL. Il numero cambia colore in base all'intervallo glicemico.</Text>
                <View style={styles.helpLegend}>
                  <View style={[styles.helpLegendPill, { backgroundColor: '#35251C' }]}><Text style={[styles.helpLegendText, { color: '#FFB05D' }]}>Sotto 70</Text></View>
                  <View style={[styles.helpLegendPill, { backgroundColor: '#193528' }]}><Text style={[styles.helpLegendText, { color: '#59DF99' }]}>70–180</Text></View>
                  <View style={[styles.helpLegendPill, { backgroundColor: '#3A2227' }]}><Text style={[styles.helpLegendText, { color: '#FF8992' }]}>Oltre 180</Text></View>
                </View>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.helpBlockHeading}><Ionicons name="medkit-outline" size={19} color="#B39AFF" /><Text style={styles.infoBlockTitle}>Inserimento insulina</Text></View>
                <Text style={styles.infoBlockText}>Indica le unità (UI) somministrate. Se non hai assunto insulina, lascia il campo vuoto.</Text>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.helpBlockHeading}><Ionicons name="nutrition-outline" size={19} color="#00E5FF" /><Text style={styles.infoBlockTitle}>Inserimento carboidrati (CHO)</Text></View>
                <Text style={styles.infoBlockText}>Indica i grammi di carboidrati del pasto. Il campo è facoltativo e viene salvato con la misurazione.</Text>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.helpBlockHeading}><Ionicons name="time-outline" size={19} color="#FFCA75" /><Text style={styles.infoBlockTitle}>Momenti della giornata</Text></View>
                <Text style={styles.infoBlockText}>Seleziona il momento del controllo per organizzare correttamente lo storico e i report.</Text>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.helpBlockHeading}><Ionicons name="document-text-outline" size={19} color="#69C5FF" /><Text style={styles.infoBlockTitle}>Note alimentari e sintomi</Text></View>
                <Text style={styles.infoBlockText}>Annota alimenti, sintomi o altre informazioni. L'orario viene aggiunto automaticamente alle note salvate.</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.btnChiudiHelp} onPress={() => setMostraModalInfo(false)} accessibilityRole="button" accessibilityLabel="Ho capito, chiudi guida">
              <Ionicons name="checkmark" size={19} color="#FFFFFF" />
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
  containerRigaTemporale: { flexDirection: 'row', gap: 8, width: '100%' },
  dateTimeFieldClip: { width: '100%', minWidth: 0, height: 54, marginTop: 8, position: 'relative', overflow: 'hidden', borderRadius: 9 },
  dataCardSinistra: { flex: 1, minWidth: 0, backgroundColor: '#111B27', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 10, gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' },
  cardTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  cardUnit: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: '#93A7B9' },
  optionalLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 9, color: '#8493A5' },
  timeInputBackup: { height: 54, fontSize: 14, color: '#FFFFFF', backgroundColor: '#080F18', borderRadius: 8, padding: 9, borderWidth: 1, borderColor: '#344C63', width: '100%' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 6, width: '100%' },
  metaLarghezza: { flex: 1, minWidth: 0 },
  cardInputHighlight: { backgroundColor: '#111B27', borderRadius: 16, padding: 7, borderWidth: 1, borderColor: '#26536A', gap: 8 },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', width: '100%', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, height: 54 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: '#FFFFFF', width: '100%', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, height: 54 },
  sectionCard: { backgroundColor: '#111B27', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 12, gap: 12 },
  sectionTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  chip: { width: '31%', flexGrow: 1, minHeight: 43, paddingHorizontal: 3, paddingVertical: 5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A121D', borderWidth: 1, borderColor: '#33475A', borderRadius: 8 },
  chipSelezionata: { backgroundColor: '#103B4A', borderColor: COLORS.brandPrimary },
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, textAlign: 'center', color: '#D9E2EC', fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.brandPrimary, fontWeight: '700' },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 16, color: '#FFFFFF', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, padding: 10, minHeight: 50, width: '100%' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#001820' },
  notificaTendina: { backgroundColor: '#092414', borderColor: COLORS.success, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', width: '100%' },
  notificaTesto: { fontFamily: 'Plus Jakarta Sans', color: COLORS.success, fontWeight: '600', fontSize: 14 },
  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.86)', justifyContent: 'center', alignItems: 'center', padding: 14 },
  modalContentHelp: { backgroundColor: '#111722', borderRadius: 24, padding: 16, width: '100%', maxWidth: 390, maxHeight: '88%', borderWidth: 1, borderColor: '#314B65', overflow: 'hidden' },
  helpHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helpHeaderIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#12334A', alignItems: 'center', justifyContent: 'center' },
  helpHeaderText: { flex: 1 },
  modalTitleHelp: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  helpSubtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: '#90A7B9', marginTop: 3 },
  helpCloseIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222D3B', alignItems: 'center', justifyContent: 'center' },
  helpDivider: { height: 1, backgroundColor: '#304052', marginTop: 14, marginBottom: 12 },
  helpIntro: { fontFamily: 'Plus Jakarta Sans', fontSize: 12.5, color: '#A9BBCB', lineHeight: 19, marginBottom: 12 },
  modalScrollInfo: { width: '100%', flexShrink: 1 },
  helpScrollContent: { paddingBottom: 3 },
  infoBlockPremium: { marginBottom: 10, backgroundColor: '#151F2B', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#30485E', width: '100%' },
  helpBlockHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12.5, color: '#B6C6D5', lineHeight: 19 },
  helpLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  helpLegendPill: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  helpLegendText: { fontFamily: 'Plus Jakarta Sans', fontSize: 10.5, fontWeight: '700' },
  btnChiudiHelp: { marginTop: 12, backgroundColor: '#123B68', borderWidth: 1, borderColor: '#00A8FF', paddingVertical: 13, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnChiudiHelpText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF' }
});
