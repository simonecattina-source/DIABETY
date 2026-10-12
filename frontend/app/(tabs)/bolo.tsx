import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan neon
  brandSecondary: "#7D52FF",    // Viola tech per la sezione parametri
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           // Verde smeraldo Oled
  warning: "#FF9100",           // Arancione vivo
  error: "#FF5252",             // Rosso corallo neon
  borderGlass: "rgba(255, 255, 255, 0.08)"
};

export default function CalcolatoreBoloScreen() {
  // Input Utente per il calcolo estemporaneo (Inizializzato vuoto con controllo placeholder)
  const [glicemiaAttuale, setGlicemiaAttuale] = useState('');
  const [carboidratiPasto, setCarboidratiPasto] = useState('');

  // Parametri Personali Terapeutici Persistenti (Pre-caricati)
  const [rapportoCHO, setRapportoCHO] = useState('0'); 
  const [sensibilitaISF, setSensibilitaISF] = useState('0'); 
  const [targetGlicemico, setTargetGlicemico] = useState('0'); 

  // Stati per il Risultato, Pop-up e Sicurezza Blocco
  const [risultatoBolo, setRisultatoBolo] = useState<number | null>(null);
  const [quotaPasto, setQuotaPasto] = useState<number>(0);
  const [quotaCorrezione, setQuotaCorrezione] = useState<number>(0);
  const [mostraHelpParametri, setMostraHelpParametri] = useState(false);
  const [modificaAttiva, setModificaAttiva] = useState(false);
  // Validazione rigorosa: accetta solo numeri positivi completi, non testo parziale.
  const valorePositivoValido = (valore: string) => {
    const testo = valore.trim();
    if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(testo)) return false;
    const numero = Number(testo.replace(',', '.'));
    return Number.isFinite(numero) && numero > 0;
  };

  // I parametri partono da zero se non esiste una configurazione valida salvata.
  useEffect(() => {
    const caricaParametriTerapeutici = async () => {
      try {
        const parametriSalvati = await AsyncStorage.getItem('glicotrack_parametri_bolo');
        if (!parametriSalvati) return;

        const parsed = JSON.parse(parametriSalvati);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.rapportoCHO === 'string' && valorePositivoValido(parsed.rapportoCHO)) setRapportoCHO(parsed.rapportoCHO);
          if (typeof parsed.sensibilitaISF === 'string' && valorePositivoValido(parsed.sensibilitaISF)) setSensibilitaISF(parsed.sensibilitaISF);
          if (typeof parsed.targetGlicemico === 'string' && valorePositivoValido(parsed.targetGlicemico)) setTargetGlicemico(parsed.targetGlicemico);
        }
      } catch (error) {
        console.log("Errore nel recupero dei parametri locali.");
      }
    };
    caricaParametriTerapeutici();
  }, []);

  // Salva i parametri solo se tutti e tre sono stati compilati con valori maggiori di zero.
  const gestisciCambioStatoSicurezza = async () => {
    if (modificaAttiva) {
      if (
        !valorePositivoValido(rapportoCHO) ||
        !valorePositivoValido(sensibilitaISF) ||
        !valorePositivoValido(targetGlicemico)
      ) {
        alert("Per salvare i parametri, inserisci valori numerici maggiori di zero in tutti e tre i campi. Usa i valori indicati dal tuo diabetologo.");
        return;
      }

      try {
        const pacchettoParametri = {
          rapportoCHO: rapportoCHO.trim(),
          sensibilitaISF: sensibilitaISF.trim(),
          targetGlicemico: targetGlicemico.trim()
        };
        await AsyncStorage.setItem('glicotrack_parametri_bolo', JSON.stringify(pacchettoParametri));
        setModificaAttiva(false);
      } catch (error) {
        alert("Impossibile salvare i parametri sul dispositivo.");
      }
    } else {
      setModificaAttiva(true);
    }
  };

  const calcolaBoloInsulinico = () => {
    if (
      !valorePositivoValido(rapportoCHO) ||
      !valorePositivoValido(sensibilitaISF) ||
      !valorePositivoValido(targetGlicemico)
    ) {
      alert("Prima di usare il calcolatore, inserisci e salva tutti e tre i parametri personali con valori maggiori di zero, secondo le indicazioni del tuo diabetologo.");
      return;
    }

    const campiNumericiValidi = (valore: string) => valore.trim() === '' || /^\d+$/.test(valore.trim());
    if (!campiNumericiValidi(carboidratiPasto) || !campiNumericiValidi(glicemiaAttuale)) {
      alert("Inserisci solo numeri interi nei campi glicemia e carboidrati.");
      return;
    }

    const cho = carboidratiPasto.trim() === '' ? 0 : Number(carboidratiPasto);
    const glic = glicemiaAttuale.trim() === '' ? 0 : Number(glicemiaAttuale);
    const r_cho = Number(rapportoCHO.replace(',', '.'));
    const isf = Number(sensibilitaISF.replace(',', '.'));
    const target = Number(targetGlicemico.replace(',', '.'));

    if (!Number.isFinite(cho) || !Number.isFinite(glic) || cho < 0 || glic < 0) {
      alert("Controlla i valori inseriti: devono essere numeri validi e non negativi.");
      return;
    }

    if (cho === 0 && glic === 0) {
      alert("Inserisci almeno il valore della glicemia o i carboidrati del pasto.");
      return;
    }

    // Calcolo separato delle due componenti:
    // - se sono inseriti solo i carboidrati, calcola la quota pasto;
    // - se è inserita solo la glicemia, calcola la correzione rispetto al target;
    // - se sono inseriti entrambi, somma le due componenti.
    // La correzione è positiva solo quando la glicemia supera il target personale.
    const insulinaPasto = cho > 0 ? cho / r_cho : 0;
    const insulinaCorrezione = glic > target ? (glic - target) / isf : 0;
    const totaleTeorico = insulinaPasto + insulinaCorrezione;

    setQuotaPasto(Math.round(insulinaPasto * 10) / 10);
    setQuotaCorrezione(Math.round(insulinaCorrezione * 10) / 10);

    // Mantiene l'arrotondamento già previsto dal calcolatore.
    const totaleArrotondato = Math.round(totaleTeorico * 2) / 2;
    setRisultatoBolo(totaleArrotondato);
  };

  const resettaCampi = () => {
    setGlicemiaAttuale('');
    setCarboidratiPasto('');
    setRisultatoBolo(null);
    setQuotaPasto(0);
    setQuotaCorrezione(0);
  };

  // 🎨 ALGORITMO CROMATICO OLED: Cambia colore in tempo reale in base alla soglia glicemica
  const ottieniColoreGlicemiaDinamico = () => {
    const valore = parseInt(glicemiaAttuale);
    if (!valore || isNaN(valore)) return COLORS.onSurface; 
    if (valore < 70) return COLORS.warning;                
    if (valore > 180) return COLORS.error;                 
    return COLORS.success;                                 
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Intestazione */}
      <View style={styles.headerForm}>
        <Text style={styles.title}>Calcolo Bolo</Text>
        <Text style={styles.subtitle}>Calcolatore insulinico basato sui tuoi parametri terapeutici</Text>
      </View>

      {/* RISULTATO CENTRALIZZATO PREMIUM IN CASO DI CALCOLO ATTIVO */}
      {risultatoBolo !== null && (
        <View style={styles.cardRisultatoHighlight}>
          <Text style={styles.labelRisultato}>Stima matematica del bolo</Text>
          <Text style={styles.valoreRisultato}>{risultatoBolo} <Text style={styles.unitaRisultato}>UI</Text></Text>
          
          <View style={styles.containerDettaglioQuote}>
            <View style={styles.boxQuotaDettaglio}>
              <Text style={styles.labelQuotaDettaglio}>Quota Pasto</Text>
              <Text style={styles.valoreQuotaDettaglio}>{quotaPasto} UI</Text>
            </View>
            <View style={styles.dividerDettaglioVerticale} />
            <View style={styles.boxQuotaDettaglio}>
              <Text style={styles.labelQuotaDettaglio}>Correzione per target</Text>
              <Text style={styles.valoreQuotaDettaglio}>{quotaCorrezione} UI</Text>
            </View>
          </View>
          <Text style={styles.disclaimerBolo}>* Stima teorica: non considera insulina attiva, attività fisica, malattie o altri fattori clinici. Non usarla come prescrizione; verifica sempre il piano concordato con il diabetologo.</Text>
        </View>
      )}

      {/* INPUT CONTROLLI DINAMICI */}
      <Text style={styles.sectionLabel}>Dati Attuali</Text>
      <View style={styles.rigaDatiPrincipali}>
        {/* INPUT GLICEMIA CON COLORE DINAMICO OLED NEON */}
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Glicemia (mg/dL)</Text>
          <TextInput 
            style={[styles.glicemiaInput, { color: ottieniColoreGlicemiaDinamico() }]} 
            placeholder="00" 
            placeholderTextColor="#636366" 
            keyboardType="numeric" 
            value={glicemiaAttuale} 
            onChangeText={setGlicemiaAttuale} 
            maxLength={3} 
          />
        </View>

        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Carboidrati (g CHO)</Text>
          <TextInput style={styles.glicemiaInput} placeholder="0" placeholderTextColor="#636366" keyboardType="numeric" value={carboidratiPasto} onChangeText={setCarboidratiPasto} maxLength={3} />
        </View>
      </View>

      {/* BOTTONI AZIONE */}
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
        {risultatoBolo !== null && (
          <TouchableOpacity style={styles.resetButton} onPress={resettaCampi}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.saveButton} onPress={calcolaBoloInsulinico}>
          <Text style={styles.saveButtonText}>Calcola Bolo</Text>
        </TouchableOpacity>
      </View>
      {/* BOX IMPOSTAZIONI RATIO TERAPEUTICI CON RIGIDO CONTROLLO DI BLOCCO/SBLOCCO DI SICUREZZA */}
      <View style={{ marginTop: 14, marginBottom: 10, width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
          
          {/* Gruppo di Sinistra: Titolo + Icona "i" */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.sectionLabelBolo}>I tuoi Rapporti Personali</Text>
            <TouchableOpacity onPress={() => setMostraHelpParametri(true)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} style={{ justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.brandPrimary} />
            </TouchableOpacity>
          </View>

          {/* 🔐 Pulsante di Destra: Attiva/Disattiva Modifica Parametri Permanenti */}
          <TouchableOpacity 
            onPress={gestisciCambioStatoSicurezza} 
            style={[styles.pulsanteDestroAzioneBolo, modificaAttiva ? styles.pulsanteStatoAttivoBg : styles.pulsanteStatoDisattivoBg]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name={modificaAttiva ? "lock-open-outline" : "lock-closed-outline"} size={14} color={modificaAttiva ? COLORS.success : COLORS.brandPrimary} />
            <Text style={[styles.testoPulsanteDestroBolo, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]}>
              {modificaAttiva ? "Disattiva" : "Attiva"}
            </Text>
          </TouchableOpacity>

        </View>
        <Text style={styles.subLabelSpiegazioneBolo}>
          Inserisci tutti e tre i valori indicati dal tuo diabetologo. I campi a zero non sono validi e bloccano il calcolo.
        </Text>
      </View>

      {/* I TRE CAMPI INPUT PROTETTI COINVOLTI DAL BLOCCO DI SICUREZZA */}
      <View style={[styles.cardParametriFissi, !modificaAttiva && { opacity: 0.65 }]}>
        <View style={styles.rigaRapportoParametro}>
          <View style={styles.sinistraInfoParametro}>
            <Ionicons name="pizza-outline" size={18} color={COLORS.brandSecondary} />
            <View style={{marginLeft: 8}}>
              <Text style={styles.titleParametro}>Rapporto I:CHO</Text>
              <Text style={styles.descParametro}>Quanti grammi di carboidrati copre 1 UI</Text>
            </View>
          </View>
          <TextInput style={[styles.inputParametroFisso, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]} keyboardType="numeric" value={rapportoCHO} onChangeText={setRapportoCHO} maxLength={2} editable={modificaAttiva} />
        </View>

        <View style={styles.dividerParametri} />

        <View style={styles.rigaRapportoParametro}>
          <View style={styles.sinistraInfoParametro}>
            <Ionicons name="pulse-outline" size={18} color={COLORS.brandSecondary} />
            <View style={{marginLeft: 8}}>
              <Text style={styles.titleParametro}>Sensibilità (ISF)</Text>
              <Text style={styles.descParametro}>Di quanto mg/dL scende con 1 UI</Text>
            </View>
          </View>
          <TextInput style={[styles.inputParametroFisso, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]} keyboardType="numeric" value={sensibilitaISF} onChangeText={setSensibilitaISF} maxLength={3} editable={modificaAttiva} />
        </View>

        <View style={styles.dividerParametri} />

        <View style={styles.rigaRapportoParametro}>
          <View style={styles.sinistraInfoParametro}>
            <Ionicons name="locate-outline" size={18} color={COLORS.brandSecondary} />
            <View style={{marginLeft: 8}}>
              <Text style={styles.titleParametro}>Target Glicemico</Text>
              <Text style={styles.descParametro}>Il tuo valore ideale di riferimento</Text>
            </View>
          </View>
          <TextInput style={[styles.inputParametroFisso, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]} keyboardType="numeric" value={targetGlicemico} onChangeText={setTargetGlicemico} maxLength={3} editable={modificaAttiva} />
        </View>
      </View>

      {/* 🎪 POP-UP INFORMATIVO SPIEGAZIONE PARAMETRI TERAPEUTICI */}
      <Modal visible={mostraHelpParametri} animationType="fade" transparent={true} onRequestClose={() => setMostraHelpParametri(false)}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentHelp}>
            <Text style={styles.modalTitleHelp}>Parametri Personali</Text>
            <ScrollView style={styles.modalScrollInfo} showsVerticalScrollIndicator={false}>
              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>🍕 Rapporto I:CHO (Insulina/Carboidrati)</Text>
                <Text style={styles.infoBlockText}>Indica quanti grammi di zuccheri/carboidrati vengono coperti da una sola unità di insulina. Ad esempio, un rapporto di 10 significa che 1 unità di insulina compensa 10 grammi di carboidrati che mangi.</Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>⚡ Sensibilità ISF (Fattore di Correzione)</Text>
                <Text style={styles.infoBlockText}>Indica di quanti punti (mg/dL) scende la tua glicemia nel sangue grazie a una singola unità di insulina. Ad esempio, un ISF di 40 significa che 1 unità farà calare la tua glicemia di 40 punti.</Text>
              </View>

              <View style={styles.infoBlockPremium}>
                <Text style={styles.infoBlockTitle}>🎯 Target Glicemico</Text>
                <Text style={styles.infoBlockText}>È il valore obiettivo personale concordato con il tuo diabetologo. Il calcolatore lo usa nella formula teorica di correzione; non inserire un valore generico se non corrisponde al tuo piano terapeutico.</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.btnChiudiHelp} onPress={() => setMostraHelpParametri(false)}>
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
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  headerForm: { marginBottom: 16, width: '100%' },
  title: { fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: COLORS.muted, marginTop: 4 },
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 14, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLabelBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.2 },
  subLabelSpiegazioneBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 18, textAlign: 'left' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  
  cardInputHighlight: { backgroundColor: "#15151F", borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  labelLeftHighlight: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: "#A4A4AA", marginBottom: 4, textAlign: 'left' },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 34, fontWeight: '700', textAlign: 'left', width: '100%', paddingVertical: 2 },
  
  saveButton: { flex: 1, backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#0A0A0C' },
  resetButton: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.borderGlass, width: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  cardParametriFissi: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%', paddingHorizontal: 14 },
  rigaRapportoParametro: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, width: '100%', justifyContent: 'space-between' },
  sinistraInfoParametro: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titleParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  descParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted, marginTop: 1 },
  inputParametroFisso: { backgroundColor: '#1A1A24', borderColor: COLORS.borderGlass, borderRadius: 10, width: 55, height: 36, textAlign: 'center', fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '700', borderWidth: 1 },
  dividerParametri: { height: 1, backgroundColor: COLORS.borderGlass, width: '100%' },

  pulsanteDestroAzioneBolo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 9 },
  pulsanteStatoDisattivoBg: { backgroundColor: 'rgba(0, 229, 255, 0.04)', borderColor: 'rgba(0, 229, 255, 0.20)' },
  pulsanteStatoAttivoBg: { backgroundColor: 'rgba(0, 230, 118, 0.05)', borderColor: 'rgba(0, 230, 118, 0.25)' },
  testoPulsanteDestroBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 11.5, fontWeight: '700', letterSpacing: -0.1 },

  cardRisultatoHighlight: { backgroundColor: 'rgba(0, 229, 255, 0.04)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.brandPrimary, padding: 18, width: '100%', marginBottom: 16, alignItems: 'center' },
  labelRisultato: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: COLORS.brandPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
  valoreRisultato: { fontFamily: 'Space Grotesk', fontSize: 46, fontWeight: '900', color: COLORS.onSurface, marginTop: 4 },
  unitaRisultato: { fontSize: 22, color: COLORS.brandPrimary, fontWeight: '700' },
  containerDettaglioQuote: { flexDirection: 'row', width: '100%', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0, 229, 255, 0.15)' },
  boxQuotaDettaglio: { flex: 1, alignItems: 'center' },
  labelQuotaDettaglio: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  valoreQuotaDettaglio: { fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginTop: 2 },
  dividerDettaglioVerticale: { width: 1, backgroundColor: 'rgba(0, 229, 255, 0.15)', height: '100%' },
  disclaimerBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: COLORS.muted, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },

  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContentHelp: { backgroundColor: '#111116', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  modalTitleHelp: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 24, alignSelf: 'flex-start', letterSpacing: -0.3 },
  modalScrollInfo: { marginBottom: 16, width: '100%', maxHeight: 320 },
  infoBlockPremium: { marginBottom: 16, backgroundColor: '#020204', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', width: '100%' },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 6, textAlign: 'left' },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, color: '#7E7E86', lineHeight: 22, textAlign: 'left' },
  btnChiudiHelp: { marginTop: 10, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnChiudiHelpText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF' }
});
