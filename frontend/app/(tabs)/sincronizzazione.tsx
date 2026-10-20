/**
 * DIABETY · Trasferimento manuale di backup mediante QR + WebRTC.
 * La scansione QR negozia una connessione temporanea; i dati non sono nel QR.
 * Il backup ricevuto RESTA IN MEMORIA fino alla conferma in Impostazioni.
 * Non esiste sincronizzazione automatica, associazione permanente o importazione silenziosa.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DIABETY_COLORS as C } from '@/src/theme/diabety';
import { checkReceivedBackup, prepareQrBackup, queueQrBackupForImport, type PreparedBackup } from '@/src/services/backup-transfer';
import { QrBackupWire, type TransferProgress } from '@/src/services/qr-backup-datachannel';
import { awaitLocalCandidates, createQrParts, decodeLanSignal, encodeLanSignal, newLanId, QrPartCollector, type LanSignal } from '@/src/services/qr-backup-transport';

type Mode = 'none' | 'send' | 'receive';
const RTC_AVAILABLE = Platform.OS === 'web';

function Action({ label, onPress, subtle = false, disabled = false, icon }: {
  label: string; onPress: () => void; subtle?: boolean; disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={[s.action, subtle && s.subtle, disabled && s.disabled]}>
    {icon && <Ionicons name={icon} size={18} color={subtle ? C.brandPrimary : '#071016'} />}
    <Text style={[s.actionText, subtle && s.subtleText]}>{label}</Text>
  </TouchableOpacity>;
}

export default function TrasferimentoQrScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('none');
  const [status, setStatus] = useState('Scegli se inviare o ricevere un backup.');
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<PreparedBackup | null>(null);
  const [received, setReceived] = useState<string | null>(null);
  const [receivedRecords, setReceivedRecords] = useState(0);
  const [qrParts, setQrParts] = useState<string[]>([]);
  const [qrPage, setQrPage] = useState(0);
  const [fullSignal, setFullSignal] = useState('');
  const [scan, setScan] = useState(false);
  const [paste, setPaste] = useState(false);
  const [pasted, setPasted] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [camera, setCamera] = useState<'front' | 'back'>(Platform.OS === 'web' ? 'front' : 'back');
  const [permission, askPermission] = useCameraPermissions();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wireRef = useRef<QrBackupWire | null>(null);
  const sessionRef = useRef<{ id: string; from: string; to: string } | null>(null);
  const qrCollector = useRef(new QrPartCollector());
  const scanLock = useRef(false);
  const lastCode = useRef<{ data: string; at: number }>({ data: '', at: 0 });
  const disposedRef = useRef(false);
  const lastProgressUiAt = useRef(0);

  const stopSession = () => {
    wireRef.current?.dispose(); wireRef.current = null;
    const pc = pcRef.current; pcRef.current = null;
    if (pc) { pc.ondatachannel = null; pc.onconnectionstatechange = null; pc.close(); }
    sessionRef.current = null;
    qrCollector.current.reset();
    setConnected(false); setQrParts([]); setQrPage(0); setFullSignal(''); setProgress(null); setScan(false);
  };
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      wireRef.current?.dispose();
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);
  const fail = (error: unknown) => setStatus(error instanceof Error ? `ERRORE: ${error.message}` : 'Operazione non riuscita.');

  const installChannel = (channel: RTCDataChannel) => {
    wireRef.current?.dispose();
    const wire = new QrBackupWire(channel, v => {
      const now = Date.now();
      if (!disposedRef.current && (v.current === v.total || now - lastProgressUiAt.current > 120)) {
        lastProgressUiAt.current = now;
        setProgress(v);
      }
    }, text => {
      if (disposedRef.current) return;
      try {
        const meta = checkReceivedBackup(text);
        setReceived(text);
        setReceivedRecords(meta.records);
      } catch (e) { fail(e); }
    }, msg => { if (!disposedRef.current) setStatus(msg); });
    wireRef.current = wire;
    channel.onopen = () => { if (!disposedRef.current) { setConnected(true); setStatus('Connessione diretta attiva. Nessun dato ancora importato.'); } };
    channel.onclose = () => { if (!disposedRef.current) { setConnected(false); setStatus('Connessione terminata. Se il backup è stato ricevuto e verificato, puoi comunque aprire la conferma di importazione.'); } };
    channel.onerror = () => { if (!disposedRef.current) setStatus('Errore del canale: ripeti il collegamento QR.'); };
  };
  const makePeer = () => {
    if (!RTC_AVAILABLE || typeof RTCPeerConnection === 'undefined') throw new Error('WebRTC non disponibile in questa versione. Usa DIABETY Web su browser compatibile.');
    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      if (!disposedRef.current && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
        setConnected(false);
        setStatus('Connessione interrotta: eventuale trasferimento incompleto non verrà importato.');
      }
    };
    return pc;
  };
  const displaySignal = async (signal: LanSignal) => {
    const code = await encodeLanSignal(signal);
    const parts = createQrParts(code, newLanId());
    setQrParts(parts); setQrPage(0); setFullSignal(code); setShowCode(false);
    setStatus(`Codice di collegamento pronto (${parts.length} QR). Usa «Successivo» per mostrare tutte le parti.`);
  };
  const choose = (next: Mode) => {
    stopSession(); setMode(next); setReceived(null); setReceivedRecords(0); setPrepared(null);
    setStatus(next === 'send' ? 'Prepara il backup sull’origine. Nessun dato viene ancora inviato.' : 'Leggi il QR dell’origine per aprire la connessione.');
  };

  const prepareOffer = async () => {
    if (busy) return;
    setBusy(true);
    try {
      stopSession();
      const backup = await prepareQrBackup();
      setPrepared(backup);
      const id = newLanId(), from = newLanId(), to = newLanId();
      sessionRef.current = { id, from, to };
      const pc = makePeer();
      installChannel(pc.createDataChannel('diabety-backup', { ordered: true }));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const ready = await awaitLocalCandidates(pc);
      if (!ready || !pc.localDescription?.sdp) throw new Error('Informazioni Wi-Fi incomplete. Riprova.');
      await displaySignal({ app: 'DIABETY_BACKUP_QR', version: 2, kind: 'offer', sessionId: id, mainId: from, peerId: to, sdp: pc.localDescription.sdp });
    } catch (e) { stopSession(); fail(e); }
    finally { setBusy(false); }
  };

  const handleSignal = async (code: string) => {
    setBusy(true);
    try {
      const signal = await decodeLanSignal(code);
      if (mode === 'receive' && signal.kind === 'offer') {
        stopSession();
        sessionRef.current = { id: signal.sessionId, from: signal.mainId, to: signal.peerId };
        const pc = makePeer();
        pc.ondatachannel = event => installChannel(event.channel);
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const ready = await awaitLocalCandidates(pc);
        if (!ready || !pc.localDescription?.sdp) throw new Error('Risposta Wi-Fi incompleta. Riprova.');
        await displaySignal({ ...signal, kind: 'answer', sdp: pc.localDescription.sdp });
      } else if (mode === 'send' && signal.kind === 'answer') {
        const ref = sessionRef.current;
        if (!ref || !pcRef.current || signal.sessionId !== ref.id || signal.mainId !== ref.from || signal.peerId !== ref.to) {
          throw new Error('La risposta non appartiene a questo trasferimento.');
        }
        await pcRef.current.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        setQrParts([]); setFullSignal('');
        setStatus('Risposta letta. Attendi che la connessione diventi attiva, poi premi «Invia backup».');
      } else throw new Error(mode === 'receive' ? 'Scansiona l’offerta QR del dispositivo origine.' : 'Scansiona la risposta QR del destinatario.');
      setScan(false); setPaste(false); setScanProgress('');
    } catch (e) { fail(e); }
    finally { setBusy(false); }
  };

  const consumeQr = async (raw: string) => {
    if (scanLock.current || busy) return;
    const now = Date.now();
    if (lastCode.current.data === raw && now - lastCode.current.at < 1200) return;
    lastCode.current = { data: raw, at: now };
    scanLock.current = true;
    try {
      const result = qrCollector.current.accept(raw);
      if (result.code) {
        qrCollector.current.reset();
        await handleSignal(result.code);
      } else setScanProgress(`QR acquisiti: ${result.count}/${result.total}. Mostra il successivo sull’altro dispositivo.`);
    } catch (e) { fail(e); }
    finally { scanLock.current = false; }
  };
  const openScanner = async () => {
    qrCollector.current.reset(); setScanProgress('');
    if (!permission?.granted) {
      const result = await askPermission();
      if (!result.granted) { setStatus('Permesso fotocamera negato. Puoi incollare manualmente il codice completo.'); setPaste(true); return; }
    }
    setPaste(false); setScan(true);
  };
  const send = async () => {
    if (!prepared || !wireRef.current || !connected || busy) return;
    setBusy(true);
    try { await wireRef.current.send(prepared.json); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };
  const proceedImport = () => {
    if (!received) return;
    queueQrBackupForImport(received);
    router.push('/(tabs)/impostazioni');
  };

  const percent = progress?.total ? Math.floor((progress.current / progress.total) * 100) : 0;
  const qrSize = Math.min(320, Math.max(200, screenWidth - 100));

  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <View style={s.hero}><View style={s.accent} /><View style={{ flex: 1 }}>
      <Text style={s.title}>Trasferimento backup QR</Text>
      <Text style={s.muted}>Copia manuale tra dispositivi · Wi-Fi locale</Text>
    </View></View>
    <View style={s.notice}><Ionicons name="shield-checkmark-outline" color="#8FDFEC" size={20} />
      <Text style={[s.body, { flex: 1 }]}>Il QR serve soltanto ad aprire una connessione temporanea. Il backup viaggia cifrato tramite WebRTC; non viene importato finché non confermi in Impostazioni. Tieni entrambe le app aperte.</Text>
    </View>
    {!RTC_AVAILABLE && <View style={s.notice}><Text style={s.body}>Questo primo trasferimento è disponibile nella versione Web. La compatibilità con app native Android/iOS richiederà una successiva implementazione specifica.</Text></View>}
    <View style={s.card}>
      <Text style={s.section}>Scegli l'operazione</Text>
      <Action icon="phone-portrait-outline" label="Invia backup da questo dispositivo" onPress={() => choose('send')} subtle={mode !== 'send'} disabled={!RTC_AVAILABLE} />
      <Action icon="download-outline" label="Ricevi backup su questo dispositivo" onPress={() => choose('receive')} subtle={mode !== 'receive'} disabled={!RTC_AVAILABLE} />
      <Text style={s.muted}>Non è necessario associare permanentemente i dispositivi. Ogni trasferimento è indipendente.</Text>
    </View>
    {mode !== 'none' && <View style={s.card}>
      <Text style={s.section}>{mode === 'send' ? 'Dispositivo origine · Mostra il QR' : 'Dispositivo destinazione · Scansiona il QR'}</Text>
      {mode === 'send' && <Action icon="qr-code-outline" label={busy ? 'Preparazione in corso…' : '1 · Prepara backup e genera QR'} onPress={() => { void prepareOffer(); }} disabled={busy} />}
      {prepared && mode === 'send' && <Text style={s.body}>Backup pronto: {prepared.records} misurazioni · {Math.ceil(prepared.bytes / 1024)} KB. Il trasferimento non è ancora iniziato.</Text>}
      {qrParts.length > 0 && <View style={s.qrBlock}>
        <View style={s.qrArea}><QRCode key={`${qrPage}-${qrParts[qrPage].length}`} value={qrParts[qrPage]} size={qrSize} backgroundColor="#FFFFFF" color="#111111" ecl="M" /></View>
        <Text style={s.body}>QR {qrPage + 1} di {qrParts.length}</Text>
        <View style={s.inline}>
          <TouchableOpacity onPress={() => setQrPage(Math.max(0, qrPage - 1))} disabled={qrPage === 0} style={[s.small, qrPage === 0 && s.disabled]}><Text style={s.smallText}>Precedente</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setQrPage(Math.min(qrParts.length - 1, qrPage + 1))} disabled={qrPage === qrParts.length - 1} style={[s.small, qrPage === qrParts.length - 1 && s.disabled]}><Text style={s.smallText}>Successivo</Text></TouchableOpacity>
        </View>
        <Action icon="document-text-outline" label={showCode ? 'Nascondi codice completo' : 'Mostra codice completo (alternativa)'} subtle onPress={() => setShowCode(!showCode)} />
        {showCode && <Text selectable style={s.code}>{fullSignal}</Text>}
      </View>}
      {(mode === 'receive' || (mode === 'send' && qrParts.length > 0)) && <>
        <Action icon="scan-outline" label={mode === 'receive' ? '2 · Leggi QR dell’origine' : '3 · Leggi QR di risposta'} onPress={() => { void openScanner(); }} disabled={busy} />
        <Action icon="clipboard-outline" label="Incolla codice completo (alternativa)" subtle onPress={() => { setPaste(true); setScan(false); }} />
      </>}
      {scan && <View style={{ gap: 8 }}>
        <Text style={s.body}>Inquadra i QR uno alla volta. Se sono più di uno, cambia schermata sull’altro dispositivo.</Text>
        <View style={s.cameraFrame}><CameraView style={{ flex: 1 }} facing={camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { void consumeQr(data); }} /></View>
        {!!scanProgress && <Text style={s.body}>{scanProgress}</Text>}
        <Action label="Cambia fotocamera" icon="camera-reverse-outline" subtle onPress={() => setCamera(camera === 'front' ? 'back' : 'front')} />
        <Action label="Chiudi scanner" icon="close-outline" subtle onPress={() => setScan(false)} />
      </View>}
      {paste && <View style={{ gap: 8 }}>
        <Text style={s.muted}>Incolla il codice COMPLETO (inizia con DBQ1:), non una singola parte.</Text>
        <TextInput multiline style={s.input} value={pasted} onChangeText={setPasted} placeholder="Incolla codice completo…" placeholderTextColor={C.muted} />
        <Action label="Verifica codice incollato" onPress={() => { void handleSignal(pasted.trim()); }} />
        <Action label="Chiudi" subtle onPress={() => setPaste(false)} />
      </View>}
    </View>}
    {mode !== 'none' && <View style={s.card}>
      <Text style={s.section}>Stato del trasferimento</Text>
      <View style={s.status}><Ionicons name={connected ? 'checkmark-circle-outline' : 'radio-button-off-outline'} color={connected ? C.success : C.muted} size={20}/><Text style={[s.body, { flex: 1 }]}>{status}</Text></View>
      {busy && <ActivityIndicator color={C.brandPrimary} />}
      {progress && <Text style={s.body}>{progress.status}: {percent}% · {Math.ceil(progress.current / 1024)} / {Math.ceil(progress.total / 1024)} KB</Text>}
      {mode === 'send' && <Action icon="send-outline" label="4 · Invia backup" onPress={() => { void send(); }} disabled={!connected || !prepared || busy} />}
      {mode === 'receive' && received && <>
        <Text style={s.body}>Backup ricevuto e SHA-256 verificato · {receivedRecords} misurazioni.</Text>
        <Text style={s.muted}>Il ripristino sostituirà i dati locali solo se lo confermi nel popup esistente. Se questo dispositivo contiene informazioni diverse, esporta prima un backup JSON.</Text>
        <Action icon="shield-checkmark-outline" label="Apri conferma importazione in Impostazioni" onPress={proceedImport} />
      </>}
      <Action label="Annulla / chiudi connessione" subtle icon="close-circle-outline" onPress={() => { stopSession(); setMode('none'); setPrepared(null); setReceived(null); setStatus('Trasferimento annullato. Nessun dato importato.'); }} />
    </View>}
    <Text style={s.footer}>Laboratorio backup QR · Nessuna sincronizzazione automatica. Il vecchio codice di associazione permanente e i test PING/PONG sono stati rimossi. Prima di usarlo sui dati reali, collaudare il trasferimento con dati di prova.</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 14, paddingBottom: 100, gap: 14 },
  hero: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: '#28556A', borderRadius: 16, backgroundColor: '#101B28', padding: 15 },
  accent: { width: 3, height: 45, borderRadius: 4, backgroundColor: C.brandPrimary },
  title: { fontSize: 22, fontWeight: '800', color: C.onSurface },
  body: { color: '#E2EBF1', fontSize: 13, lineHeight: 20 },
  muted: { color: '#9CA9B8', fontSize: 12, lineHeight: 19 },
  notice: { borderWidth: 1, borderColor: '#2B687A', backgroundColor: '#112833', borderRadius: 13, padding: 13, flexDirection: 'row', gap: 10 },
  card: { borderWidth: 1, borderColor: C.borderGlassBright, backgroundColor: C.surfaceSecondary, borderRadius: 16, padding: 15, gap: 12 },
  section: { color: C.onSurface, fontWeight: '700', fontSize: 16 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, backgroundColor: C.brandPrimary, padding: 12, gap: 8, borderRadius: 10 },
  actionText: { color: '#071016', fontSize: 13, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  subtle: { backgroundColor: '#0E2731', borderWidth: 1, borderColor: '#296071' },
  subtleText: { color: C.brandPrimary },
  disabled: { opacity: 0.45 },
  qrBlock: { alignItems: 'center', gap: 10 },
  qrArea: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, alignSelf: 'center' },
  inline: { flexDirection: 'row', gap: 10 },
  small: { backgroundColor: '#123540', borderColor: '#286378', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 9 },
  smallText: { color: '#B7F1FF', fontWeight: '700' },
  code: { color: '#CFDCE4', fontSize: 11, backgroundColor: '#09151F', padding: 12, borderRadius: 10 },
  cameraFrame: { height: 290, borderWidth: 1, borderColor: C.brandPrimary, borderRadius: 12, overflow: 'hidden' },
  input: { color: C.onSurface, borderWidth: 1, borderColor: C.borderGlassBright, backgroundColor: '#080F19', minHeight: 100, borderRadius: 9, padding: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { color: '#8899AA', fontSize: 12, lineHeight: 20, textAlign: 'center' },
});
