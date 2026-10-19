import { DIABETY_COLORS } from '@/src/theme/diabety';
import { DiabetyHelpButton } from '@/src/components/diabety-help-button';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiabetyAlert } from '@/src/components/diabety-alert';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = DIABETY_COLORS;

export default function CalcolatoreBoloScreen() {
  const mostraAvviso = useDiabetyAlert();
  // Input Utente per il calcolo estemporaneo (Inizializzato vuoto con controllo placeholder)
  const [glicemiaAttuale, setGlicemiaAttuale] = useState('');
  const [carboidratiPasto, setCarboidratiPasto] = useState('');

  // Parametri Personali Terapeutici Persistenti (Pre-caricati)
  const [rapportoCHO, setRapportoCHO] = useState(''); 
  const [sensibilitaISF, setSensibilitaISF] = useState(''); 
  const [targetGlicemico, setTargetGlicemico] = useState(''); 

  // Stati per il Risultato, Pop-up e Sicurezza Blocco
  const [risultatoBolo, setRisultatoBolo] = useState<number | null>(null);
  const [quotaPasto, setQuotaPasto] = useState<number>(0);
  const [quotaCorrezione, setQuotaCorrezione] = useState<number>(0);
  const [mostraHelpParametri, setMostraHelpParametri] = useState(false);
  const [modificaAttiva, setModificaAttiva] = useState(false);
  const [parametriCaricati, setParametriCaricati] = useState(false);
  const [parametriConfermati, setParametriConfermati] = useState(false);

  const numeroPositivo = (testo: string): number | null => {
    const pulito = testo.trim();
    if (!/^(?:\d+)(?:[.,]\d+)?$/.test(pulito)) return null;
    const valore = Number(pulito.replace(',', '.'));
    return Number.isFinite(valore) && valore > 0 ? valore : null;
  };
  const invalidaRisultato = () => {
    setRisultatoBolo(null);
    setQuotaPasto(0);
    setQuotaCorrezione(0);
  };

  // Carica solo parametri realmente salvati e validi: nessun valore terapeutico di ripiego.
  useEffect(() => {
    let montato = true;
    const carica = async () => {
      try {
        const salvati = await AsyncStorage.getItem('glicotrack_parametri_bolo');
        if (!montato || !salvati) return;
        const parsed = JSON.parse(salvati);
        const r = String(parsed?.rapportoCHO ?? '');
        const i = String(parsed?.sensibilitaISF ?? '');
        const t = String(parsed?.targetGlicemico ?? '');
        if (numeroPositivo(r) !== null && numeroPositivo(i) !== null && numeroPositivo(t) !== null) {
          setRapportoCHO(r);
          setSensibilitaISF(i);
          setTargetGlicemico(t);
          setParametriConfermati(true);
        }
      } catch (error) {
        console.log('Impossibile recuperare i parametri del bolo.');
      } finally {
        if (montato) setParametriCaricati(true);
      }
    };
    carica();
    return () => { montato = false; };
  }, []);

  const gestisciCambioStatoSicurezza = async () => {
    if (!parametriCaricati) return;
    if (!modificaAttiva) {
      invalidaRisultato();
      setModificaAttiva(true);
      return;
    }
    if (numeroPositivo(rapportoCHO) === null || numeroPositivo(sensibilitaISF) === null || numeroPositivo(targetGlicemico) === null) {
      mostraAvviso('Compila tutti e tre i parametri personali con numeri maggiori di zero, concordati con il medico.');
      return;
    }
    try {
      await AsyncStorage.setItem('glicotrack_parametri_bolo', JSON.stringify({ rapportoCHO: rapportoCHO.trim(), sensibilitaISF: sensibilitaISF.trim(), targetGlicemico: targetGlicemico.trim() }));
      setParametriConfermati(true);
      setModificaAttiva(false);
      invalidaRisultato();
    } catch (error) {
      mostraAvviso('Impossibile salvare i parametri sul dispositivo.');
    }
  };

  const calcolaBoloInsulinico = () => {
    invalidaRisultato();
    if (!parametriCaricati || !parametriConfermati || modificaAttiva) {
      mostraAvviso('Prima configura e salva i tuoi tre parametri terapeutici personali.');
      return;
    }
    const r_cho = numeroPositivo(rapportoCHO);
    const isf = numeroPositivo(sensibilitaISF);
    const target = numeroPositivo(targetGlicemico);
    if (r_cho === null || isf === null || target === null) {
      mostraAvviso('Parametri personali non validi. Verifica e salva nuovamente la configurazione.');
      return;
    }
    const leggiInput = (testo: string): number | null => {
      if (!/^\d+$/.test(testo.trim())) return null;
      const valore = Number(testo.trim());
      return Number.isSafeInteger(valore) && valore >= 0 ? valore : null;
    };
    const cho = carboidratiPasto.trim() === '' ? 0 : leggiInput(carboidratiPasto);
    const glic = glicemiaAttuale.trim() === '' ? 0 : leggiInput(glicemiaAttuale);
    if (cho === null || glic === null || (glicemiaAttuale.trim() !== '' && glic === 0)) {
      mostraAvviso('Inserisci valori validi per glicemia e carboidrati.');
      return;
    }
    if (cho === 0 && glic === 0) {
      mostraAvviso('Inserisci almeno il valore della glicemia o i carboidrati del pasto.');
      return;
    }
    if (glic > 0 && glic < 70) {
      mostraAvviso('Glicemia inferiore a 70 mg/dL: il calcolo è sospeso. Segui il piano di gestione dell’ipoglicemia concordato con il medico.');
      return;
    }
    const insulinaPasto = cho > 0 ? cho / r_cho : 0;
    const insulinaCorrezione = glic > target ? (glic - target) / isf : 0;
    const totaleTeorico = insulinaPasto + insulinaCorrezione;
    if (!Number.isFinite(totaleTeorico)) {
      mostraAvviso('Impossibile calcolare il bolo con i valori inseriti.');
      return;
    }
    setQuotaPasto(Math.round(insulinaPasto * 10) / 10);
    setQuotaCorrezione(Math.round(insulinaCorrezione * 10) / 10);
    setRisultatoBolo(Math.round(totaleTeorico * 2) / 2);
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
      <View style={styles.headerCard}>
        <View style={styles.headerAccent} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>Calcolo Bolo</Text>
          <Text style={styles.subtitle}>Calcolatore insulinico basato sui tuoi parametri terapeutici</Text>
        </View>
      </View>

      {/* RISULTATO CENTRALIZZATO PREMIUM IN CASO DI CALCOLO ATTIVO */}
      {risultatoBolo !== null && (
        <View style={styles.cardRisultatoHighlight}>
          <Text style={styles.labelRisultato}>Bolo Suggerito</Text>
          <Text style={styles.valoreRisultato}>{risultatoBolo} <Text style={styles.unitaRisultato}>UI</Text></Text>
          
          <View style={styles.containerDettaglioQuote}>
            <View style={styles.boxQuotaDettaglio}>
              <Text style={styles.labelQuotaDettaglio}>Quota Pasto</Text>
              <Text style={styles.valoreQuotaDettaglio}>{quotaPasto} UI</Text>
            </View>
            <View style={styles.dividerDettaglioVerticale} />
            <View style={styles.boxQuotaDettaglio}>
              <Text style={styles.labelQuotaDettaglio}>Quota Correzione</Text>
              <Text style={styles.valoreQuotaDettaglio}>{quotaCorrezione} UI</Text>
            </View>
          </View>
          <Text style={styles.disclaimerBolo}>* Il calcolo è arrotondato alla mezza unità. Valuta sempre i fattori esterni prima di somministrare.</Text>
        </View>
      )}

      {/* INPUT CONTROLLI DINAMICI */}
      <Text style={styles.sectionLabel}>Dati Attuali</Text>
      <View style={styles.rigaDatiPrincipali}>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="water-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.cardTitle}>Glicemia</Text>
            <Text style={styles.cardUnit}>(mg/dL)</Text>
          </View>
          <TextInput
            style={[styles.glicemiaInput, { color: ottieniColoreGlicemiaDinamico() }]}
            placeholder="00"
            placeholderTextColor="#93A7B9"
            keyboardType="numeric"
            value={glicemiaAttuale}
            onChangeText={(v) => { setGlicemiaAttuale(v); invalidaRisultato(); }}
            maxLength={3}
          />
        </View>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="nutrition-outline" size={16} color={COLORS.brandPrimary} />
            <Text style={styles.cardTitle}>Carboidrati</Text>
            <Text style={styles.cardUnit}>(g CHO)</Text>
          </View>
          <TextInput
            style={styles.glicemiaInput}
            placeholder="0"
            placeholderTextColor="#93A7B9"
            keyboardType="numeric"
            value={carboidratiPasto}
            onChangeText={(v) => { setCarboidratiPasto(v); invalidaRisultato(); }}
            maxLength={3}
          />
        </View>
      </View>

      {/* BOTTONI AZIONE */}
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
        {risultatoBolo !== null && (
          <TouchableOpacity style={styles.resetButton} onPress={resettaCampi}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.saveButton, (!parametriCaricati || modificaAttiva || !parametriConfermati) && { opacity: 0.45 }]} onPress={calcolaBoloInsulinico} disabled={!parametriCaricati || modificaAttiva || !parametriConfermati}>
          <Text style={styles.saveButtonText}>Calcola Bolo</Text>
        </TouchableOpacity>
      </View>
      {/* BOX IMPOSTAZIONI RATIO TERAPEUTICI CON RIGIDO CONTROLLO DI BLOCCO/SBLOCCO DI SICUREZZA */}
      <View style={{ marginTop: 14, marginBottom: 10, width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
          
          {/* Gruppo di Sinistra: Titolo + Icona "i" */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.sectionLabelBolo}>I tuoi Rapporti Personali</Text>
            <DiabetyHelpButton variant="bolo" onPress={() => setMostraHelpParametri(true)} accessibilityLabel="Informazioni sui rapporti personali" />
          </View>

          {/* 🔐 Pulsante di Destra: Attiva/Disattiva Modifica Parametri Permanenti */}
          <TouchableOpacity 
            onPress={gestisciCambioStatoSicurezza} disabled={!parametriCaricati} 
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
          Pianifica e Studia i tuoi rapporti personali insieme al tuo medico e inseriscili nel riquadro specifico.
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
          <TextInput style={[styles.inputParametroFisso, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]} keyboardType="numeric" value={rapportoCHO} onChangeText={(v) => { setRapportoCHO(v); setParametriConfermati(false); invalidaRisultato(); }} maxLength={2} editable={modificaAttiva} />
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
          <TextInput style={[styles.inputParametroFisso, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]} keyboardType="numeric" value={sensibilitaISF} onChangeText={(v) => { setSensibilitaISF(v); setParametriConfermati(false); invalidaRisultato(); }} maxLength={3} editable={modificaAttiva} />
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
          <TextInput style={[styles.inputParametroFisso, { color: modificaAttiva ? COLORS.success : COLORS.brandPrimary }]} keyboardType="numeric" value={targetGlicemico} onChangeText={(v) => { setTargetGlicemico(v); setParametriConfermati(false); invalidaRisultato(); }} maxLength={3} editable={modificaAttiva} />
        </View>
      </View>

      {/* Guida premium ai parametri terapeutici */}
      <Modal visible={mostraHelpParametri} animationType="fade" transparent={true} onRequestClose={() => setMostraHelpParametri(false)}>
        <View style={styles.modalOverlayCentrato}>
          <View style={styles.modalContentHelp}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}><Ionicons name="book-outline" size={21} color={COLORS.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleHelp}>Parametri Personali</Text>
                <Text style={styles.modalSubtitle}>Guida al calcolo del bolo</Text>
              </View>
              <TouchableOpacity onPress={() => setMostraHelpParametri(false)} accessibilityLabel="Chiudi guida" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color="#93A7B9" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />
            <ScrollView style={styles.modalScrollInfo} showsVerticalScrollIndicator={false}>
              <View style={styles.infoBlockPremium}>
                <View style={styles.infoBlockHeader}>
                  <Ionicons name="pizza-outline" size={20} color={COLORS.brandPrimary} />
                  <Text style={styles.infoBlockTitle}>Rapporto I:CHO</Text>
                </View>
                <Text style={styles.infoBlockText}>Indica quanti grammi di carboidrati vengono coperti da una sola unità di insulina.</Text>
                <View style={styles.exampleBox}><Text style={styles.exampleText}>Esempio: un rapporto di 10 significa che 1 UI copre 10 g di carboidrati.</Text></View>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.infoBlockHeader}>
                  <Ionicons name="pulse-outline" size={20} color={COLORS.brandPrimary} />
                  <Text style={styles.infoBlockTitle}>Sensibilità ISF</Text>
                </View>
                <Text style={styles.infoBlockText}>Indica di quanti mg/dL si stima che la glicemia scenda grazie a una singola unità di insulina.</Text>
                <View style={styles.exampleBox}><Text style={styles.exampleText}>Esempio: un ISF di 40 corrisponde a una riduzione stimata di 40 mg/dL per 1 UI.</Text></View>
              </View>
              <View style={styles.infoBlockPremium}>
                <View style={styles.infoBlockHeader}>
                  <Ionicons name="locate-outline" size={20} color={COLORS.brandPrimary} />
                  <Text style={styles.infoBlockTitle}>Target Glicemico</Text>
                </View>
                <Text style={styles.infoBlockText}>È il valore glicemico di riferimento utilizzato dal calcolatore per stimare la correzione.</Text>
                <View style={styles.exampleBox}><Text style={styles.exampleText}>Il target deve essere quello concordato con il diabetologo.</Text></View>
              </View>
              <View style={styles.warningRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.warning} />
                <Text style={styles.warningText}>I risultati sono stime matematiche. Il calcolatore non considera automaticamente insulina attiva, attività fisica e altri fattori clinici. Segui sempre il piano terapeutico concordato.</Text>
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
  headerCard: { backgroundColor: '#101B28', borderWidth: 1, borderColor: '#26536A', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerAccent: { width: 3, height: 43, backgroundColor: COLORS.brandPrimary, borderRadius: 4 },
  headerContent: { flex: 1, gap: 4 },
  title: { fontFamily: 'Space Grotesk', fontSize: 21, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  subtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: '#93A7B9' },
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 14, marginBottom: 10, uppercase: true, letterSpacing: 0.5 },
  sectionLabelBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.2 },
  subLabelSpiegazioneBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 18, textAlign: 'left' },
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  
  cardInputHighlight: { backgroundColor: '#111B27', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#26536A', gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' },
  cardTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  cardUnit: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: '#93A7B9' },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: '700', color: '#FFFFFF', width: '100%', backgroundColor: '#080F18', borderWidth: 1, borderColor: '#344C63', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },

  saveButton: { flex: 1, backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#0A0A0C' },
  resetButton: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.borderGlass, width: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  cardParametriFissi: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%', paddingHorizontal: 14 },
  rigaRapportoParametro: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, width: '100%', justifyContent: 'space-between' },
  sinistraInfoParametro: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titleParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  descParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted, marginTop: 1 },
  inputParametroFisso: { backgroundColor: '#1A1A24', borderHorizontalWidth: 1, borderColor: COLORS.borderGlass, borderRadius: 10, width: 55, height: 36, textAlign: 'center', fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '700', borderWidth: 1 },
  dividerParametri: { height: 1, backgroundColor: COLORS.borderGlass, width: '100%' },

  pulsanteDestroAzioneBolo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 9 },
  pulsanteStatoDisattivoBg: { backgroundColor: 'rgba(0, 229, 255, 0.04)', borderColor: 'rgba(0, 229, 255, 0.20)' },
  pulsanteStatoAttivoBg: { backgroundColor: 'rgba(0, 230, 118, 0.05)', borderColor: 'rgba(0, 230, 118, 0.25)' },
  testoPulsanteDestroBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 11.5, fontWeight: '700', letterSpacing: -0.1 },

  cardRisultatoHighlight: { backgroundColor: 'rgba(0, 229, 255, 0.04)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.brandPrimary, padding: 18, width: '100%', marginBottom: 16, alignItems: 'center' },
  labelRisultato: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: '700', color: COLORS.brandPrimary, uppercase: true, letterSpacing: 0.5 },
  valoreRisultato: { fontFamily: 'Space Grotesk', fontSize: 46, fontWeight: '900', color: COLORS.onSurface, marginTop: 4 },
  unitaRisultato: { fontSize: 22, color: COLORS.brandPrimary, fontWeight: '700' },
  containerDettaglioQuote: { flexDirection: 'row', width: '100%', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0, 229, 255, 0.15)' },
  boxQuotaDettaglio: { flex: 1, alignItems: 'center' },
  labelQuotaDettaglio: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: '600', color: COLORS.muted },
  valoreQuotaDettaglio: { fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '700', color: COLORS.onSurface, marginTop: 2 },
  dividerDettaglioVerticale: { width: 1, backgroundColor: 'rgba(0, 229, 255, 0.15)', height: '100%' },
  disclaimerBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: COLORS.muted, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },

  modalOverlayCentrato: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContentHelp: { backgroundColor: '#111B27', borderRadius: 24, padding: 16, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: '#26536A', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalHeaderIcon: { backgroundColor: '#0B2B39', padding: 9, borderRadius: 10 },
  modalTitleHelp: { fontFamily: 'Space Grotesk', fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  modalSubtitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: '#93A7B9', marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: '#26536A', marginVertical: 14 },
  modalScrollInfo: { width: '100%', flexShrink: 1 },
  infoBlockPremium: { marginBottom: 12, backgroundColor: '#080F18', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#344C63', width: '100%' },
  infoBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoBlockTitle: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#FFFFFF', flexShrink: 1 },
  infoBlockText: { fontFamily: 'Plus Jakarta Sans', fontSize: 13, color: '#C3CFDB', lineHeight: 20 },
  exampleBox: { backgroundColor: '#111B27', borderRadius: 9, padding: 9, marginTop: 10 },
  exampleText: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: '#93A7B9', lineHeight: 17 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 7, marginBottom: 8 },
  warningText: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: '#C3CFDB', lineHeight: 17, flex: 1 },
  btnChiudiHelp: { marginTop: 12, backgroundColor: COLORS.brandPrimary, paddingVertical: 13, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnChiudiHelpText: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: '#0A0A0C' }
});
