/**
 * DIABETY · Wi-Fi Lab Fase 2. Solo segnalazione WebRTC (SDP/ICE) per ping test.
 * NON importare questa utility nello storico o in moduli che trattano dati clinici.
 * NO STUN, TURN, WebSocket, cloud o chiamate HTTP: scambio esclusivo via QR.
 */
export type LanSignal = {
  app: 'DIABETY_LAN_LAB';
  version: 2;
  kind: 'offer' | 'answer';
  sessionId: string;
  mainId: string;
  peerId: string;
  sdp: string;
};

const PREFIX = 'DWL2:';
const PART_PREFIX = 'DWL2P|';
const MAX_B64_LENGTH = 16000;
const MAX_SDP_LENGTH = 24000;
const PIECE_LENGTH = 480;
const MAX_PARTS = 24;
const isHex = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{24,128}$/i.test(v);

function b64urlEncode(bytes: Uint8Array): string {
  // Conversione a blocchi per evitare limiti dello stack.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length > MAX_B64_LENGTH) throw new Error('Codice non valido o troppo lungo.');
  const src = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4));
  return Uint8Array.from(src, char => char.charCodeAt(0));
}

export async function encodeLanSignal(signal: LanSignal): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(signal));
  if (raw.length > MAX_SDP_LENGTH) throw new Error('Informazioni WebRTC troppo lunghe.');
  let payload = raw;
  let format = 'J';
  if (typeof CompressionStream !== 'undefined') {
    const compressed = await new Response(new Blob([raw as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    payload = new Uint8Array(compressed);
    format = 'G';
  }
  const encoded = PREFIX + format + b64urlEncode(payload);
  if (encoded.length > MAX_B64_LENGTH) throw new Error('Codice di collegamento troppo lungo.');
  return encoded;
}

export async function decodeLanSignal(text: string): Promise<LanSignal> {
  const value = text.trim();
  if (!value.startsWith(PREFIX) || value.length > MAX_B64_LENGTH + PREFIX.length) {
    throw new Error('Questo non è un codice di connessione Wi-Fi DIABETY.');
  }
  const format = value.charAt(PREFIX.length);
  let decoded = b64urlDecode(value.slice(PREFIX.length + 1));
  if (format === 'G') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Il browser non supporta la decompressione dei codici QR.');
    decoded = new Uint8Array(await new Response(new Blob([decoded as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  } else if (format !== 'J') {
    throw new Error('Formato QR non riconosciuto.');
  }
  if (decoded.length > MAX_SDP_LENGTH) throw new Error('Codice di connessione non valido (dimensione).');
  let candidate: unknown;
  try { candidate = JSON.parse(new TextDecoder().decode(decoded)); }
  catch { throw new Error('Contenuto QR danneggiato.'); }
  if (!candidate || typeof candidate !== 'object') throw new Error('Contenuto QR non valido.');
  const m = candidate as Partial<LanSignal>;
  if (m.app !== 'DIABETY_LAN_LAB' || m.version !== 2 || !['offer', 'answer'].includes(m.kind || '') ||
    !isHex(m.sessionId) || !isHex(m.mainId) || !isHex(m.peerId) ||
    typeof m.sdp !== 'string' || m.sdp.length < 50 || m.sdp.length > MAX_SDP_LENGTH ||
    !m.sdp.startsWith('v=0')) {
    throw new Error('Segnalazione WebRTC incompleta o non valida.');
  }
  return m as LanSignal;
}

/** QR spezzati in porzioni leggibili anche con webcam poco precise. */
export function createQrParts(code: string, transferId: string): string[] {
  if (!isHex(transferId)) throw new Error('Identificativo pacchetto non valido.');
  const total = Math.ceil(code.length / PIECE_LENGTH);
  if (total < 1 || total > MAX_PARTS) throw new Error('Troppi QR: segnalazione WebRTC non supportata.');
  const out: string[] = [];
  for (let n = 0; n < total; n++) {
    out.push(`${PART_PREFIX}${transferId}|${n + 1}/${total}|${code.slice(n * PIECE_LENGTH, (n + 1) * PIECE_LENGTH)}`);
  }
  return out;
}

type Bundle = { id: string; total: number; items: Map<number, string> };
export class QrPartCollector {
  private bundle: Bundle | null = null;
  accept(raw: string): { code?: string; count: number; total: number } {
    const text = raw.trim();
    if (text.startsWith(PREFIX)) return { code: text, count: 1, total: 1 }; // Fallback testo integrale.
    const match = /^DWL2P\|([0-9a-f]{24,128})\|(\d{1,2})\/(\d{1,2})\|([A-Za-z0-9:_-]+)$/i.exec(text);
    if (!match) throw new Error('Inquadra un QR della sezione «Test comunicazione Wi-Fi».');
    const [, id, indexText, totalText, chunk] = match;
    const part = Number(indexText), total = Number(totalText);
    if (total < 1 || total > MAX_PARTS || part < 1 || part > total || chunk.length > PIECE_LENGTH) {
      throw new Error('Parte QR non valida.');
    }
    if (!this.bundle || this.bundle.id !== id) this.bundle = { id, total, items: new Map() };
    if (this.bundle.total !== total) throw new Error('Sequenza QR non coerente. Riprova.');
    this.bundle.items.set(part, chunk);
    if (this.bundle.items.size === total) {
      const code = Array.from({ length: total }, (_, i) => this.bundle!.items.get(i + 1) || '').join('');
      this.bundle = null;
      return { code, count: total, total };
    }
    return { count: this.bundle.items.size, total };
  }
  reset() { this.bundle = null; }
}

/** Attende ICE gathering: nessun server esterno, solo candidati host della LAN. */
export function awaitLocalCandidates(pc: RTCPeerConnection, timeoutMs = 14000): Promise<boolean> {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') return resolve(true);
    let finished = false;
    const done = (complete: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve(complete);
    };
    const onChange = () => { if (pc.iceGatheringState === 'complete') done(true); };
    const timer = setTimeout(() => done(false), timeoutMs);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

export function newLanId(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Ambiente non sicuro: impossibile generare una sessione di test.');
  }
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
