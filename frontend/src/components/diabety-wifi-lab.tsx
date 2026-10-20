/**
 * DIABETY · FASE 2 — laboratorio WebRTC LAN, completamente isolato.
 * NESSUNA lettura/scrittura AsyncStorage; NESSUN dato medico; NESSUN servizio remoto.
 * Lo scambio SDP/ICE avviene SOLO tramite QR (o copia manuale del codice).
 * FASE 3A: monitoraggio automatico durante la sessione, senza dati sanitari.
 * NON implementa la scoperta automatica o la riconnessione DOPO la chiusura del browser.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, useWindowDimensions, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DIABETY_COLORS as C } from '@/src/theme/diabety';
import { awaitLocalCandidates, createQrParts, decodeLanSignal, encodeLanSignal, newLanId, QrPartCollector, type LanSignal } from '@/src/services/qr-lan-test';

type LabRole = 'nessuno' | 'main' | 'associato';
type LabPeer = { id: string; name: string };
type LabProps = { role: LabRole; deviceId: string; mainId: string | null; linkedDevices: LabPeer[] };
type TestMessage = { lab: 'DIABETY_PING'; kind: 'ping' | 'pong'; sessionId: string; nonce: string; from: string };

function LabButton({ title, onPress, outline = false, disabled = false, icon }: {
  title: string; onPress: () => void; outline?: boolean; disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.button, outline && s.buttonOutline, disabled && s.disabled]}>
    {icon ? <Ionicons name={icon} size={18} color={outline ? C.brandPrimary : '#081118'} /> : null}
    <Text style={[s.buttonText, outline && s.buttonOutlineText]}>{title}</Text>
  </TouchableOpacity>;
}

export function DiabetyWifiLab({ role, deviceId, mainId, linkedDevices }: LabProps) {
  const [available, setAvailable] = useState(false);
  const [targetId, setTargetId] = useState(linkedDevices[0]?.id || '');
  const [status, setStatus] = useState('Test non avviato.');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [qrParts, setQrParts] = useState<string[]>([]);
  const [qrPage, setQrPage] = useState(0);
  const [showText, setShowText] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [scanProgress, setScanProgress] = useState('');
  const [connected, setConnected] = useState(false);
  const [pingPassed, setPingPassed] = useState(false);
  const [lastPing, setLastPing] = useState('');
  const [pingCount, setPingCount] = useState(0);
  const [lastRoundTripMs, setLastRoundTripMs] = useState<number | null>(null);
  const [resumedCount, setResumedCount] = useState(0);
  const [connectionPhase, setConnectionPhase] = useState('Non connesso');
  const [monitorStatus, setMonitorStatus] = useState('Monitoraggio in attesa di una sessione WebRTC.');
  const [permission, askPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>(Platform.OS === 'web' ? 'front' : 'back');
  const [cameraStatus, setCameraStatus] = useState('');
  const [cameraCheckQr, setCameraCheckQr] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const qrSize = Math.min(340, Math.max(210, windowWidth - 100));
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const sessionRef = useRef<string | null>(null);
  const remoteIdRef = useRef<string | null>(null);
  const pendingPingRef = useRef<string | null>(null);
  const pingTimeRef = useRef<number>(0);
  const pingIsAutomaticRef = useRef(false);
  const wasInterruptedRef = useRef(false);
  const scanBusyRef = useRef(false);
  const collectorRef = useRef(new QrPartCollector());
  const aliveRef = useRef(true);

  useEffect(() => {
    setAvailable(Platform.OS === 'web' && typeof RTCPeerConnection !== 'undefined' &&
      typeof globalThis.crypto?.getRandomValues === 'function');
  }, []);

  const closeConnection = useCallback(() => {
    pendingPingRef.current = null;
    pingIsAutomaticRef.current = false;
    wasInterruptedRef.current = false;
    sessionRef.current = null;
    remoteIdRef.current = null;
    collectorRef.current.reset();
    try { channelRef.current?.close(); } catch { /* ignore */ }
    try { pcRef.current?.close(); } catch { /* ignore */ }
    channelRef.current = null;
    pcRef.current = null;
    if (aliveRef.current) {
      setConnected(false);
      setPingPassed(false);
      setLastPing('');
      setPingCount(0);
      setLastRoundTripMs(null);
      setResumedCount(0);
      setConnectionPhase('Non connesso');
      setMonitorStatus('Monitoraggio in attesa di una sessione WebRTC.');
      setScanProgress('');
      setCameraStatus('');
      setCameraCheckQr(false);
      setCode('');
      setQrParts([]);
      setQrPage(0);
      setScanner(false);
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; closeConnection(); };
  }, [closeConnection]);

  const sendPing = useCallback((automatic = false) => {
    if (!channelRef.current || channelRef.current.readyState !== 'open' || !sessionRef.current) {
      if (!automatic) setStatus('Il canale non è aperto. Completa lo scambio dei QR e riprova.');
      return;
    }
    // Un solo ping in volo: i controlli periodici non sovrascrivono un test manuale.
    if (pendingPingRef.current) return;
    try {
      const nonce = newLanId();
      pendingPingRef.current = nonce;
      pingIsAutomaticRef.current = automatic;
      pingTimeRef.current = Date.now();
      const packet: TestMessage = { lab: 'DIABETY_PING', kind: 'ping', sessionId: sessionRef.current, nonce, from: deviceId };
      channelRef.current.send(JSON.stringify(packet));
      if (!automatic) {
        setPingPassed(false);
        setStatus('Messaggio di prova inviato. Attesa della risposta dall’altro dispositivo…');
      }
      setMonitorStatus(automatic ? 'Controllo periodico in corso…' : 'Verifica manuale in corso…');
    } catch {
      pendingPingRef.current = null;
      if (!automatic) setStatus('Impossibile inviare il messaggio di prova.');
      setMonitorStatus('Invio del controllo non riuscito.');
    }
  }, [deviceId]);

  const configureChannel = useCallback((channel: RTCDataChannel) => {
    channelRef.current = channel;
    channel.onopen = () => {
      if (!aliveRef.current) return;
      setConnected(true);
      setConnectionPhase('Canale dati aperto');
      setMonitorStatus('Monitoraggio automatico attivo finché la pagina resta aperta.');
      setStatus(role === 'main'
        ? 'Canale diretto aperto. Invio del messaggio di prova…'
        : 'Canale diretto aperto. Attesa del messaggio di prova dal MAIN…');
      if (role === 'main') sendPing();
    };
    channel.onclose = () => {
      if (!aliveRef.current) return;
      setConnected(false);
      setPingPassed(false);
      setConnectionPhase('Canale chiuso');
      setMonitorStatus('Sessione terminata: non è possibile riaprire automaticamente il canale chiuso senza una nuova segnalazione.');
      setStatus('Canale chiuso. Per riconnetterti occorre una nuova sessione e un nuovo scambio QR.');
    };
    channel.onerror = () => { if (aliveRef.current) setStatus('Errore del canale diretto WebRTC.'); };
    channel.onmessage = (event) => {
      if (typeof event.data !== 'string' || event.data.length > 1024) return;
      let payload: Partial<TestMessage>;
      try { payload = JSON.parse(event.data) as Partial<TestMessage>; } catch { return; }
      if (payload.lab !== 'DIABETY_PING' || payload.sessionId !== sessionRef.current ||
        payload.from !== remoteIdRef.current || typeof payload.nonce !== 'string' ||
        !/^[0-9a-f]{32}$/.test(payload.nonce)) return;
      if (payload.kind === 'ping' && role === 'associato' && channel.readyState === 'open') {
        const answer: TestMessage = { lab: 'DIABETY_PING', kind: 'pong', sessionId: sessionRef.current!, nonce: payload.nonce, from: deviceId };
        channel.send(JSON.stringify(answer));
        setPingPassed(true);
        setLastPing(new Date().toLocaleTimeString('it-IT'));
        setPingCount(n => n + 1);
        setMonitorStatus('Messaggio ricevuto e risposta inviata automaticamente.');
        setStatus('MESSAGGIO RICEVUTO E RISPOSTA INVIATA. Comunicazione diretta verificata su questo dispositivo.');
      } else if (payload.kind === 'pong' && role === 'main' && pendingPingRef.current === payload.nonce) {
        const wasAutomatic = pingIsAutomaticRef.current;
        pendingPingRef.current = null;
        setPingPassed(true);
        setLastPing(new Date().toLocaleTimeString('it-IT'));
        setPingCount(n => n + 1);
        const elapsed = Date.now() - pingTimeRef.current;
        setLastRoundTripMs(elapsed);
        setMonitorStatus(`Ultimo controllo riuscito: ${elapsed} ms. Il collegamento risponde.`);
        if (!wasAutomatic) setStatus(`TEST SUPERATO. Risposta ricevuta dal dispositivo associato (${elapsed} ms).`);
      }
    };
  }, [deviceId, role, sendPing]);

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // iceServers VUOTO: nessun server STUN/TURN e nessun traffico via relay.
    const pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle' });
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      if (!aliveRef.current || pcRef.current !== pc) return;
      const state = pc.connectionState;
      setConnectionPhase(state === 'connected' ? 'WebRTC connesso' : `WebRTC: ${state}`);
      if (state === 'failed') {
        pendingPingRef.current = null;
        wasInterruptedRef.current = true;
        setConnected(false);
        setPingPassed(false);
        setMonitorStatus('Connessione fallita: servono nuove informazioni ICE, non disponibili senza segnalazione.');
        setStatus('Connessione non riuscita. Per un nuovo tentativo ripeti offerta e risposta QR.');
      } else if (state === 'disconnected') {
        pendingPingRef.current = null;
        wasInterruptedRef.current = true;
        setConnected(false);
        setPingPassed(false);
        setMonitorStatus('Interruzione rilevata. Verifica se WebRTC riprende spontaneamente.');
        setStatus('Collegamento temporaneamente interrotto. Il browser potrebbe ristabilirlo senza nuovi QR.');
      } else if (state === 'connected') {
        setConnected(true);
        if (wasInterruptedRef.current) {
          wasInterruptedRef.current = false;
          setResumedCount(count => count + 1);
          setMonitorStatus('Connessione ripristinata durante la sessione: verifica automatica in corso.');
          if (role === 'main') sendPing(true);
        }
      }
    };
    return pc;
  }, [role, sendPing]);

  // FASE 3A: verifiche periodiche in una sessione ancora aperta.
  // Non crea nuovi canali e NON scopre dispositivi dopo che Safari/Chrome sono stati chiusi.
  useEffect(() => {
    if (Platform.OS !== 'web' || !available || role !== 'main') return;
    const checkAlive = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const pc = pcRef.current, channel = channelRef.current;
      if (!pc || pc.connectionState !== 'connected' || !channel || channel.readyState !== 'open') return;
      if (pendingPingRef.current && Date.now() - pingTimeRef.current > 12000) {
        pendingPingRef.current = null;
        setPingPassed(false);
        setMonitorStatus('Controllo senza risposta entro 12 secondi. Riproverò se il canale è ancora aperto.');
        return;
      }
      sendPing(true);
    };
    const interval = setInterval(checkAlive, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkAlive();
    };
    const onFocus = () => checkAlive();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [available, role, sendPing]);

  const showSignalCode = useCallback(async (signal: LanSignal) => {
    const encoded = await encodeLanSignal(signal);
    const parts = createQrParts(encoded, newLanId());
    setCode(encoded);
    setQrParts(parts);
    setQrPage(0);
    setCameraCheckQr(false);
    setShowText(false);
    setScanner(false);
    setPasting(false);
    return parts.length;
  }, []);

  const startOffer = async () => {
    if (role !== 'main' || !linkedDevices.some(p => p.id === targetId)) {
      setStatus('Scegli prima un dispositivo già registrato tramite QR.');
      return;
    }
    closeConnection();
    setBusy(true);
    setStatus('Preparazione connessione diretta e raccolta indirizzi locali ICE…');
    try {
      const pc = createPeerConnection();
      const session = newLanId();
      sessionRef.current = session;
      remoteIdRef.current = targetId;
      const channel = pc.createDataChannel('diabety-lan-ping', { ordered: true });
      configureChannel(channel);
      await pc.setLocalDescription(await pc.createOffer());
      const complete = await awaitLocalCandidates(pc);
      if (!complete) throw new Error('Raccolta ICE scaduta: il browser non ha preparato la connessione locale.');
      const sdp = pc.localDescription?.sdp || '';
      if (!sdp.includes('a=candidate:')) throw new Error('Nessun indirizzo ICE locale disponibile. Controlla permessi o browser.');
      const parts = await showSignalCode({ app: 'DIABETY_LAN_LAB', version: 2, kind: 'offer',
        sessionId: session, mainId: deviceId, peerId: targetId, sdp });
      setStatus(`Offerta pronta (${parts} QR). Sul dispositivo associato premi «Leggi offerta del MAIN».`);
    } catch (error) {
      closeConnection();
      setStatus(`Impossibile creare l’offerta: ${error instanceof Error ? error.message : 'errore sconosciuto'}`);
    } finally { setBusy(false); }
  };

  const acceptOffer = async (signal: LanSignal) => {
    if (role !== 'associato' || signal.kind !== 'offer' || mainId !== signal.mainId || signal.peerId !== deviceId) {
      throw new Error('L’offerta non è destinata a questo dispositivo associato.');
    }
    closeConnection();
    setBusy(true);
    setStatus('Offerta valida. Creazione della risposta diretta…');
    try {
      const pc = createPeerConnection();
      sessionRef.current = signal.sessionId;
      remoteIdRef.current = signal.mainId;
      pc.ondatachannel = event => configureChannel(event.channel);
      await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      const complete = await awaitLocalCandidates(pc);
      if (!complete) throw new Error('Raccolta ICE scaduta.');
      const sdp = pc.localDescription?.sdp || '';
      if (!sdp.includes('a=candidate:')) throw new Error('Nessun candidato di rete locale disponibile.');
      const parts = await showSignalCode({ app: 'DIABETY_LAN_LAB', version: 2, kind: 'answer',
        sessionId: signal.sessionId, mainId: signal.mainId, peerId: deviceId, sdp });
      setStatus(`Risposta pronta (${parts} QR). Fai scansionare questi QR al MAIN.`);
    } catch (error) {
      closeConnection();
      throw error;
    } finally { setBusy(false); }
  };

  const acceptAnswer = async (signal: LanSignal) => {
    if (role !== 'main' || signal.kind !== 'answer' || signal.mainId !== deviceId ||
      signal.sessionId !== sessionRef.current || signal.peerId !== remoteIdRef.current || !pcRef.current) {
      throw new Error('Risposta non corrispondente all’offerta attiva del MAIN.');
    }
    await pcRef.current.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
    setScanner(false);
    setPasting(false);
    setStatus('Risposta accettata. Attesa apertura canale diretto…');
  };

  const receive = async (raw: string) => {
    const progress = collectorRef.current.accept(raw);
    if (!progress.code) {
      setScanProgress(`QR raccolti: ${progress.count}/${progress.total}. Passa al successivo sul dispositivo che mostra il codice.`);
      return;
    }
    setScanProgress('QR completi: verifica informazioni di collegamento…');
    const signal = await decodeLanSignal(progress.code);
    setScanner(false);
    if (role === 'associato') await acceptOffer(signal);
    else if (role === 'main') await acceptAnswer(signal);
    else throw new Error('Prima configura un dispositivo come MAIN o associato.');
  };

  const onCodeRead = async (data: string) => {
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    setCameraStatus('Codice rilevato. Verifica del contenuto…');
    try {
      if (data.startsWith('DWL2CHECK|')) {
        setCameraStatus('TEST WEBCAM SUPERATO: il QR semplice è stato letto. Ora mostra sul MAIN i QR tecnici dell’offerta.');
        return;
      }
      await receive(data);
    }
    catch (error) {
      setStatus(`Errore lettura/connessione: ${error instanceof Error ? error.message : 'codice non valido'}`);
      setScanner(false);
    } finally { scanBusyRef.current = false; }
  };

  const openCamera = async () => {
    collectorRef.current.reset();
    setScanProgress('');
    setCameraStatus('Richiesta accesso alla fotocamera…');
    setPasting(false);
    if (!permission?.granted) {
      let grant;
      try { grant = await askPermission(); }
      catch { setCameraStatus('Impossibile richiedere l’accesso alla fotocamera.'); setPasting(true); return; }
      if (!grant.granted) {
        setStatus('Permesso fotocamera negato/non disponibile nel browser. In Chrome controlla l’icona fotocamera nella barra degli indirizzi.');
        setCameraStatus('Fotocamera non autorizzata.');
        setPasting(true);
        return;
      }
    }
    setCameraStatus('Apertura fotocamera…');
    setScanner(true);
  };

  const isMain = role === 'main';
  const cameraCheckValue = `DWL2CHECK|${deviceId.slice(0, 12)}`;
  const canTest = isMain ? linkedDevices.length > 0 : role === 'associato' && !!mainId;
  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="wifi-outline" size={21} color={C.brandPrimary} />
        <View style={{ flex: 1 }}><Text style={s.heading}>Test comunicazione Wi-Fi · Fase 2</Text>
          <Text style={s.muted}>Scambio diretto di messaggi con WebRTC, senza cloud.</Text></View>
      </View>
      <View style={s.notice}>
        <Text style={s.noticeText}>Laboratorio indipendente: NON legge dati sanitari. Il collegamento richiede due QR tecnici (offerta e risposta), eventualmente suddivisi in più parti. Non è ancora prevista la riconnessione automatica alla riapertura.</Text>
      </View>
      {!available && <Text style={s.error}>WebRTC non disponibile in questo ambiente. Apri DIABETY via HTTPS in Safari/Chrome: il test non è ancora predisposto per l’app nativa Expo.</Text>}
      {role === 'nessuno' && <Text style={s.muted}>Prima completa l’associazione nella sezione QR qui sopra.</Text>}
      {isMain && linkedDevices.length > 0 && (
        <View style={s.stack}>
          <Text style={s.label}>Dispositivo associato da verificare</Text>
          {linkedDevices.map(peer => (
            <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: targetId === peer.id }}
              key={peer.id} onPress={() => { setTargetId(peer.id); closeConnection(); setStatus('Dispositivo selezionato.'); }}
              style={[s.peerOption, targetId === peer.id && s.peerSelected]}>
              <Ionicons name={targetId === peer.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={C.brandPrimary} />
              <Text style={s.text}>{peer.name} · {peer.id.slice(0, 8)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {available && canTest && (
        <View style={s.stack}>
          {isMain ? (
            <>
              <Text style={s.body}>1. Sul MAIN genera l’offerta e mostra tutti i QR sul dispositivo associato.</Text>
              <LabButton icon="qr-code-outline" title="1 · Genera offerta dal MAIN" disabled={busy} onPress={() => { void startOffer(); }} />
              <Text style={s.body}>2. Dopo che l’altro dispositivo ha preparato la risposta, leggila qui.</Text>
              <LabButton icon="scan-outline" title="3 · Leggi risposta dell’associato" outline disabled={busy || !sessionRef.current} onPress={() => { void openCamera(); }} />
            </>
          ) : (
            <>
              <Text style={s.body}>1. Sul MAIN genera l’offerta. Da questo dispositivo associato leggi tutti i QR.</Text>
              <LabButton icon="scan-outline" title="2 · Leggi offerta del MAIN" disabled={busy} onPress={() => { void openCamera(); }} />
              <Text style={s.muted}>Sul PC serve una webcam: premendo questo pulsante deve comparire l’anteprima video. Senza webcam utilizza «Incolla codice completo».</Text>
              <Text style={s.body}>2. Al termine DIABETY mostrerà i QR di risposta da far leggere al MAIN.</Text>
            </>
          )}
        </View>
      )}
      {busy && <View style={s.horiz}><ActivityIndicator color={C.brandPrimary} /><Text style={s.muted}>Elaborazione locale…</Text></View>}
      {qrParts.length > 0 && (
        <View style={s.stack}>
          <Text style={s.label}>{isMain ? 'QR offerta del MAIN' : 'QR risposta dell’associato'}</Text>
          {isMain && <LabButton outline icon="camera-outline"
            title={cameraCheckQr ? 'Torna ai QR dell’offerta' : 'Mostra QR semplice per verificare la webcam del PC'}
            onPress={() => setCameraCheckQr(p => !p)} />}
          <View style={s.qrBox}>
            <QRCode value={cameraCheckQr ? cameraCheckValue : qrParts[qrPage]}
              size={cameraCheckQr ? Math.min(qrSize, 220) : qrSize} ecl="L" backgroundColor="#fff" color="#111" />
          </View>
          <Text style={[s.label, { textAlign: 'center' }]}>{cameraCheckQr ? 'QR DIAGNOSTICO: non avvia la connessione' : `QR ${qrPage + 1} di ${qrParts.length}`}</Text>
          {cameraCheckQr && <Text style={s.muted}>Mostra questo QR al PC mentre lo scanner è aperto. Se appare «TEST WEBCAM SUPERATO», torna ai QR dell’offerta.</Text>}
          {!cameraCheckQr && qrParts.length > 1 && <View style={s.horiz}>
            <TouchableOpacity accessibilityRole="button" style={[s.navButton, qrPage === 0 && s.disabled]} disabled={qrPage === 0} onPress={() => setQrPage(p => Math.max(0, p - 1))}><Text style={s.navText}>← Precedente</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[s.navButton, qrPage === qrParts.length - 1 && s.disabled]} disabled={qrPage === qrParts.length - 1} onPress={() => setQrPage(p => Math.min(qrParts.length - 1, p + 1))}><Text style={s.navText}>Successivo →</Text></TouchableOpacity>
          </View>}
          <LabButton icon="document-text-outline" outline title={showText ? 'Nascondi codice completo' : 'Mostra codice completo (alternativa QR)'} onPress={() => setShowText(p => !p)} />
          {showText && <Text selectable style={s.raw}>{code}</Text>}
        </View>
      )}
      {scanner && <View style={s.stack}>
        <Text style={s.label}>Inquadra il QR Wi-Fi</Text>
        <View style={s.cameraBox}>
          <CameraView style={s.camera} facing={cameraFacing} barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onCameraReady={() => setCameraStatus('Fotocamera avviata. Inquadra un QR nitido, ben illuminato, completamente visibile.')}
            onMountError={event => setCameraStatus(`Errore apertura fotocamera: ${event.message}`)}
            onBarcodeScanned={({ data }) => { void onCodeRead(data); }} />
        </View>
        <Text style={s.cameraStatus}>{cameraStatus}</Text>
        <LabButton title={`Cambia fotocamera (${cameraFacing === 'front' ? 'anteriore' : 'posteriore'})`} outline
          onPress={() => { setCameraFacing(p => p === 'front' ? 'back' : 'front'); setCameraStatus('Cambio fotocamera in corso…'); }} />
        {!!scanProgress && <Text style={s.muted}>{scanProgress}</Text>}
        <Text style={s.muted}>Per sequenze di più QR, fai avanzare sullo schermo dell’altro dispositivo e inquadra ciascuna parte.</Text>
        <LabButton title="Chiudi scanner" outline onPress={() => setScanner(false)} />
        <LabButton title="Incolla codice completo" outline onPress={() => { setScanner(false); setPasting(true); }} />
      </View>}
      {!scanner && available && canTest && <LabButton icon="clipboard-outline" title={pasting ? 'Nascondi inserimento manuale' : 'Incolla codice completo (senza fotocamera)'} outline onPress={() => setPasting(!pasting)} />}
      {pasting && <View style={s.stack}>
        <Text style={s.muted}>Alternativa alla scansione: copia il testo completo dal dispositivo che genera i QR. Non utilizza Internet, ma il codice deve essere trasferito materialmente tra dispositivi.</Text>
        <TextInput accessibilityLabel="Codice WebRTC completo" multiline value={pasteText} onChangeText={setPasteText}
          style={[s.input, { minHeight: 95 }]} placeholder="DWL2:…" placeholderTextColor="#8A98A3" autoCapitalize="none" />
        <LabButton title="Elabora codice" disabled={!pasteText.trim() || busy} onPress={() => { void onCodeRead(pasteText); }} />
      </View>}
      <View style={s.statusBox}>
        <Text style={s.label}>Stato del collegamento</Text>
        <Text style={s.status}>{status}</Text>
        <View style={s.horiz}>
          <Ionicons name={pingPassed ? 'checkmark-circle' : connected ? 'radio-button-on-outline' : 'ellipse-outline'}
            color={pingPassed ? C.success : connected ? C.brandPrimary : C.muted} size={18} />
          <Text style={s.muted}>{pingPassed ? `Messaggio verificato alle ${lastPing}` : connected ? 'Canale aperto — prova in corso' : 'Nessuna prova completata'}</Text>
        </View>
      </View>
      {isMain && connected && <LabButton icon="send-outline" title="Invia un nuovo messaggio di prova" onPress={() => sendPing(false)} />}
      {pcRef.current && <LabButton icon="close-circle-outline" title="Termina test e chiudi connessione" outline onPress={() => { closeConnection(); setStatus('Test terminato.'); }} />}
      <View style={s.phase3Card}>
        <View style={s.header}>
          <Ionicons name="pulse-outline" size={19} color={C.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>STEP 3A · Continuità della sessione</Text>
            <Text style={s.muted}>Controllo automatico ogni 15 secondi mentre il canale WebRTC è attivo.</Text>
          </View>
        </View>
        <Text style={s.body}>Stato: {connectionPhase}</Text>
        <Text style={s.body}>Risposte di prova: {pingCount} · Riprese osservate: {resumedCount}</Text>
        <Text style={s.body}>Ultimo controllo: {lastPing || 'nessuno'}{lastRoundTripMs === null ? '' : ` · ${lastRoundTripMs} ms`}</Text>
        <Text style={s.cameraStatus}>{monitorStatus}</Text>
        <Text style={s.muted}>Prova: completa il collegamento QR, lascia entrambe le pagine aperte e verifica che il numero di risposte aumenti. Poi cambia scheda e torna nell'app. Se la connessione di rete si interrompe brevemente, osserva se riprende spontaneamente.</Text>
        <View style={s.notice}>
          <Text style={s.noticeText}>WIFI-002B (chiusura completa): NON disponibile senza un nuovo scambio di segnalazione. La rete Wi-Fi comune e l'associazione memorizzata, da sole, non consentono a Safari e Chrome di ricreare un canale WebRTC alla riapertura.</Text>
        </View>
      </View>
      <Text style={s.footer}>Laboratorio: non invia dati medici, non effettua sincronizzazione né scoperta automatica tra dispositivi. La continuità è sperimentale e vale solo per una connessione ancora recuperabile dal browser.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.borderGlassBright, borderRadius: 16, padding: 15, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  heading: { color: C.onSurface, fontWeight: '700', fontSize: 16 },
  muted: { color: '#A1ADB8', fontSize: 12, lineHeight: 18 },
  notice: { borderRadius: 10, backgroundColor: '#1E1A0F', borderWidth: 1, borderColor: '#665029', padding: 10 },
  noticeText: { color: '#FFDEA9', fontSize: 12, lineHeight: 18 },
  error: { color: '#FFC3BC', lineHeight: 18, fontSize: 12 },
  label: { color: '#D6EDF4', fontSize: 13, fontWeight: '700' },
  body: { color: '#D8E5EC', fontSize: 13, lineHeight: 20 },
  text: { color: '#D8E5EC', fontSize: 13, flex: 1 },
  stack: { gap: 10 },
  horiz: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  button: { backgroundColor: C.brandPrimary, borderRadius: 10, minHeight: 44, paddingHorizontal: 10, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonText: { color: '#081118', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  buttonOutline: { backgroundColor: '#0C2732', borderWidth: 1, borderColor: '#286779' },
  buttonOutlineText: { color: C.brandPrimary },
  disabled: { opacity: 0.4 },
  peerOption: { backgroundColor: '#071921', flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderWidth: 1, borderColor: '#203B47', borderRadius: 10 },
  peerSelected: { borderColor: C.brandPrimary },
  qrBox: { backgroundColor: '#FFFFFF', alignSelf: 'center', padding: 14, borderRadius: 12 },
  cameraStatus: { color: '#BEEFFA', fontSize: 12, lineHeight: 19 },
  navButton: { flex: 1, alignItems: 'center', backgroundColor: '#0E2D38', padding: 12, borderRadius: 9 },
  navText: { color: '#D0F4FB', fontSize: 12, fontWeight: '700' },
  raw: { backgroundColor: '#07141C', padding: 10, borderRadius: 9, fontSize: 11, color: '#BCD0DC', lineHeight: 16 },
  cameraBox: { height: 280, borderRadius: 12, borderWidth: 1, borderColor: C.brandPrimary, overflow: 'hidden' },
  camera: { flex: 1 },
  input: { backgroundColor: '#090D15', borderColor: '#23586A', borderWidth: 1, padding: 12, borderRadius: 10, color: C.onSurface, fontSize: 12, textAlignVertical: 'top' },
  statusBox: { backgroundColor: '#0B1E28', borderRadius: 10, padding: 12, gap: 7, borderWidth: 1, borderColor: '#284C60' },
  status: { color: '#BEEFFA', fontSize: 13, lineHeight: 20 },
  phase3Card: { backgroundColor: '#091B23', borderColor: '#245463', borderWidth: 1, padding: 12, borderRadius: 12, gap: 9 },
  footer: { color: '#96A5B0', fontSize: 11, lineHeight: 18 },
});
