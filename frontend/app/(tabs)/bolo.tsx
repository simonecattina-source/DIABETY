import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: "#0A0A0C",        
  surfaceSecondary: "#13131A",  
  brandPrimary: "#00E5FF",      // Cyan neon
  brandSecondary: "#7D52FF",    // Viola tech per la sezione parametri
  onSurface: "#FFFFFF",         
  muted: "#7E7E86",             
  success: "#00E676",           
  warning: "#FF9100",           
  error: "#FF5252",             
  borderGlass: "rgba(255, 255, 255, 0.08)"
};

export default function CalcolatoreBoloScreen() {
  // Input Utente per il calcolo estemporaneo
  const [glicemiaAttuale, setGlicemiaAttuale] = useState('');
  const [carboidratiPasto, setCarboidratiPasto] = useState('');

  // Parametri Personali Terapeutici (Impostati con valori di default standard modificabili)
  const [rapportoCHO, setRapportoCHO] = useState('10'); // 1 UI ogni 10g CHO
  const [sensibilitaISF, setSensibilitaISF] = useState('40'); // 1 UI abbassa di 40 mg/dL
  const [targetGlicemico, setTargetGlicemico] = useState('100'); // Target ideale 100 mg/dL

  // Stati per il Risultato
  const [risultatoBolo, setRisultatoBolo] = useState<number | null>(null);
  const [quotaPasto, setQuotaPasto] = useState<number>(0);
  const [quotaCorrezione, setQuotaCorrezione] = useState<number>(0);

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

    // 1. Calcolo quota per i carboidrati del pasto
    const insulinaPasto = cho > 0 ? cho / r_cho : 0;

    // 2. Calcolo quota di correzione per l'iperglicemia
    const insulinaCorrezione = glic > target ? (glic - target) / isf : 0;

    // 3. Somma complessiva
    const totaleTeorico = insulinaPasto + insulinaCorrezione;

    setQuotaPasto(Math.round(insulinaPasto * 10) / 10);
    setQuotaCorrezione(Math.round(insulinaCorrezione * 10) / 10);
    
    // Arrotondamento terapeutico standard al mezzo punto (0.5 UI)
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
      <Text style={styles.sectionLabel}>Dati Attuali kontrol</Text>
      <View style={styles.rigaDatiPrincipali}>
        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Glicemia (mg/dL)</Text>
          <TextInput
            style={styles.glicemiaInput}
            placeholder="100"
            placeholderTextColor="#636366" 
            keyboardType="numeric"
            value={glicemiaAttuale}
            onChangeText={setGlicemiaAttuale}
            maxLength={3}
          />
        </View>

        <View style={[styles.cardInputHighlight, styles.metaLarghezza]}>
          <Text style={styles.labelLeftHighlight}>Carboidrati (g CHO)</Text>
          <TextInput
            style={styles.glicemiaInput}
            placeholder="0"
            placeholderTextColor="#636366" 
            keyboardType="numeric"
            value={carboidratiPasto}
            onChangeText={setCarboidratiPasto}
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
        <TouchableOpacity style={styles.saveButton} onPress={calcolaBoloInsulinico}>
          <Text style={styles.saveButtonText}>Calcola Bolo</Text>
        </TouchableOpacity>
      </View>

      {/* BOX IMPOSTAZIONI RATIO TERAPEUTICI MODIFICABILI */}
      <Text style={styles.sectionLabel}>I tuoi Rapporti Personali</Text>
      <View style={styles.cardParametriFissi}>
        <View style={styles.rigaRapportoParametro}>
          <View style={styles.sinistraInfoParametro}>
            <Ionicons name="pizza-outline" size={18} color={COLORS.brandSecondary} />
            <View style={{marginLeft: 8}}>
              <Text style={styles.titoloParametro}>Rapporto I:CHO</Text>
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
              <Text style={styles.titoloParametro}>Sensibilità (ISF)</Text>
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
              <Text style={styles.titoloParametro}>Target Glicemico</Text>
              <Text style={styles.descParametro}>Il tuo valore ideale di riferimento</Text>
            </View>
          </View>
          <TextInput style={styles.inputParametroFisso} keyboardType="numeric" value={targetGlicemico} onChangeText={setTargetGlicemico} maxLength={3} />
        </View>
      </View>

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
  rigaDatiPrincipali: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  metaLarghezza: { flex: 1 }, 
  
  cardInputHighlight: { backgroundColor: "#15151F", borderRadius: 16, padding: 16, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.borderGlass, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  labelLeftHighlight: { fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: '700', color: "#A4A4AA", marginBottom: 4, textAlign: 'left' },
  glicemiaInput: { fontFamily: 'Space Grotesk', fontSize: 34, fontWeight: '700', color: COLORS.onSurface, textAlign: 'left', width: '100%', paddingVertical: 2 },
  
  saveButton: { flex: 1, backgroundColor: COLORS.brandPrimary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: '700', color: '#0A0A0C' },
  resetButton: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.borderGlass, width: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  cardParametriFissi: { backgroundColor: COLORS.surfaceSecondary, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGlass, width: '100%', paddingHorizontal: 14 },
  rigaRapportoParametro: { flexDirection: 'row', justifyBetween: 'space-between', alignItems: 'center', paddingVertical: 14, width: '100%', justifyContent: 'space-between' },
  sinistraInfoParametro: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titoloParametro: { fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: '700', color: COLORS.onSurface },
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
  disclaimerBolo: { fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: COLORS.muted, textAlign: 'center', marginTop: 14, fontStyle: 'italic' }
});
