/**
 * DIABETY · FASE 2 — laboratorio WebRTC LAN, completamente isolato.
 * NESSUNA lettura/scrittura AsyncStorage; NESSUN dato medico; NESSUN servizio remoto.
 * Lo scambio SDP/ICE avviene SOLO tramite QR (o copia manuale del codice).
 * FASE 3A: monitoraggio automatico durante la sessione, senza dati sanitari.
 * FASE 3B: diagnosi lifecycle/background su Web App, solo dati tecnici locali.
 * FASE 4: verifica effettiva PONG dopo ritorno/recupero, senza nuova segnalazione.
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

// Registro tecnico locale: mai salvare SDP, IP, token QR, ID dispositivi o misure cliniche.
type DiagnosticRow = {
  at: number;
  event: string;
  visibility: string;
  rtc: string;
  ice: string;
  channel: string;
  backgroundMs?: number;
};
const DIAG_KEY = 'diabety_wifi_lab_diag_v1';
const BACKGROUND_KEY = 'diabety_wifi_lab_last_hidden_v1';
const MAX_DIAG_ROWS = 45;
function loadDiagnostic(): DiagnosticRow[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(DIAG_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.slice(-MAX_DIAG_ROWS).filter((v): v is DiagnosticRow =>
      v && typeof v === 'object' && typeof v.at === 'number' &&
      typeof v.event === 'string' && typeof v.visibility === 'string' &&
      typeof v.rtc === 'string' && typeof v.ice === 'string' &&
      typeof v.channel === 'string');
  } catch { return []; }
}
function loadHiddenAt(): number | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BACKGROUND_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n <= Date.now() && Date.now() - n < 86400000 ? n : null;
  } catch { return null; }
}
function saveDiagnostic(rows: DiagnosticRow[]): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(DIAG_KEY, JSON.stringify(rows)); } catch { /* memoria browser non disponibile */ }
}
function saveHiddenAt(value: number | null): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (value === null) window.sessionStorage.removeItem(BACKGROUND_KEY);
    else window.sessionStorage.setItem(BACKGROUND_KEY, String(value));
  } catch { /* memoria browser non disponibile */ }
}
const fmtDuration = (durationMs: number) => durationMs < 1000
  ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;

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
  const [diagRows, setDiagRows] = useState<DiagnosticRow[]>(() => loadDiagnostic());
  const [showAllDiagnostic, setShowAllDiagnostic] = useState(false);
  const [showDiagnosticText, setShowDiagnosticText] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  // WIFI-004: una connessione nominalmente "connected" non equivale a dati ricevuti.
  const [lastRealPongAt, setLastRealPongAt] = useState<number | null>(null);
  const [lastRemotePingAt, setLastRemotePingAt] = useState<number | null>(null);
  const [returnCheck, setReturnCheck] = useState<'mai' | 'attesa' | 'verificato' | 'scaduto' | 'nuova-sessione'>('mai');
  const [returnCheckText, setReturnCheckText] = useState('Nessuna verifica dopo il ritorno eseguita.');
  const [lastReturnPongAt, setLastReturnPongAt] = useState<number | null>(null);
  const [lastReturnRtt, setLastReturnRtt] = useState<number | null>(null);
  const [recoveryCheck, setRecoveryCheck] = useState<'mai' | 'attesa' | 'verificato' | 'non-verificato'>('mai');
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
  const diagRowsRef = useRef<DiagnosticRow[]>(diagRows);
  const hiddenAtRef = useRef<number | null>(loadHiddenAt());
  const waitingPongAfterReturnRef = useRef(false);
  const returnSinceRef = useRef<number>(0);
  const returnDeadlineRef = useRef<number>(0);
  const returnPendingRef = useRef(false);
  const recoveryPendingRef = useRef(false);
  const recoveryDeadlineRef = useRef(0);
  const seenHiddenRef = useRef(false);
  const returnWasManualRef = useRef(false);

  const recordDiagnostic = useCallback((event: string, backgroundMs?: number) => {
    if (Platform.OS !== 'web') return;
    const pc = pcRef.current;
    const channel = channelRef.current;
    const row: DiagnosticRow = {
      at: Date.now(), event,
      visibility: typeof document === 'undefined' ? 'non disponibile' : document.visibilityState,
      rtc: pc?.connectionState ?? 'assente',
      ice: pc?.iceConnectionState ?? 'assente',
      channel: channel?.readyState ?? 'assente',
      ...(backgroundMs === undefined ? {} : { backgroundMs }),
    };
    const updated = [...diagRowsRef.current, row].slice(-MAX_DIAG_ROWS);
    diagRowsRef.current = updated;
    saveDiagnostic(updated);
    if (aliveRef.current) setDiagRows(updated);
  }, []);

  // Diagnostica del ciclo di vita della WEB APP: nessuna modifica alla connessione.
  // Un browser può non emettere pagehide quando l'OS termina il processo.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const markHidden = () => {
      if (hiddenAtRef.current === null) {
        hiddenAtRef.current = Date.now();
        saveHiddenAt(hiddenAtRef.current);
      }
    };
    const markVisible = (label: string) => {
      const start = hiddenAtRef.current;
      hiddenAtRef.current = null;
      saveHiddenAt(null);
      recordDiagnostic(label, start === null ? undefined : Date.now() - start);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markHidden();
        recordDiagnostic('visibilitychange: hidden');
      } else markVisible('visibilitychange: visible');
    };
    const onBlur = () => recordDiagnostic('window: blur');
    const onFocus = () => recordDiagnostic('window: focus');
    const onPageHide = () => {
      markHidden();
      recordDiagnostic('window: pagehide');
    };
    const onPageShow = () => {
      if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) markVisible('window: pageshow (rientro)');
      else recordDiagnostic('window: pageshow (caricamento)');
    };
    recordDiagnostic('Laboratorio montato / nuova apertura');
    if (document.visibilityState === 'hidden') markHidden();
    else if (hiddenAtRef.current !== null) markVisible('Pagina caricata dopo background/reload');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      recordDiagnostic('Laboratorio smontato / cambio vista');
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [recordDiagnostic]);

  const diagnosticText = [
    'DIABETY | WIFI-004 | SOLO DATI TECNICI',
    'Dispositivo: ' + (role === 'main' ? 'MAIN' : role === 'associato' ? 'ASSOCIATO' : 'NON CONFIGURATO'),
    'Nota: i PONG confermano dati realmente ricevuti; nuova sessione dopo chiusura richiede QR.',
    ...diagRows.map(item => {
      const when = new Date(item.at).toLocaleString('it-IT');
      const duration = item.backgroundMs === undefined ? '' : ` | background: ${fmtDuration(item.backgroundMs)}`;
      return `${when} | ${item.event} | vis: ${item.visibility} | RTC: ${item.rtc} | ICE: ${item.ice} | DataChannel: ${item.channel}${duration}`;
    }),
  ].join('\n');

  const copyDiagnostic = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) throw new Error('clipboard non supportato');
      await navigator.clipboard.writeText(diagnosticText);
      setCopyStatus('Registro tecnico copiato.');
    } catch {
      setShowDiagnosticText(true);
      setCopyStatus('Copia automatica non disponibile: seleziona il testo qui sotto.');
    }
  };
  const clearDiagnostic = () => {
    diagRowsRef.current = [];
    setDiagRows([]);
    saveDiagnostic([]);
    setCopyStatus('Registro cancellato (solo diagnostica).');
  };

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
    returnPendingRef.current = false;
    returnSinceRef.current = 0;
    returnWasManualRef.current = false;
    returnDeadlineRef.current = 0;
    recoveryPendingRef.current = false;
    recoveryDeadlineRef.current = 0;
    waitingPongAfterReturnRef.current = false;
    if (aliveRef.current) {
      setLastRealPongAt(null);
      setLastRemotePingAt(null);
      setLastReturnPongAt(null);
      setLastReturnRtt(null);
      setReturnCheck('mai');
      setReturnCheckText('Nessuna verifica dopo il ritorno eseguita.');
      setRecoveryCheck('mai');
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
      recordDiagnostic('DataChannel: open');
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
      recordDiagnostic('DataChannel: close');
      setConnected(false);
      setPingPassed(false);
      setConnectionPhase('Canale chiuso');
      setMonitorStatus('Sessione terminata: non è possibile riaprire automaticamente il canale chiuso senza una nuova segnalazione.');
      setStatus('Canale chiuso. Per riconnetterti occorre una nuova sessione e un nuovo scambio QR.');
    };
    channel.onerror = () => {
      if (!aliveRef.current) return;
      recordDiagnostic('DataChannel: error');
      setStatus('Errore del canale diretto WebRTC.');
    };
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
        setLastRemotePingAt(Date.now());
        recordDiagnostic('PING ricevuto; PONG inviato al MAIN');
        setMonitorStatus('Messaggio ricevuto e risposta inviata automaticamente.');
        setStatus('MESSAGGIO RICEVUTO E RISPOSTA INVIATA. Comunicazione diretta verificata su questo dispositivo.');
      } else if (payload.kind === 'pong' && role === 'main' && pendingPingRef.current === payload.nonce) {
        const wasAutomatic = pingIsAutomaticRef.current;
        pendingPingRef.current = null;
        setPingPassed(true);
        setLastPing(new Date().toLocaleTimeString('it-IT'));
        setPingCount(n => n + 1);
        const receivedAt = Date.now();
        const elapsed = receivedAt - pingTimeRef.current;
        setLastRealPongAt(receivedAt);
        setLastRoundTripMs(elapsed);
        recordDiagnostic(`PONG valido ricevuto (${elapsed} ms)`);
        // Conta come prova DOPO il ritorno solo un ping creato DOPO il ritorno,
        // non un vecchio pong arrivato in ritardo dalla sessione precedente.
        if (returnPendingRef.current && pingTimeRef.current >= returnSinceRef.current) {
          returnPendingRef.current = false;
          waitingPongAfterReturnRef.current = false;
          if (receivedAt <= returnDeadlineRef.current) {
            setReturnCheck('verificato');
            setLastReturnPongAt(receivedAt);
            setLastReturnRtt(elapsed);
            setReturnCheckText(`${returnWasManualRef.current ? 'Verifica manuale' : 'Ritorno in app'}: PONG ricevuto (${elapsed} ms). Dati realmente scambiati.`);
            recordDiagnostic(`WIFI-004: PONG dopo ${returnWasManualRef.current ? 'verifica manuale' : 'ritorno'} confermato (${elapsed} ms)`);
          } else {
            setReturnCheck('scaduto');
            setReturnCheckText('PONG ricevuto oltre i 12 secondi del test: comunicazione ripresa, ma verifica nei tempi NON superata.');
            recordDiagnostic('WIFI-004: PONG arrivato oltre timeout post-ritorno');
          }
        }
        if (recoveryPendingRef.current) {
          const inTime = receivedAt <= recoveryDeadlineRef.current;
          recoveryPendingRef.current = false;
          recoveryDeadlineRef.current = 0;
          setRecoveryCheck(inTime ? 'verificato' : 'non-verificato');
          recordDiagnostic(inTime ? `WIFI-004: recupero CONFERMATO da PONG (${elapsed} ms)`
            : 'WIFI-004: recupero PONG oltre timeout');
        }
        setMonitorStatus(`Ultimo controllo riuscito: ${elapsed} ms. Il collegamento risponde.`);
        if (!wasAutomatic) setStatus(`TEST SUPERATO. Risposta ricevuta dal dispositivo associato (${elapsed} ms).`);
      }
    };
  }, [deviceId, role, sendPing, recordDiagnostic]);

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // iceServers VUOTO: nessun server STUN/TURN e nessun traffico via relay.
    const pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle' });
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      if (!aliveRef.current || pcRef.current !== pc) return;
      const state = pc.connectionState;
      recordDiagnostic(`WebRTC: ${state}`);
      setConnectionPhase(state === 'connected' ? 'WebRTC connesso' : `WebRTC: ${state}`);
      if (state === 'failed') {
        pendingPingRef.current = null;
        wasInterruptedRef.current = true;
        if (recoveryPendingRef.current) setRecoveryCheck('non-verificato');
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
          if (role === 'main') {
            recoveryPendingRef.current = true;
            recoveryDeadlineRef.current = Date.now() + 12000;
            setRecoveryCheck('attesa');
            recordDiagnostic('WIFI-004: RTC connesso di nuovo; attendo PONG di conferma');
          }
          setMonitorStatus('WebRTC riporta connected: recupero da confermare con PONG.');
          if (role === 'main') sendPing(true);
        }
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (aliveRef.current && pcRef.current === pc) recordDiagnostic(`ICE: ${pc.iceConnectionState}`);
    };
    return pc;
  }, [role, sendPing, recordDiagnostic]);

  // WIFI-004: al ritorno in primo piano avvia una NUOVA prova su questa sessione.
  // Se la pagina è stata ricreata, RTCPeerConnection non esiste più: niente falso successo.
  const verifyAfterReturn = useCallback((manual = false) => {
    if (role !== 'main') return;
    const pc = pcRef.current;
    if (!pc || !sessionRef.current || !channelRef.current) {
      returnPendingRef.current = false;
      setReturnCheck('nuova-sessione');
      setReturnCheckText('Nessuna sessione WebRTC attiva in questa istanza. Serve una nuova offerta e risposta QR.');
      recordDiagnostic('WIFI-004: nessuna sessione RTC; nuova negoziazione necessaria');
      return;
    }
    const now = Date.now();
    returnSinceRef.current = now;
    returnWasManualRef.current = manual;
    returnDeadlineRef.current = now + 12000;
    returnPendingRef.current = true;
    waitingPongAfterReturnRef.current = true;
    setReturnCheck('attesa');
    setReturnCheckText(manual
      ? 'Verifica manuale avviata: aspetto un PONG generato da un nuovo ping.'
      : 'DIABETY è tornata in primo piano: verifica automatica in corso (12 secondi).');
    recordDiagnostic(manual ? 'WIFI-004: prova manuale avviata' : 'WIFI-004: rientro, verifica PONG avviata');
    if (pc.connectionState === 'connected' && channelRef.current.readyState === 'open') {
      sendPing(true);
    }
  }, [role, recordDiagnostic, sendPing]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !available || role !== 'main') return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        seenHiddenRef.current = true;
      } else if (seenHiddenRef.current) {
        seenHiddenRef.current = false;
        verifyAfterReturn();
      }
    };
    // pageshow/focus sono utili su iPadOS, ma una semplice messa a fuoco
    // non deve generare false prove di background: serve hidden precedente.
    const onPageShow = () => {
      if (document.visibilityState === 'visible' && seenHiddenRef.current) {
        seenHiddenRef.current = false;
        verifyAfterReturn();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [available, role, verifyAfterReturn]);

  // Timeout non equivale a un ICE failure definitivo; indica solo che
  // la verifica applicativa non ha ricevuto un PONG entro 12 secondi.
  useEffect(() => {
    if (Platform.OS !== 'web' || !available || role !== 'main') return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (recoveryPendingRef.current && recoveryDeadlineRef.current && Date.now() >= recoveryDeadlineRef.current) {
        recoveryPendingRef.current = false;
        recoveryDeadlineRef.current = 0;
        setRecoveryCheck('non-verificato');
        recordDiagnostic('WIFI-004: recupero connected NON confermato da PONG entro 12 s');
      }
      if (!returnPendingRef.current) return;
      if (Date.now() >= returnDeadlineRef.current) {
        returnPendingRef.current = false;
        waitingPongAfterReturnRef.current = false;
        setReturnCheck('scaduto');
        setReturnCheckText('Nessun PONG valido ricevuto entro 12 secondi dal ritorno. Collegamento NON verificato.');
        recordDiagnostic('WIFI-004: verifica post-ritorno SCADUTA, nessun PONG');
        return;
      }
      const pc = pcRef.current;
      const ch = channelRef.current;
      if (pc?.connectionState !== 'connected' || ch?.readyState !== 'open') return;
      // Il ping precedente può essere partito prima del ritorno; trascorsi
      // 3 s non blocca la prova post-rientro per tutta la sua durata.
      if (pendingPingRef.current && Date.now() - pingTimeRef.current > 3000) {
        pendingPingRef.current = null;
      }
      if (!pendingPingRef.current) sendPing(true);
    }, 1500);
    return () => clearInterval(timer);
  }, [available, role, recordDiagnostic, sendPing]);

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
      {pcRef.current && <LabButton icon="close-circle-outline" title="Termina test e chiudi connessione" outline onPress={() => { recordDiagnostic('Test terminato manualmente'); closeConnection(); setStatus('Test terminato.'); }} />}
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
      <View style={s.phase3Card}>
        <View style={s.header}>
          <Ionicons name="checkmark-done-circle-outline" size={19} color={C.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>STEP 4 · PONG dopo il ritorno (WIFI-004)</Text>
            <Text style={s.muted}>Verifica effettiva dei messaggi, non soltanto dello stato connected.</Text>
          </View>
        </View>
        <Text style={s.body}>Sessione corrente: {pcRef.current ? 'WebRTC inizializzato' : 'nessuna connessione WebRTC in questa apertura'}</Text>
        {isMain && <Text style={s.body}>Ultimo PONG valido sul MAIN: {lastRealPongAt === null ? 'nessuno' : new Date(lastRealPongAt).toLocaleTimeString('it-IT')}</Text>}
        {!isMain && <Text style={s.body}>Ultimo PING ricevuto e confermato dall'associato: {lastRemotePingAt === null ? 'nessuno' : new Date(lastRemotePingAt).toLocaleTimeString('it-IT')}</Text>}
        {isMain && <>
          <Text style={s.body}>Verifica al rientro: {returnCheck === 'mai' ? 'non effettuata'
            : returnCheck === 'attesa' ? 'in corso'
            : returnCheck === 'verificato' ? 'PONG VERIFICATO'
            : returnCheck === 'scaduto' ? 'NON verificata'
            : 'nuova sessione da inizializzare'}</Text>
          <Text style={s.cameraStatus}>{returnCheckText}</Text>
          <Text style={s.body}>Ultimo PONG di verifica: {lastReturnPongAt === null ? 'nessuno' : `${new Date(lastReturnPongAt).toLocaleTimeString('it-IT')} · ${lastReturnRtt} ms`}</Text>
          <Text style={s.body}>Ultimo recupero dopo disconnessione: {recoveryCheck === 'mai' ? 'non osservato'
            : recoveryCheck === 'attesa' ? 'connected, PONG ancora da verificare'
            : recoveryCheck === 'verificato' ? 'confermato dal PONG'
            : 'non confermato dal PONG'}</Text>
          <LabButton title="WIFI-004 · Verifica PONG adesso" icon="send-outline" outline onPress={() => verifyAfterReturn(true)} />
        </>}
        <View style={s.notice}>
          <Text style={s.noticeText}>Se il MAIN viene chiuso completamente, una nuova apertura non conserva il vecchio RTCPeerConnection. La prova mostrerà «nuova sessione» e NON potrà ricreare il collegamento senza segnalazione. Il test non legge dati sanitari.</Text>
        </View>
      </View>
      <View style={s.phase3Card}>
        <View style={s.header}>
          <Ionicons name="analytics-outline" size={19} color={C.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>STEP 3B · Diagnostica del ritorno in app</Text>
            <Text style={s.muted}>WIFI-003: osserva cosa succede quando DIABETY va in secondo piano e torna visibile.</Text>
          </View>
        </View>
        <Text style={s.body}>Visibilità attuale: {Platform.OS === 'web' && typeof document !== 'undefined' ? document.visibilityState : 'non disponibile'}</Text>
        <Text style={s.body}>Ultimo WebRTC: {pcRef.current?.connectionState ?? 'assente'} · ICE: {pcRef.current?.iceConnectionState ?? 'assente'} · DataChannel: {channelRef.current?.readyState ?? 'assente'}</Text>
        <Text style={s.muted}>Il registro resta nella sessione del browser anche dopo alcuni ricaricamenti, quando il browser lo consente. Non contiene misurazioni, identificativi dispositivi, indirizzi di rete o codici QR.</Text>
        <View style={s.horiz}>
          <TouchableOpacity accessibilityRole="button" style={s.navButton} onPress={() => recordDiagnostic('Stato richiesto manualmente')}>
            <Text style={s.navText}>Registra stato ora</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={s.navButton} onPress={() => setShowAllDiagnostic(v => !v)}>
            <Text style={s.navText}>{showAllDiagnostic ? 'Mostra meno' : 'Mostra tutto'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.label}>Eventi registrati: {diagRows.length}</Text>
        {(showAllDiagnostic ? diagRows : diagRows.slice(-8)).slice().reverse().map((row, index) => (
          <View key={`${row.at}-${index}`} style={s.diagItem}>
            <Text style={s.diagTitle}>{new Date(row.at).toLocaleTimeString('it-IT')} · {row.event}</Text>
            <Text style={s.muted}>Pagina: {row.visibility} · RTC: {row.rtc} · ICE: {row.ice} · Canale: {row.channel}{row.backgroundMs === undefined ? '' : ` · Fuori: ${fmtDuration(row.backgroundMs)}`}</Text>
          </View>
        ))}
        {diagRows.length === 0 && <Text style={s.muted}>Registro vuoto. Avvia un collegamento e prova il cambio app.</Text>}
        <LabButton outline icon="copy-outline" title="Copia diagnostica" onPress={() => { void copyDiagnostic(); }} />
        <LabButton outline icon="document-text-outline" title={showDiagnosticText ? 'Nascondi testo tecnico' : 'Mostra testo tecnico selezionabile'} onPress={() => setShowDiagnosticText(v => !v)} />
        {!!copyStatus && <Text style={s.cameraStatus}>{copyStatus}</Text>}
        {showDiagnosticText && <Text selectable style={s.raw}>{diagnosticText}</Text>}
        <LabButton outline icon="trash-outline" title="Cancella solo il registro tecnico" onPress={clearDiagnostic} />
        <View style={s.notice}>
          <Text style={s.noticeText}>Questa fase è SOLO diagnostica: non mantiene la connessione in background e non la ricrea automaticamente dopo WebRTC failed. Nessuna sincronizzazione sanitaria.</Text>
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
  diagItem: { backgroundColor: '#0B2530', borderColor: '#224652', borderWidth: 1, padding: 8, gap: 2, borderRadius: 8 },
  diagTitle: { color: '#D0F4FB', fontSize: 12, fontWeight: '700' },
  footer: { color: '#96A5B0', fontSize: 11, lineHeight: 18 },
});
