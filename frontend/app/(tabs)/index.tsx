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
