/**
 * DIABETY · Laboratorio QR (FASI 1 e 2)
 * ISOLATO: usa soltanto la chiave AsyncStorage diabety_qr_lab_v1.
 * Non legge né modifica glicotrack_data, bolo, IOB, alimenti o backup.
 * Fase 2: collegamento diretto WebRTC isolato, senza accesso ai dati medici.
 * NON implementa la sincronizzazione né la riconnessione automatica.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DIABETY_COLORS as C } from '@/src/theme/diabety';
import { DiabetyWifiLab } from '@/src/components/diabety-wifi-lab';

type Role = 'nessuno' | 'main' | 'associato';
type Peer = { id: string; name: string; linkedAt: string };
type LabState = {
  deviceId: string;
  deviceName: string;
  role: Role;
  mainId: string | null;
  mainName: string | null;
  token: string | null;
  linkedDevices: Peer[];
};
type QrMessage = {
  app: 'DIABETY'; v: 1; kind: 'main' | 'risposta';
  mainId: string; mainName?: string; deviceId?: string; deviceName?: string; token: string;
};

const LAB_KEY = 'diabety_qr_lab_v1';
const MAX_QR_SIZE = 1600;
const shortId = (id: string) => `${id.slice(0, 8)}…`;
const label = Platform.OS === 'web' ? 'DIABETY Web' : Platform.OS === 'ios' ? 'DIABETY iOS' : 'DIABETY Android';

// Identificativi sperimentali, NON credenziali di autenticazione.
const newId = () => {
  const values = new Uint32Array(4);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(values);
    return Array.from(values).map((v) => v.toString(16).padStart(8, '0')).join('');
  }
  return `${Date.now().toString(16)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};
const freshRecord = (): LabState => ({
  deviceId: newId(), deviceName: label, role: 'nessuno', mainId: null,
  mainName: null, token: null, linkedDevices: [],
});
const validText = (value: unknown, max = 80): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const readMessage = (raw: string): QrMessage | null => {
  if (!raw || raw.length > MAX_QR_SIZE) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const m = data as Partial<QrMessage>;
    if (m.app !== 'DIABETY' || m.v !== 1 ||
        !['main', 'risposta'].includes(m.kind || '') ||
        !validText(m.mainId, 128) || !validText(m.token, 128)) return null;
    if (m.kind === 'main' && !validText(m.mainName, 80)) return null;
    if (m.kind === 'risposta' && (!validText(m.deviceId, 128) || !validText(m.deviceName, 80))) return null;
    return m as QrMessage;
  } catch { return null; }
};
const primaryQr = (s: LabState) => JSON.stringify({
  app: 'DIABETY', v: 1, kind: 'main', mainId: s.deviceId,
  mainName: s.deviceName, token: s.token,
});
const replyQr = (s: LabState) => JSON.stringify({
  app: 'DIABETY', v: 1, kind: 'risposta', mainId: s.mainId,
  deviceId: s.deviceId, deviceName: s.deviceName, token: s.token,
});

function Action({ text, icon, onPress, subtle = false, disabled = false }: {
  text: string; icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void; subtle?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={[styles.button, subtle && styles.secondaryButton, disabled && styles.disabledButton]}>
      {icon && <Ionicons name={icon} size={18} color={subtle ? C.brandPrimary : C.background} />}
      <Text style={[styles.buttonText, subtle && styles.secondaryButtonText]}>{text}</Text>
    </TouchableOpacity>
  );
}

export default function SincronizzazioneScreen() {
  const [state, setState] = useState<LabState | null>(null);
  const [name, setName] = useState(label);
  const [scanning, setScanning] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [showRawQr, setShowRawQr] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingPeer, setPendingPeer] = useState<Peer | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanBusy = useRef(false);
  const stateRef = useRef<LabState | null>(null);

  const save = useCallback(async (next: LabState) => {
    await AsyncStorage.setItem(LAB_KEY, JSON.stringify(next));
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LAB_KEY);
        const parsed = stored ? JSON.parse(stored) : null;
        const record: LabState = parsed && validText(parsed.deviceId, 128) && validText(parsed.deviceName, 80) &&
          ['nessuno', 'main', 'associato'].includes(parsed.role) && Array.isArray(parsed.linkedDevices)
          ? parsed as LabState : freshRecord();
        if (!stored || record !== parsed) await AsyncStorage.setItem(LAB_KEY, JSON.stringify(record));
        if (active) { stateRef.current = record; setState(record); setName(record.deviceName); }
      } catch {
        if (active) setMessage('Impossibile leggere la configurazione sperimentale. Nessun dato sanitario è stato modificato.');
      }
    })();
    return () => { active = false; };
  }, []);

  const processMessage = async (raw: string) => {
    const current = stateRef.current;
    if (!current) return;
    const payload = readMessage(raw.trim());
    if (!payload) {
      setMessage('QR non valido: serve un QR generato dalla scheda Sincronizzazione DIABETY.');
      return;
    }
    if (payload.kind === 'main') {
      if (current.role === 'main') {
        setMessage('Questo dispositivo è già MAIN. Per associare un altro dispositivo, mostra il tuo QR.');
        return;
      }
      if (current.role === 'associato' && current.mainId !== payload.mainId) {
        setMessage('Dispositivo già collegato a un altro MAIN. Non sostituiamo automaticamente l’associazione.');
        return;
      }
      if (payload.mainId === current.deviceId) {
        setMessage('Non puoi associare il dispositivo a se stesso.');
        return;
      }
      const next: LabState = { ...current, role: 'associato', mainId: payload.mainId,
        mainName: payload.mainName || 'MAIN', token: payload.token, linkedDevices: [] };
      await save(next);
      setMessage('QR del MAIN letto. Ora mostra il QR di risposta al MAIN, che lo deve scansionare.');
      setScanning(false);
      setShowPaste(false);
      return;
    }
    if (current.role !== 'main' || payload.mainId !== current.deviceId || payload.token !== current.token) {
      setMessage('QR di risposta non destinato a questo MAIN o sessione non corrispondente.');
      return;
    }
    if (payload.deviceId === current.deviceId) {
      setMessage('Un dispositivo non può associarsi a se stesso.');
      return;
    }
    setPendingPeer({ id: payload.deviceId!, name: payload.deviceName!, linkedAt: new Date().toISOString() });
    setScanning(false);
    setShowPaste(false);
    setMessage('Risposta QR ricevuta. Conferma il dispositivo qui sotto.');
  };

  const handleQr = async (raw: string) => {
    if (scanBusy.current) return;
    scanBusy.current = true;
    try { await processMessage(raw); }
    catch { setMessage('Errore nel salvataggio dell’associazione sperimentale.'); }
    finally { scanBusy.current = false; }
  };

  const startMain = async () => {
    if (!state) return;
    try {
      await save({ ...state, role: 'main', mainId: null, mainName: null,
        token: newId(), linkedDevices: [] });
      setMessage('Il MAIN mostra questo QR. Gli altri dispositivi dovranno scansionarlo.');
    } catch { setMessage('Impossibile salvare la configurazione MAIN.'); }
  };

  const confirmPeer = async () => {
    if (!state || !pendingPeer || state.role !== 'main') return;
    try {
      const others = state.linkedDevices.filter((p) => p.id !== pendingPeer.id);
      await save({ ...state, linkedDevices: [...others, pendingPeer] });
      setPendingPeer(null);
      setMessage('Dispositivo registrato nel laboratorio QR. Nessun dato sanitario è stato sincronizzato.');
    } catch { setMessage('Impossibile completare la registrazione.'); }
  };

  const resetLab = async () => {
    if (!state) return;
    try {
      await save({ ...state, role: 'nessuno', mainId: null, mainName: null, token: null, linkedDevices: [] });
      setPendingPeer(null); setConfirmReset(false); setScanning(false);
      setMessage('Associazioni sperimentali cancellate. Lo storico e tutte le altre informazioni sono intatti.');
    } catch { setMessage('Errore nella rimozione delle associazioni sperimentali.'); }
  };

  const saveName = async () => {
    if (!state) return;
    const cleaned = name.trim();
    if (!cleaned || cleaned.length > 40) { setMessage('Inserisci un nome tra 1 e 40 caratteri.'); return; }
    try { await save({ ...state, deviceName: cleaned }); setMessage('Nome di questo dispositivo aggiornato.'); }
    catch { setMessage('Impossibile salvare il nome.'); }
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const response = await requestCameraPermission();
      if (!response.granted) {
        setMessage('Accesso fotocamera negato. Puoi incollare il codice QR in formato testo.');
        setShowPaste(true);
        return;
      }
    }
    setShowPaste(false); setScanning(true); setMessage('');
  };

  if (!state) return (
    <View style={styles.loader}><ActivityIndicator color={C.brandPrimary} />
      <Text style={styles.muted}>{message || 'Caricamento del laboratorio QR…'}</Text>
    </View>
  );

  const isMain = state.role === 'main';
  const isLinked = state.role === 'associato';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sincronizzazione</Text>
          <Text style={styles.subtitle}>Laboratorio QR e Wi-Fi · Fasi 1–2</Text>
        </View>
        <Ionicons name="qr-code-outline" size={26} color={C.brandPrimary} />
      </View>

      <View style={styles.warning}>
        <Ionicons name="flask-outline" size={19} color={C.warning} />
        <Text style={styles.warningText}>FASE 1: associazione QR. FASE 2: test WebRTC con scambio di messaggi non sanitari. Nessuna delle due funzioni trasferisce o sincronizza il diario clinico.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Questo dispositivo</Text>
        <Text style={styles.muted}>Identificativo test: {shortId(state.deviceId)}</Text>
        <View style={styles.nameRow}>
          <TextInput accessibilityLabel="Nome dispositivo" style={styles.input} value={name}
            onChangeText={setName} maxLength={40} placeholder="Nome dispositivo"
            placeholderTextColor={C.muted} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Salva nome" onPress={saveName} style={styles.smallButton}>
            <Ionicons name="checkmark" size={21} color={C.background} />
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          <Ionicons name={isMain ? 'shield-checkmark-outline' : isLinked ? 'link-outline' : 'radio-button-off-outline'} size={19}
            color={isMain ? C.success : isLinked ? C.brandPrimary : C.muted} />
          <Text style={styles.statusText}>{isMain ? 'MAIN · Mostra il QR' : isLinked ? 'Associato · MAIN riconosciuto' : 'Non associato'}</Text>
        </View>
      </View>

      {state.role === 'nessuno' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Come vuoi procedere?</Text>
          <Text style={styles.body}>Il dispositivo MAIN è quello che GENERA il QR. Gli altri dispositivi lo scansionano.</Text>
          <Action icon="qr-code-outline" text="Questo dispositivo sarà MAIN" onPress={startMain} />
          <Action icon="scan-outline" text="Scansiona il QR del MAIN" subtle onPress={openScanner} />
        </View>
      )}

      {isMain && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>MAIN · Codice di associazione</Text>
          <Text style={styles.body}>Apri questa stessa scheda su iPhone, iPad o PC e scansiona il QR. Il dispositivo associato mostrerà un QR di risposta.</Text>
          <View style={styles.qrArea}>
            <QRCode value={primaryQr(state)} size={208} backgroundColor="#FFFFFF" color="#111111" ecl="M" />
          </View>
          <Action text="Scansiona il QR di risposta" icon="scan-outline" onPress={openScanner} />
          <Action text={showRawQr ? 'Nascondi codice testuale' : 'Mostra codice testuale'} subtle
            icon="document-text-outline" onPress={() => setShowRawQr(!showRawQr)} />
          {showRawQr && <Text selectable style={styles.rawCode}>{primaryQr(state)}</Text>}
          {pendingPeer && (
            <View style={styles.notice}>
              <Text style={styles.sectionTitle}>Conferma associazione</Text>
              <Text style={styles.body}>{pendingPeer.name} ({shortId(pendingPeer.id)})</Text>
              <Action text="Conferma dispositivo" icon="checkmark-circle-outline" onPress={confirmPeer} />
              <Action text="Annulla" subtle onPress={() => setPendingPeer(null)} />
            </View>
          )}
          <Text style={styles.sectionTitle}>Dispositivi registrati ({state.linkedDevices.length})</Text>
          {state.linkedDevices.length ? state.linkedDevices.map((p) => (
            <View key={p.id} style={styles.peerRow}>
              <Ionicons name="phone-portrait-outline" color={C.brandPrimary} size={20} />
              <View style={{ flex: 1 }}><Text style={styles.body}>{p.name}</Text>
                <Text style={styles.muted}>{shortId(p.id)} · Registrazione QR</Text></View>
            </View>
          )) : <Text style={styles.muted}>Nessun dispositivo confermato.</Text>}
        </View>
      )}

      {isLinked && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Associato a {state.mainName}</Text>
          <Text style={styles.muted}>MAIN: {shortId(state.mainId || '')}</Text>
          <Text style={styles.body}>Mostra questo QR al dispositivo MAIN. Dal MAIN scegli «Scansiona il QR di risposta» e conferma l'associazione.</Text>
          <View style={styles.qrArea}>
            <QRCode value={replyQr(state)} size={208} backgroundColor="#FFFFFF" color="#111111" ecl="M" />
          </View>
          <Action text={showRawQr ? 'Nascondi codice testuale' : 'Mostra codice testuale'} subtle
            icon="document-text-outline" onPress={() => setShowRawQr(!showRawQr)} />
          {showRawQr && <Text selectable style={styles.rawCode}>{replyQr(state)}</Text>}
          <Text style={styles.muted}>La conferma sul MAIN non viene ancora comunicata automaticamente: questa è la prova del flusso QR, non una connessione di rete.</Text>
        </View>
      )}

      {state.role !== 'nessuno' && (
        <DiabetyWifiLab role={state.role} deviceId={state.deviceId}
          mainId={state.mainId} linkedDevices={state.linkedDevices} />
      )}

      {scanning && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Inquadra il QR</Text>
          <View style={styles.cameraFrame}>
            <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => { void handleQr(data); }} />
          </View>
          <Action text="Chiudi fotocamera" subtle icon="close-outline" onPress={() => setScanning(false)} />
          <Action text="Incolla il codice invece" subtle icon="clipboard-outline" onPress={() => { setScanning(false); setShowPaste(true); }} />
        </View>
      )}

      {showPaste && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lettura alternativa</Text>
          <Text style={styles.muted}>Inserisci il testo JSON di un QR DIABETY. Utile sui PC senza webcam.</Text>
          <TextInput accessibilityLabel="Testo codice QR" multiline style={[styles.input, styles.pasteInput]}
            value={pasted} onChangeText={setPasted} placeholder="Incolla il contenuto QR" placeholderTextColor={C.muted} />
          <Action text="Verifica il codice" icon="checkmark" onPress={() => { void handleQr(pasted); }} />
          <Action text="Chiudi" subtle onPress={() => setShowPaste(false)} />
        </View>
      )}

      {!!message && <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View>}

      {state.role !== 'nessuno' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gestisci laboratorio</Text>
          <Text style={styles.muted}>La rimozione riguarda esclusivamente le associazioni di prova. Non cancella alcuna registrazione glicemica.</Text>
          {confirmReset ? (
            <>
              <Text style={styles.body}>Vuoi azzerare le associazioni di prova su questo dispositivo?</Text>
              <Action text="Conferma rimozione" icon="trash-outline" onPress={() => { void resetLab(); }} />
              <Action text="Annulla" subtle onPress={() => setConfirmReset(false)} />
            </>
          ) : <Action text="Rimuovi associazioni di prova" subtle icon="unlink-outline" onPress={() => setConfirmReset(true)} />}
        </View>
      )}

      <Text style={styles.footer}>Fase 2: prova manuale di connessione WebRTC tramite QR. La riconnessione automatica alla riapertura e lo scambio di dati clinici non sono ancora disponibili.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 14, paddingBottom: 96, gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center' },
  loader: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 20 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#101B28', borderWidth: 1,
    borderColor: '#26536A', borderRadius: 16, gap: 12 },
  accent: { height: 45, width: 3, backgroundColor: C.brandPrimary, borderRadius: 3 },
  title: { color: C.onSurface, fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#A7C4D0', fontSize: 12, marginTop: 3 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10, borderRadius: 12,
    backgroundColor: '#251C12', borderWidth: 1, borderColor: '#614B25' },
  warningText: { flex: 1, color: '#FFD69B', fontSize: 12, lineHeight: 19 },
  card: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.borderGlassBright,
    borderRadius: 16, padding: 15, gap: 12 },
  sectionTitle: { color: C.onSurface, fontSize: 16, fontWeight: '700' },
  body: { color: '#DDE8F0', fontSize: 13, lineHeight: 20 },
  muted: { color: '#9FA1B1', fontSize: 12, lineHeight: 18 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { minWidth: 0, flex: 1, color: C.onSurface, backgroundColor: '#0B0B11', padding: 12,
    fontSize: 14, borderColor: C.borderGlassBright, borderWidth: 1, borderRadius: 10 },
  smallButton: { backgroundColor: C.brandPrimary, width: 47, height: 47, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: C.onSurface, fontSize: 13, fontWeight: '600' },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.brandPrimary, minHeight: 44 },
  buttonText: { color: C.background, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#0E2832', borderWidth: 1, borderColor: '#296071' },
  secondaryButtonText: { color: C.brandPrimary },
  disabledButton: { opacity: 0.45 },
  qrArea: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, alignSelf: 'center', marginVertical: 5 },
  cameraFrame: { height: 280, overflow: 'hidden', borderRadius: 12, borderColor: C.brandPrimary, borderWidth: 1 },
  camera: { flex: 1 },
  pasteInput: { minHeight: 90, textAlignVertical: 'top' },
  notice: { backgroundColor: '#112834', borderWidth: 1, borderColor: C.brandPrimary,
    padding: 12, borderRadius: 12, gap: 10 },
  peerRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12,
    borderRadius: 10, backgroundColor: '#0D1F28' },
  message: { backgroundColor: '#11303A', borderWidth: 1, borderColor: '#265A6A', borderRadius: 10, padding: 12 },
  messageText: { color: '#BDEFFC', lineHeight: 20, fontSize: 13 },
  rawCode: { color: '#BCD0DC', fontSize: 11, lineHeight: 17, backgroundColor: '#07141C',
    padding: 10, borderRadius: 9 },
  footer: { color: '#8A94A2', lineHeight: 20, fontSize: 12, textAlign: 'center', paddingBottom: 10 },
});
