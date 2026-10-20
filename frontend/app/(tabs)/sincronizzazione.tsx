/**
 * DIABETY · Procedura guidata per il trasferimento manuale backup QR + WebRTC.
 * La scansione QR negozia una connessione temporanea; i dati non sono nel QR.
 * Il backup ricevuto RESTA IN MEMORIA fino alla conferma in Impostazioni.
 * Non esiste sincronizzazione automatica, associazione permanente o importazione silenziosa.
 * La procedura guidata cambia solo la presentazione: trasporto invariato.
 * Invio arancione #FF9800 / ricezione viola #A855F7, come in Impostazioni.
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
// Colori identici alle icone Esporta/Importa Backup di Impostazioni.
const SEND_COLOR = '#FF9800';
const RECEIVE_COLOR = '#A855F7';
const SEND_SURFACE = '#302114';
const RECEIVE_SURFACE = '#281A39';
const RTC_AVAILABLE = Platform.OS === 'web';

function Action({ label, onPress, subtle = false, disabled = false, icon, accent = C.brandPrimary }: {
  label: string; onPress: () => void; subtle?: boolean; disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  accent?: string;
}) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={[s.action, !subtle && {backgroundColor:accent}, subtle && s.subtle, disabled && s.disabled]}>
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
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [answerAccepted, setAnswerAccepted] = useState(false);
  const [sendStarted, setSendStarted] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
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
    setConnected(false); setOfferAccepted(false); setAnswerAccepted(false);
    setSendStarted(false); setDeliveryConfirmed(false);
    setQrParts([]); setQrPage(0); setFullSignal(''); setProgress(null); setScan(false);
    setPaste(false); setPasted(''); setShowCode(false); setScanProgress('');
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
    }, msg => {
      if (!disposedRef.current) {
        setStatus(msg);
        if (msg === 'Backup ricevuto e verificato dal dispositivo di destinazione.') setDeliveryConfirmed(true);
      }
    });
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
    } catch (e) { stopSession(); setPrepared(null); fail(e); }
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
        setOfferAccepted(true);
      } else if (mode === 'send' && signal.kind === 'answer') {
        const ref = sessionRef.current;
        if (!ref || !pcRef.current || signal.sessionId !== ref.id || signal.mainId !== ref.from || signal.peerId !== ref.to) {
          throw new Error('La risposta non appartiene a questo trasferimento.');
        }
        await pcRef.current.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        setAnswerAccepted(true);
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
    setBusy(true); setSendStarted(true);
    try { await wireRef.current.send(prepared.json); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  };
  const proceedImport = () => {
    if (!received) return;
    queueQrBackupForImport(received);
    router.push('/(tabs)/impostazioni');
  };

  const roleColor = mode === 'send' ? SEND_COLOR : mode === 'receive' ? RECEIVE_COLOR : C.brandPrimary;
  const percent = progress?.total ? Math.floor((progress.current / progress.total) * 100) : 0;
  const qrSize = Math.min(320, Math.max(200, screenWidth - 94));
  const steps = mode === 'send'
    ? ['Prepara', 'Mostra QR', 'Conferma', 'Invia']
    : ['Scansiona', 'Mostra QR', 'Ricevi', 'Importa'];
  const stage = mode === 'send'
    ? (!prepared ? 1 : (sendStarted || connected || deliveryConfirmed) ? 4 : (scan || paste || answerAccepted) ? 3 : 2)
    : (!offerAccepted ? 1 : received ? 4 : connected ? 3 : 2);
  const isError = status.startsWith('ERRORE:') || status.startsWith('Connessione interrotta');

  const GuideHeader = ({ title, description }: { title: string; description: string }) => (
    <View style={s.stepHeader}>
      <Text style={[s.currentStep,{color:roleColor}]}>PASSO {stage} DI 4</Text>
      <Text style={s.stepTitle}>{title}</Text>
      <Text style={s.guideText}>{description}</Text>
    </View>
  );
  const QRPanel = () => qrParts.length > 0 && !scan && !paste ? (
    <View style={s.qrPanel}>
      <View style={[s.qrArea,{borderColor:roleColor}]}>
        <QRCode key={`${qrPage}-${qrParts[qrPage].length}`} value={qrParts[qrPage]} size={qrSize}
          backgroundColor="#FFFFFF" color="#111111" ecl="M" />
      </View>
      <Text style={[s.qrCounter,{color:roleColor}]}>CODICE {qrPage + 1} / {qrParts.length}</Text>
      <Text style={s.centerMuted}>Se ci sono più codici, fai scansionare anche i successivi.</Text>
      {qrParts.length > 1 && <View style={s.inline}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Codice QR precedente"
          onPress={() => setQrPage(Math.max(0, qrPage - 1))} disabled={qrPage === 0}
          style={[s.small, qrPage === 0 && s.disabled]}>
          <Ionicons name="chevron-back" color="#B7F1FF" size={16}/><Text style={s.smallText}>Precedente</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Codice QR successivo"
          onPress={() => setQrPage(Math.min(qrParts.length - 1, qrPage + 1))}
          disabled={qrPage === qrParts.length - 1}
          style={[s.small, qrPage === qrParts.length - 1 && s.disabled]}>
          <Text style={s.smallText}>Successivo</Text><Ionicons name="chevron-forward" color="#B7F1FF" size={16}/>
        </TouchableOpacity>
      </View>}
      <TouchableOpacity accessibilityRole="button" style={s.textButton} onPress={() => setShowCode(!showCode)}>
        <Text style={s.linkText}>{showCode ? 'Nascondi codice testuale' : 'Usa codice testuale (alternativa)'}</Text>
      </TouchableOpacity>
      {showCode && <Text selectable style={s.code}>{fullSignal}</Text>}
    </View>
  ) : null;

  const ScannerPanel = () => scan ? (
    <View style={s.scanPanel}>
      <Text style={s.body}>Inquadra il codice sull’altro dispositivo. Dopo la lettura, passa al QR successivo, se presente.</Text>
      <View style={[s.cameraFrame,{borderColor:roleColor}]}>
        <CameraView style={{ flex: 1 }} facing={camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => { void consumeQr(data); }} />
      </View>
      {!!scanProgress && <View style={s.softInfo}><Ionicons name="checkmark-circle-outline" color={roleColor} size={18}/><Text style={[s.body,{flex:1}]}>{scanProgress}</Text></View>}
      <View style={s.inline}>
        <TouchableOpacity accessibilityRole="button" style={[s.small,{flex:1}]} onPress={() => setCamera(camera === 'front' ? 'back' : 'front')}>
          <Ionicons name="camera-reverse-outline" color={C.brandPrimary} size={17}/><Text style={s.smallText}>Cambia fotocamera</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[s.small,{flex:1}]} onPress={() => setScan(false)}>
          <Ionicons name="close-outline" color={C.brandPrimary} size={17}/><Text style={s.smallText}>Chiudi</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const PastePanel = () => paste ? (
    <View style={s.scanPanel}>
      <Text style={s.muted}>Incolla il codice completo (inizia con DBQ1:), non una singola parte.</Text>
      <TextInput multiline style={s.input} value={pasted} onChangeText={setPasted}
        placeholder="Incolla il codice completo…" placeholderTextColor={C.muted} />
      <Action accent={roleColor} icon="checkmark-outline" label="Leggi codice incollato" disabled={!pasted.trim() || busy}
        onPress={() => { void handleSignal(pasted.trim()); }} />
      <Action label="Chiudi" subtle onPress={() => setPaste(false)} />
    </View>
  ) : null;

  const ScanAlternatives = () => !scan && !paste ? (
    <TouchableOpacity accessibilityRole="button" onPress={() => { setPaste(true); setScan(false); }} style={s.textButton}>
      <Ionicons name="clipboard-outline" size={16} color={C.brandPrimary} />
      <Text style={s.linkText}>Non riesci a scansionare? Incolla il codice</Text>
    </TouchableOpacity>
  ) : null;

  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}>
      <View style={s.accent}/>
      <View style={{flex:1}}>
        <Text style={s.title}>Trasferimento backup QR</Text>
        <Text style={s.muted}>Da un dispositivo all'altro, passo dopo passo</Text>
      </View>
      <Ionicons name="qr-code-outline" color={C.brandPrimary} size={26}/>
    </View>

    {mode === 'none' ? <>
      <View style={s.introCard}>
        <Text style={s.section}>Che cosa vuoi fare su questo dispositivo?</Text>
        <Text style={s.guideText}>Apri DIABETY su entrambi i dispositivi e collegali alla stessa rete Wi-Fi.</Text>
        <TouchableOpacity disabled={!RTC_AVAILABLE} accessibilityRole="button" accessibilityLabel="Invia dati da questo dispositivo"
          style={[s.roleCard,s.roleCardSend,!RTC_AVAILABLE&&s.disabled]} onPress={() => choose('send')}>
          <View style={[s.roleIcon,s.roleIconSend]}><Ionicons name="arrow-up-outline" color={SEND_COLOR} size={24}/></View>
          <View style={{flex:1}}><Text style={[s.roleTitle,{color:SEND_COLOR}]}>Invia dati</Text><Text style={s.roleDescription}>Qui ci sono i dati che vuoi copiare sull'altro dispositivo.</Text></View>
          <Ionicons name="chevron-forward" color={SEND_COLOR} size={20}/>
        </TouchableOpacity>
        <TouchableOpacity disabled={!RTC_AVAILABLE} accessibilityRole="button" accessibilityLabel="Ricevi dati su questo dispositivo"
          style={[s.roleCard,s.roleCardReceive,!RTC_AVAILABLE&&s.disabled]} onPress={() => choose('receive')}>
          <View style={[s.roleIcon,s.roleIconReceive]}><Ionicons name="arrow-down-outline" color={RECEIVE_COLOR} size={24}/></View>
          <View style={{flex:1}}><Text style={[s.roleTitle,{color:RECEIVE_COLOR}]}>Ricevi dati</Text><Text style={s.roleDescription}>Vuoi portare qui i dati presenti sull'altro dispositivo.</Text></View>
          <Ionicons name="chevron-forward" color={RECEIVE_COLOR} size={20}/>
        </TouchableOpacity>
      </View>
      <View style={s.legendRow}>
        <View style={[s.legendDevice,s.legendSend]}>
          <Ionicons name="phone-portrait-outline" color={SEND_COLOR} size={23}/>
          <Text style={[s.legendLabel,{color:SEND_COLOR}]}>INVIA</Text>
        </View>
        <View style={s.legendBridge}>
          <Ionicons name="swap-horizontal-outline" color={C.brandPrimary} size={20}/>
          <Text style={s.legendBridgeText}>QR + Wi-Fi</Text>
        </View>
        <View style={[s.legendDevice,s.legendReceive]}>
          <Ionicons name="tablet-portrait-outline" color={RECEIVE_COLOR} size={23}/>
          <Text style={[s.legendLabel,{color:RECEIVE_COLOR}]}>RICEVE</Text>
        </View>
      </View>
      <View style={s.notice}>
        <Ionicons name="shield-checkmark-outline" color="#8FDFEC" size={20}/>
        <Text style={[s.body,{flex:1}]}>Il QR collega temporaneamente i dispositivi. Il trasferimento avviene tramite Wi-Fi e i dati vengono importati solo dopo la tua conferma.</Text>
      </View>
      {!RTC_AVAILABLE && <View style={s.notice}><Text style={s.body}>Questa funzione è disponibile nella versione Web di DIABETY, tramite browser compatibile.</Text></View>}
      <Text style={s.footer}>Non serve associare i dispositivi. Durante il trasferimento mantieni DIABETY aperta su entrambi.</Text>
    </> : <>
      <View style={[s.flowCard,{backgroundColor:mode==='send'?SEND_SURFACE:RECEIVE_SURFACE,borderColor:roleColor}]}>
        <View style={s.flowTop}>
          <View style={s.roleLabel}><Ionicons name={mode === 'send' ? 'arrow-up-outline' : 'arrow-down-outline'} color={roleColor} size={16}/>
            <Text style={[s.roleLabelText,{color:roleColor}]}>{mode === 'send' ? 'QUESTO DISPOSITIVO INVIA' : 'QUESTO DISPOSITIVO RICEVE'}</Text></View>
          <TouchableOpacity accessibilityRole="button" onPress={() => { stopSession(); setMode('none'); setPrepared(null); setReceived(null); setStatus('Scegli se inviare o ricevere un backup.'); }} disabled={busy}>
            <Text style={s.changeRole}>Cambia</Text>
          </TouchableOpacity>
        </View>
        <View style={s.stepTrack}>
          {steps.map((name,index) => <View style={s.stepItem} key={`${mode}-${name}`}>
            <View style={[s.stepDot,index+1<stage && s.stepDone,index+1===stage && s.stepActive,index+1<=stage && {backgroundColor:roleColor,borderColor:roleColor}]}>
              {index+1<stage ? <Ionicons name="checkmark" size={14} color="#05161B"/> : <Text style={[s.stepNumber,index+1<=stage && {color:'#061719'}]}>{index+1}</Text>}
            </View>
            <Text numberOfLines={1} style={[s.stepLabel,index+1===stage&&s.stepLabelActive,index+1===stage&&{color:roleColor}]}>{name}</Text>
          </View>)}
        </View>
      </View>

      <View style={[s.card,{borderColor:mode==='send'?'#79512D':'#693B88'}]}>
        {mode === 'send' ? <>
          {!prepared && <>
            <GuideHeader title="Prepara i dati da inviare" description="DIABETY prepara una copia del tuo archivio. Nessun dato verrà cancellato o inviato in questa fase."/>
            <Action accent={roleColor} icon="document-text-outline" label={busy ? 'Preparazione in corso…' : 'Prepara il backup'} onPress={() => { void prepareOffer(); }} disabled={busy}/>
            {busy && <ActivityIndicator color={roleColor}/ >}
          </>}
          {prepared && !answerAccepted && !scan && !paste && <>
            <GuideHeader title="Mostra questi QR all'altro dispositivo" description="Sull'altro dispositivo scegli «Ricevi dati» e scansionali tutti, nell'ordine indicato."/>
            <View style={s.backupPill}><Ionicons name="checkmark-circle" color={C.success} size={18}/><Text style={s.body}>Backup pronto · {prepared.records} misurazioni · {Math.ceil(prepared.bytes/1024)} KB</Text></View>
            {QRPanel()}
            <View style={s.instruction}><Ionicons name="swap-horizontal-outline" color={C.brandPrimary} size={20}/>
              <Text style={[s.body,{flex:1}]}>Quando sull'altro dispositivo appare il QR di conferma, torna qui e premi il pulsante sotto.</Text></View>
            <Action accent={roleColor} label="Scansiona QR di conferma" icon="scan-outline" disabled={busy} onPress={() => { void openScanner(); }}/>
          </>}
          {prepared && !answerAccepted && (scan || paste) && <>
            <GuideHeader title="Scansiona il QR di conferma" description="Inquadra dall'iPhone, iPad o PC il codice ora mostrato sul dispositivo che riceve."/>
            {ScannerPanel()}{PastePanel()}{ScanAlternatives()}
          </>}
          {answerAccepted && !connected && !sendStarted && <>
            <GuideHeader title="Collegamento in corso" description="QR di conferma ricevuto. Tieni aperta DIABETY su entrambi i dispositivi."/>
            <ActivityIndicator color={roleColor}/>
            <Text style={s.muted}>Se non si collegano, ricomincia la procedura.</Text>
          </>}
          {(connected || sendStarted || deliveryConfirmed) && <>
            <GuideHeader title={deliveryConfirmed ? 'Backup consegnato' : sendStarted ? 'Trasferimento del backup' : 'Pronto per inviare'}
              description={deliveryConfirmed ? 'L’altro dispositivo ha ricevuto e verificato il backup. L’importazione deve essere confermata lì.' : sendStarted ? 'Lascia aperti entrambi i dispositivi fino alla conferma di ricezione.' : 'I dispositivi sono collegati. Ora puoi trasferire i dati.'}/>
            {deliveryConfirmed ? <View style={s.successInfo}><Ionicons name="checkmark-circle" color={C.success} size={25}/><Text style={[s.body,{flex:1}]}>Trasferimento verificato. Sul dispositivo ricevente apri la conferma di importazione.</Text></View>
              : !sendStarted && <Action accent={roleColor} icon="send-outline" label="Invia backup adesso" disabled={!connected || !prepared || busy} onPress={() => { void send(); }}/ >}
          </>}
        </> : <>
          {!offerAccepted && <>
            <GuideHeader title="Scansiona il QR del dispositivo che invia" description="Sull'altro dispositivo scegli «Invia dati» e «Prepara il backup». Inquadra tutti i QR che vengono mostrati."/>
            {!scan && !paste && <Action accent={roleColor} icon="scan-outline" label="Apri fotocamera e scansiona" disabled={busy} onPress={() => { void openScanner(); }}/ >}
            {ScannerPanel()}{PastePanel()}{ScanAlternatives()}
          </>}
          {offerAccepted && !connected && !received && <>
            <GuideHeader title="Mostra il QR di conferma" description="Ora usa l'altro dispositivo per scansionare questi QR. Tieni questa schermata aperta finché la connessione non sarà attiva."/>
            {QRPanel()}
          </>}
          {offerAccepted && connected && !received && <>
            <GuideHeader title="Attendi il backup" description="La connessione è pronta. Torna al dispositivo che invia e premi «Invia backup adesso». Qui il trasferimento si avvierà automaticamente."/>
            <View style={s.successInfo}><Ionicons name="link-outline" color={C.success} size={23}/><Text style={[s.body,{flex:1}]}>Dispositivi collegati. In attesa dei dati…</Text></View>
          </>}
          {received && <>
            <GuideHeader title="Backup ricevuto e verificato" description="Il trasferimento è completo, ma il backup non è stato ancora importato in DIABETY."/>
            <View style={s.successInfo}><Ionicons name="checkmark-circle" color={C.success} size={25}/>
              <Text style={[s.body,{flex:1}]}>Controllo SHA-256 superato · {receivedRecords} misurazioni ricevute</Text></View>
            <View style={s.warningInfo}><Ionicons name="alert-circle-outline" color="#FFBA73" size={22}/>
              <Text style={[s.body,{flex:1}]}>Attenzione: confermare l'importazione può sostituire i dati presenti su questo dispositivo. Se hai dati diversi, esporta prima il suo backup JSON.</Text></View>
            <Action accent={roleColor} icon="shield-checkmark-outline" label="Controlla e importa i dati" onPress={proceedImport}/>
            <Text style={s.centerMuted}>Verrai portato in Impostazioni per la conferma finale.</Text>
          </>}
        </>}
        {busy && mode === 'receive' && <ActivityIndicator color={roleColor}/ >}
        {progress && !received && <View style={s.progressBox}>
          <View style={s.progressHeading}><Text style={s.body}>{progress.status} backup</Text><Text style={[s.percent,{color:roleColor}]}>{percent}%</Text></View>
          <View style={s.progressTrack}><View style={[s.progressFill,{backgroundColor:roleColor,width: `${percent}%` as `${number}%`}]}/></View>
          <Text style={s.muted}>{Math.ceil(progress.current/1024)} / {Math.ceil(progress.total/1024)} KB</Text>
        </View>}
        <View style={[s.status, isError && s.errorStatus]}>
          <Ionicons name={isError ? 'alert-circle-outline' : connected ? 'checkmark-circle-outline' : 'information-circle-outline'}
            color={isError ? '#FF8B8B' : connected ? C.success : '#8BD6E3'} size={19}/>
          <Text style={[s.statusText,{flex:1}]}>{status}</Text>
        </View>
      </View>
      <View style={s.bottomActions}>
        <Action icon="close-circle-outline" subtle label="Interrompi e torna all'inizio" disabled={busy}
          onPress={() => { stopSession(); setMode('none'); setPrepared(null); setReceived(null); setStatus('Procedura interrotta. Nessun dato importato.'); }}/>
      </View>
      <Text style={s.footer}>Nessuna associazione permanente. La copia viene importata soltanto dopo la conferma in Impostazioni.</Text>
    </>}
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: {flex:1, backgroundColor:C.background},
  content: {width:'100%',maxWidth:720,alignSelf:'center',padding:14,paddingBottom:90,gap:14},
  hero: {flexDirection:'row',gap:12,alignItems:'center',borderWidth:1,borderColor:'#28556A',borderRadius:16,backgroundColor:'#101B28',padding:15},
  accent: {width:3,height:48,borderRadius:4,backgroundColor:C.brandPrimary},
  title: {fontSize:21,fontWeight:'800',color:C.onSurface,flexShrink:1},
  section: {fontSize:17,fontWeight:'800',color:C.onSurface},
  body: {color:'#E2EBF1',fontSize:13,lineHeight:20},
  muted: {color:'#9CA9B8',fontSize:12,lineHeight:19},
  guideText: {fontSize:13,color:'#B8C6D2',lineHeight:21},
  introCard: {borderWidth:1,borderColor:'#2B4553',backgroundColor:'#111A22',borderRadius:18,padding:16,gap:13},
  roleCard: {flexDirection:'row',alignItems:'center',gap:13,padding:14,borderWidth:1,borderRadius:14,minHeight:82},
  roleCardSend: {borderColor:SEND_COLOR,backgroundColor:'#2B2016'},
  roleCardReceive: {borderColor:RECEIVE_COLOR,backgroundColor:'#281C37'},
  roleIcon: {width:46,height:46,borderRadius:13,alignItems:'center',justifyContent:'center'},
  roleIconSend: {backgroundColor:'#493019'},
  roleIconReceive: {backgroundColor:'#402555'},
  roleTitle: {color:C.onSurface,fontWeight:'800',fontSize:16,marginBottom:3},
  roleDescription: {color:'#AEC2CD',fontSize:12,lineHeight:18},
  legendRow: {flexDirection:'row',alignItems:'center',gap:9,backgroundColor:'#131D25',padding:11,borderRadius:14},
  legendDevice: {flex:1,alignItems:'center',justifyContent:'center',gap:5,borderRadius:11,paddingVertical:13},
  legendSend: {backgroundColor:'#2B2016'},
  legendReceive: {backgroundColor:'#281C37'},
  legendLabel: {fontSize:12,fontWeight:'800'},
  legendBridge: {alignItems:'center',gap:4},
  legendBridgeText: {fontSize:10,color:'#A5B8C5'},
  notice: {borderWidth:1,borderColor:'#2B687A',backgroundColor:'#112833',borderRadius:13,padding:13,flexDirection:'row',gap:10},
  flowCard: {backgroundColor:'#111922',borderWidth:1,borderColor:'#284754',borderRadius:16,padding:14,gap:14},
  flowTop: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  roleLabel: {flexDirection:'row',alignItems:'center',gap:6},
  roleLabelText: {fontSize:11,fontWeight:'800',color:'#9EEBFA',letterSpacing:0.4},
  changeRole: {color:C.brandPrimary,fontSize:12,fontWeight:'700',padding:5},
  stepTrack: {flexDirection:'row',gap:4,justifyContent:'space-between'},
  stepItem: {flex:1,alignItems:'center',gap:5},
  stepDot: {width:29,height:29,borderRadius:15,backgroundColor:'#25343E',borderWidth:1,borderColor:'#355260',alignItems:'center',justifyContent:'center'},
  stepDone: {backgroundColor:'#87CDB8',borderColor:'#87CDB8'},
  stepActive: {backgroundColor:C.brandPrimary,borderColor:C.brandPrimary},
  stepNumber: {fontSize:12,fontWeight:'800',color:'#ABB8C0'},
  stepLabel: {color:'#94A6B0',fontSize:10,fontWeight:'600',textAlign:'center'},
  stepLabelActive: {color:'#E0F7FC',fontWeight:'800'},
  card: {borderWidth:1,borderColor:'#2B5461',backgroundColor:C.surfaceSecondary,borderRadius:17,padding:15,gap:14},
  stepHeader: {gap:6,marginBottom:2},
  currentStep: {fontSize:11,fontWeight:'800',letterSpacing:1.2,color:C.brandPrimary},
  stepTitle: {fontSize:19,fontWeight:'800',color:C.onSurface,lineHeight:26},
  action: {flexDirection:'row',alignItems:'center',justifyContent:'center',minHeight:49,backgroundColor:C.brandPrimary,padding:13,gap:9,borderRadius:12},
  actionText: {color:'#071016',fontSize:14,fontWeight:'800',textAlign:'center',flexShrink:1},
  subtle: {backgroundColor:'#0E2731',borderWidth:1,borderColor:'#296071'},
  subtleText: {color:C.brandPrimary},
  disabled: {opacity:0.45},
  qrPanel: {alignItems:'center',gap:11,marginTop:4},
  qrArea: {backgroundColor:'#FFFFFF',padding:12,borderRadius:14,alignSelf:'center',borderWidth:3},
  qrCounter: {fontSize:12,fontWeight:'800',color:'#D7F6FD'},
  centerMuted: {fontSize:12,color:'#A7BAC7',lineHeight:19,textAlign:'center'},
  inline: {flexDirection:'row',gap:8,alignSelf:'stretch'},
  small: {flexDirection:'row',justifyContent:'center',alignItems:'center',gap:5,backgroundColor:'#123540',borderColor:'#286378',borderWidth:1,paddingVertical:11,paddingHorizontal:12,borderRadius:10,flex:1},
  smallText: {color:'#B7F1FF',fontWeight:'700',fontSize:12},
  textButton: {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,padding:7},
  linkText: {color:C.brandPrimary,fontSize:12,fontWeight:'700',textAlign:'center'},
  code: {color:'#CFDCE4',fontSize:11,backgroundColor:'#09151F',padding:12,borderRadius:10},
  cameraFrame: {height:290,borderWidth:1,borderColor:C.brandPrimary,borderRadius:13,overflow:'hidden'},
  scanPanel: {gap:12},
  softInfo: {backgroundColor:'#12313A',borderWidth:1,borderColor:'#2D6270',padding:12,borderRadius:10,flexDirection:'row',gap:8,alignItems:'center'},
  input: {color:C.onSurface,borderWidth:1,borderColor:C.borderGlassBright,backgroundColor:'#080F19',minHeight:100,borderRadius:9,padding:12},
  backupPill: {backgroundColor:'#113025',borderWidth:1,borderColor:'#2B644D',borderRadius:10,padding:11,flexDirection:'row',gap:8,alignItems:'center'},
  instruction: {flexDirection:'row',gap:9,padding:12,borderRadius:11,backgroundColor:'#102833',borderWidth:1,borderColor:'#255666',alignItems:'center'},
  successInfo: {flexDirection:'row',gap:10,alignItems:'center',backgroundColor:'#113126',borderWidth:1,borderColor:'#2B7556',padding:13,borderRadius:11},
  warningInfo: {flexDirection:'row',gap:10,alignItems:'flex-start',backgroundColor:'#30251C',borderWidth:1,borderColor:'#705239',padding:12,borderRadius:11},
  progressBox: {gap:8},
  progressHeading: {flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  percent: {color:C.brandPrimary,fontSize:16,fontWeight:'800'},
  progressTrack: {height:9,backgroundColor:'#23404A',borderRadius:8,overflow:'hidden'},
  progressFill: {height:9,backgroundColor:C.brandPrimary,borderRadius:8},
  status: {flexDirection:'row',alignItems:'flex-start',gap:9,padding:11,backgroundColor:'#11232D',borderRadius:10},
  errorStatus: {backgroundColor:'#3A2225',borderWidth:1,borderColor:'#8B4149'},
  statusText: {fontSize:12,color:'#C7D7E1',lineHeight:19},
  bottomActions: {paddingHorizontal:2},
  footer: {color:'#8899AA',fontSize:12,lineHeight:20,textAlign:'center'},
});
