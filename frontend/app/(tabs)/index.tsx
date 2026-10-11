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
  useEffect(() => {
    const timer = setInterval(() => {
      if (glicemia === '' && insulina === '' && note === '') {
        setOraInserita(ottieniOraCorrente());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [glicemia, insulina, note]);

  const ottieniDataFormattataStorico = (stringaISO: string) => {
    if (!stringaISO) return "";
    const [anno, mese, giorno] = stringaISO.split('-');
    const annoCorto = anno.slice(-2);
    return `${giorno}/${mese}/${annoCorto}`;
  };

  const ottieniTimestampDalTesto = (stringaData: string) => {
    if (!stringaData || !stringaData.includes('/')) return 0;
    const [giorno, mese, anno] = stringaData.split('/');
    const annoCompleto = parseInt(anno) < 50 ? 2000 + parseInt(anno) : 1900 + parseInt(anno);
    return new Date(annoCompleto, parseInt(mese) - 1, parseInt(giorno)).getTime();
  };

  const ottieniColoreGlicemia = () => {
    const valore = parseInt(glicemia);
    if (!valore || isNaN(valore)) return COLORS.onSurface;
    if (valore < 70) return COLORS.warning;
    if (valore > 180) return COLORS.error;
    return COLORS.success;
  };
  const salvaMisurazione = async () => {
    const valoreGlicemia = parseInt(glicemia);
    
    if (!valoreGlicemia || isNaN(valoreGlicemia)) {
      alert("Inserisci un valore di glicemia valido prima di salvare.");
      return;
    }

    try {
      const noteConOrarioFuso = note.trim() 
        ? `[${oraInserita}] ${note.trim()}`
        : `[${oraInserita}]`;

      const nuovaMisurazione = {
        id: Math.random().toString(),
        glicemia: valoreGlicemia,
        insulina: insulina ? `${insulina} UI` : '-',
        tipo: momentoSelezionato,
        note: noteConOrarioFuso, 
        ora: oraInserita,        
        dataTesto: ottieniDataFormattataStorico(dataISO)
      };

      const storicoEsistente = await AsyncStorage.getItem('glicotrack_data');
      let elencoDati = storicoEsistente ? JSON.parse(storicoEsistente) : [];
      
      elencoDati.unshift(nuovaMisurazione);

      if (elencoDati.length > 0) {
        let timestampPiuRecente = 0;
        elencoDati.forEach((item: any) => {
          const ts = ottieniTimestampDalTesto(item.dataTesto);
          if (ts > timestampPiuRecente) timestampPiuRecente = ts;
        });

        const limite91GiorniMs = 91 * 24 * 60 * 60 * 1000;
        const timestampSogliaMinima = timestampPiuRecente - limite91GiorniMs;

        elencoDati = elencoDati.filter((item: any) => {
          const tsItem = ottieniTimestampDalTesto(item.dataTesto);
          return tsItem >= timestampSogliaMinima;
        });
      }

      await AsyncStorage.setItem('glicotrack_data', JSON.stringify(elencoDati));

      setGlicemia('');
      setInsulina('');
      setNote('');
      setOraInserita(ottieniOraCorrente());
      setMostraNotifica(true);
      setTimeout(() => { setMostraNotifica(false); }, 3000);

    } catch (error) {
      alert("Impossibile salvare i dati localmente.");
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
            <Text style={styles.dataInput}>{ottieniDataFormattataStorico(dataISO)}</Text>
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

      <TouchableOpacity style={styles.saveButton} onPress={salvaMisurazione}>
        <Text style={styles.saveButtonText}>Salva Misurazione</Text>
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
