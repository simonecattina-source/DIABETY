import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  // Input Utente per il calcolo estemporaneo
  const [glicemiaAttuale, setGlicemiaAttuale] = useState('');
  const [carboidratiPasto, setCarboidratiPasto] = useState('');

  // Parametri Personali Terapeutici (Impostati con valori di default standard modificabili)
  const [rapportoCHO, setRapportoCHO] = useState('10'); 
  const [sensibilitaISF, setSensibilitaISF] = useState('40'); 
  const [targetGlicemico, setTargetGlicemico] = useState('100'); 

  // Stati per il Risultato e Pop-up Informativo
  const [risultatoBolo, setRisultatoBolo] = useState<number | null>(null);
  const [quotaPasto, setQuotaPasto] = useState<number>(0);
  const [quotaCorrezione, setQuotaCorrezione] = useState<number>(0);
  const [mostraHelpParametri, setMostraHelpParametri] = useState(false);

  const calcolaBoloInsulinico = () => {
    const cho = parseFloat(carboidratiPasto) || 0;
    const glic = parseFloat(glicemiaAttuale) || 0;
    const r_cho = parseFloat(rapportoCHO) || 10;
    const isf = parseFloat(sensibilitaISF) || 40;
    const target = parseFloat(targetGlicemico) || 100;

    if (cho === 0 && glic === 0) {
      alert("Inserisci almeno il valore della glicemia o i carboidrati del pasto.");
      return;
    }

    const insulinaPasto = cho > 0 ? cho / r_cho : 0;
    const insulinaCorrezione = glic > target ? (glic - target) / isf : 0;
    const totaleTeorico = insulinaPasto + insulinaCorrezione;

    setQuotaPasto(Math.round(insulinaPasto * 10) / 10);
    setQuotaCorrezione(Math.round(insulinaCorrezione * 10) / 10);
    
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
          <Text style={styles.labelLeftHighlight}>Glicemia (mg/dL)</Text>
          <TextInput style={styles.glicemiaInput} placeholder="100" placeholderTextColor="#636366" keyboardType="numeric" value={glicemiaAttuale} onChangeText={setGlicemiaAttuale} maxLength={3} />
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
      {/* BOX IMPOSTAZIONI RATIO TERAPEUTICI MODIFICABILI CON PULSANTE "i" E SOTTOTESTO MEDICO */}
      <View style={{ marginTop: 14, marginBottom: 10, width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={styles.sectionLabelBolo}>I tuoi Rapporti Personali</Text>
          <TouchableOpacity 
            onPress={() => setMostraHelpParametri(true)} 
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={{ justifyContent: 'center', alignItems: 'center', marginTop: 1 }}
          >
            <Ionicons name="information-circle-outline" size={18} color={COLORS.brandPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subLabelSpiegazioneBolo}>
          Pianifica e Studia i tuoi rapporti personali insieme al tuo medico e inseriscili nel riquadro specifico.
        </Text>
      </View>

      <View style={styles.cardParametriFissi}>
        <View style={styles.rigaRapportoParametro}>
          <View style={styles.sinistraInfoParametro}>
            <Ionicons name="pizza-outline" size={18} color={COLORS.brandSecondary} />
            <View style={{marginLeft: 8}}>
              <Text style={styles.titleParametro}>Rapporto I:CHO</Text>
              <Text style={styles.descParametro}>Quanti grammi di carboidrati copre 1 UI</Text>
            </View>
          </View>
          <TextInput style={styles.inputParametroFisso} keyboardType="numeric" value={rapportoCHO} onChangeText={setRapportoCHO} maxLength={2} />
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
          <TextInput style={styles.inputParametroFisso} keyboardType="numeric" value={sensibilitaISF} onChangeText={setSensibilitaISF} maxLength={3} />
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
          <TextInput style={styles.inputParametroFisso} keyboardType="numeric" value={targetGlicemico} onChangeText={setTargetGlicemico} maxLength={3} />
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
                <Text style={styles.infoBlockText}>È il valore di glicemia ideale che desideri raggiungere (di solito impostato a 100 mg/dL). Il calcolatore lo usa per capire quanta insulina extra serve per far scendere la tua glicemia alta fino all'obiettivo.</Text>
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
  
  sectionLabel: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, marginTop: 14, marginBottom: 10, uppercase: true, letterSpacing: 0.5 },
  sectionLabelBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface, letterSpacing: -0.2 },
  subLabelSpiegazioneBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 18, textAlign: 'left' },
  
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  
  cardInputHighlight: { backgroundColor: "#15151F", borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  labelLeftHighlight: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: "#A4A4AA", marginBottom: 4, textAlign: 'left' },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 34, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2 },
  
  saveButton: { flex: 1, backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#0A0A0C' },
  resetButton: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.borderGlass, width: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  cardParametriFissi: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%', paddingHorizontal: 14 },
  rigaRapportoParametro: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, width: '100%', justifyContent: 'space-between' },
  sinistraInfoParametro: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titleParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
  descParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: COLORS.muted, marginTop: 1 },
  inputParametroFisso: { backgroundColor: '#1A1A24', borderHorizontalWidth: 1, borderColor: COLORS.borderGlass, borderRadius: 10, width: 55, height: 36, textAlign: 'center', color: COLORS.brandPrimary, fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: '700', borderWidth: 1 },
  dividerParametri: { height: 1, backgroundColor: COLORS.borderGlass, width: '100%' },
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

  // CONFIGURAZIONI DEL POPUP COMPLETAMENTE ALLINEATE ALLO STORICO E ALLA HOME
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
