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
      
      {/* 🏷️ INTESTAZIONE CON TITOLO E TASTO INFO ANCORATO DI FIANCO A DESTRA */}
      <View style={styles.headerForm}>
        <Text style={styles.title}>Inserisci Nuovi Dati</Text>
        <TouchableOpacity style={styles.infoButtonMinimal} onPress={() => setMostraModalInfo(true)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.brandPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* 📅⏰ RIGHE TEMPORALI */}
      <View style={styles.containerRigaTemporale}>
        <View style={styles.dataCardSinistra}>
          <Text style={styles.labelLeft}>Data del Test</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={dataISO}
              max={ottieniDataOdiernaISO()} 
              onChange={(e) => setDataISO(e.target.value)}
              style={{
                fontFamily: 'sans-serif', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', 
                backgroundColor: '#13131A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                padding: '6px 10px', marginTop: '4px', width: 'auto', display: 'inline-block', outline: 'none', cursor: 'pointer'
              }}
            />
          ) : (
            <TextInput
              style={[styles.timeInputBackup, { width: 124 }]}
              value={dataISO}
              onChangeText={setDataISO}
              placeholder="AAAA-MM-GG"
              placeholderTextColor={COLORS.muted}
              maxLength={10}
              accessibilityLabel="Data del test nel formato AAAA-MM-GG"
            />
          )}
        </View>

        <View style={styles.dataCardSinistra}>
          <Text style={styles.labelLeft}>Orario del Test</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={oraInserita}
              onChange={(e) => setOraInserita(e.target.value)}
              style={{
                fontFamily: 'sans-serif', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', 
                backgroundColor: '#13131A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                padding: '6px 10px', marginTop: '4px', width: 'auto', display: 'inline-block', outline: 'none', cursor: 'pointer'
              }}
            />
          ) : (
            <TextInput style={styles.timeInputBackup} value={oraInserita} onChangeText={setOraInserita} maxLength={5} />
          )}
        </View>
      </View>

      <View style={styles.rigaDatiPrincipali}>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Glicemia (mg/dL)</Text>
          <TextInput
            style={[styles.glicemiaInput, { color: ottieniColoreGlicemia() }]}
            placeholder="00"
            placeholderTextColor="#636366" 
            keyboardType="numeric"
            value={glicemia}
            onChangeText={setGlicemia}
            maxLength={3}
          />
        </View>

        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Insulina (Unità UI)</Text>
          <TextInput
            style={styles.insulinaInput}
            placeholder="0"
            placeholderTextColor="#636366" 
            keyboardType="numeric"
            value={insulina}
            onChangeText={setInsulina}
            maxLength={2}
          />
        </View>
      </View>
      <Text style={styles.sectionLabel}>Momento della Giornata</Text>
      <View style={styles.chipsContainer}>
        {MOMENTI.map((m) => {
          const selezionato = momentoSelezionato === m;
          return (
            <TouchableOpacity key={m} style={[styles.chip, selezionato && styles.chipSelezionata]} onPress={() => setMomentoSelezionato(m)}>
              <Text style={[styles.chipText, selezionato && styles.chipTextSelezionato]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.cardInput, { padding: 12, marginBottom: 16 }]}>
        <Text style={styles.labelLeft}>Note Alimentari / Sintomi</Text>
        <TextInput style={styles.noteInput} placeholder="Es: Riso integrale, stanchezza..." placeholderTextColor="#48484A" value={note} onChangeText={setNote} />
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
          {salvataggioInCorso ? 'Salvataggio...' : 'Salva Misurazione'}
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
  container: { flex: 1, backgroundColor: COLORS.background }, 
  content: { padding: 16, paddingTop: 15, paddingBottom: 40 },
  headerForm: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    gap: 6,
    marginBottom: 12, 
    width: '100%' 
  },
  title: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '700', color: COLORS.onSurface },
  infoButtonMinimal: { justifyContent: 'center', alignItems: 'center', padding: 2, marginTop: 2 },
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 14, marginBottom: 10 },
  cardInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 14, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass },
  labelLeft: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '600', color: COLORS.muted, marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  containerRigaTemporale: { flexDirection: 'row', gap: 16, marginBottom: 16, alignSelf: 'flex-start' },
  dataCardSinistra: { width: 'auto', backgroundColor: 'transparent', padding: 0, alignItems: 'flex-start' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  dataInput: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '600', color: COLORS.onSurface, textAlign: 'left', paddingLeft: 2 },
  timeInputBackup: { fontFamily: 'Space Grotesk', fontSize: 16, color: COLORS.onSurface, backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, padding: 6, width: 70, textAlign: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  cardInputHighlight: { backgroundColor: "#15151F", borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlassBright, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  labelLeftHighlight: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: "#A4A4AA", marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start', paddingLeft: 2 },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: '700', textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  insulinaInput: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2, paddingLeft: 2 },
  noteInput: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: COLORS.onSurface, paddingVertical: 2, textAlign: 'left', paddingLeft: 2, width: '100%' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip: { backgroundColor: COLORS.surfaceSecondary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  chipSelezionata: { backgroundColor: "#0C232B", borderWidth: 1, borderColor: COLORS.brandPrimary }, 
  chipText: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, fontWeight: '500' },
  chipTextSelezionato: { color: COLORS.onSurface, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', width: '100%' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#0A0A0C' },
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
