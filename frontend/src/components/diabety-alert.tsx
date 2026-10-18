import { DIABETY_COLORS, DIABETY_ALERT_COLORS } from '@/src/theme/diabety';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TipoAvviso = 'info' | 'avviso' | 'errore';
type OpzioniAvviso = { titolo?: string; tipo?: TipoAvviso };
type Avviso = { messaggio: string; titolo: string; tipo: TipoAvviso };
type MostraAvviso = (messaggio: string, opzioni?: OpzioniAvviso) => void;

const ContestoAvvisi = createContext<MostraAvviso | null>(null);

/**
 * Popup condiviso da Inserisci, Storico, Bolo e Impostazioni.
 * Non usa window.alert: funziona su Web, Android e iOS.
 * L'eventuale secondo messaggio viene accodato fino alla chiusura del primo.
 */
export function DiabetyAlertProvider({ children }: { children: React.ReactNode }) {
  const [coda, setCoda] = useState<Avviso[]>([]);

  const mostraAvviso = useCallback<MostraAvviso>((messaggio, opzioni = {}) => {
    const tipo: TipoAvviso = opzioni.tipo ??
      (/ipoglicemia|glicemia inferiore a 70|concordato con il medico/i.test(messaggio)
        ? 'avviso'
        : /errore|impossibile|non valid[oaie]|malformat|duplicat|bloccato|non riconosciuto/i.test(messaggio)
          ? 'errore'
          : 'info');
    const titolo = opzioni.titolo ?? (tipo === 'errore' ? 'Operazione non riuscita' : tipo === 'avviso' ? 'Avviso importante' : 'Avviso DIABETY');
    setCoda(prec => [...prec, { messaggio, titolo, tipo }]);
  }, []);

  const chiudiAvviso = useCallback(() => setCoda(prec => prec.slice(1)), []);
  const corrente = coda[0];
  const valoreContesto = useMemo(() => mostraAvviso, [mostraAvviso]);
  const colore = corrente?.tipo === 'errore' ? DIABETY_ALERT_COLORS.error : corrente?.tipo === 'avviso' ? DIABETY_ALERT_COLORS.warning : DIABETY_COLORS.brandPrimary;
  const icona: 'alert-circle-outline' | 'warning-outline' | 'information-circle-outline' = corrente?.tipo === 'errore' ? 'alert-circle-outline' : corrente?.tipo === 'avviso' ? 'warning-outline' : 'information-circle-outline';

  return (
    <ContestoAvvisi.Provider value={valoreContesto}>
      {children}
      <Modal
        transparent
        visible={Boolean(corrente)}
        animationType="fade"
        onRequestClose={chiudiAvviso}
        statusBarTranslucent
      >
        <View style={styles.oscuramento}>
          <View style={styles.scheda} accessibilityViewIsModal>
            <View style={styles.barraSuperiore} />
            <View style={styles.intestazione}>
              <View style={[styles.contenitoreIcona, { borderColor: colore }]}>
                <Ionicons name={icona} color={colore} size={24} />
              </View>
              <View style={styles.areaTitolo}>
                <Text style={styles.marchio}>DIABETY · NOTIFICA</Text>
                <Text style={styles.titolo}>{corrente?.titolo}</Text>
              </View>
            </View>
            <ScrollView
              style={styles.scorrimento}
              contentContainerStyle={styles.testoContenitore}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.messaggio}>{corrente?.messaggio}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.pulsante}
              onPress={chiudiAvviso}
              accessibilityRole="button"
              accessibilityLabel="Chiudi avviso"
            >
              <Text style={styles.testoPulsante}>Ho capito</Text>
              <Ionicons name="checkmark" size={18} color="#06171D" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ContestoAvvisi.Provider>
  );
}

export function useDiabetyAlert(): MostraAvviso {
  const contesto = useContext(ContestoAvvisi);
  if (!contesto) throw new Error('useDiabetyAlert richiede DiabetyAlertProvider nel layout principale');
  return contesto;
}

const styles = StyleSheet.create({
  oscuramento: {
    flex: 1, backgroundColor: DIABETY_ALERT_COLORS.overlay,
    justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 26,
  },
  scheda: {
    width: '100%', maxWidth: 440, alignSelf: 'center',
    backgroundColor: DIABETY_COLORS.surfaceSecondary, borderColor: DIABETY_ALERT_COLORS.border, borderWidth: 1,
    borderRadius: 20, overflow: 'hidden', padding: 18,
  },
  barraSuperiore: {
    position: 'absolute', left: 0, right: 0, top: 0,
    height: 3, backgroundColor: DIABETY_COLORS.brandPrimary,
  },
  intestazione: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 17, gap: 12 },
  contenitoreIcona: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', backgroundColor: DIABETY_ALERT_COLORS.iconBackground,
  },
  areaTitolo: { flex: 1 },
  marchio: { color: DIABETY_ALERT_COLORS.label, fontSize: 10, letterSpacing: 1, marginBottom: 4, fontWeight: '700' },
  titolo: { color: DIABETY_COLORS.onSurface, fontSize: 18, fontWeight: '700', lineHeight: 23 },
  scorrimento: { maxHeight: 260, backgroundColor: DIABETY_ALERT_COLORS.panelBackground, borderRadius: 12, borderWidth: 1, borderColor: DIABETY_ALERT_COLORS.panelBorder },
  testoContenitore: { padding: 15 },
  messaggio: { color: DIABETY_ALERT_COLORS.message, fontSize: 14, lineHeight: 22 },
  pulsante: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DIABETY_COLORS.brandPrimary, borderRadius: 12, minHeight: 46, paddingVertical: 11,
  },
  testoPulsante: { color: DIABETY_ALERT_COLORS.onButton, fontSize: 14, fontWeight: '800' },
});
