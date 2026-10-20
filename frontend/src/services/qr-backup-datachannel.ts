/**
 * Trasporto di un backup su WebRTC DataChannel cifrato DTLS.
 * Nessuna scrittura locale: il ricevente riceve dati solo in memoria.
 * Protocollo con indice dei blocchi, limite di dimensione, SHA-256 e ACK finale.
 */
import { checkReceivedBackup, MAX_BACKUP_BYTES } from './backup-transfer';
import { newLanId } from './qr-backup-transport';

export type TransferProgress = { current: number; total: number; status: string };
const RAW_CHUNK = 5 * 1024;
const MAX_CHUNKS = Math.ceil(MAX_BACKUP_BYTES / RAW_CHUNK);
const bytesToB64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 4096) s += String.fromCharCode(...bytes.subarray(i, i + 4096));
  return btoa(s);
};
const b64ToBytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function sha(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Verifica crittografica SHA-256 non disponibile su questo browser.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export class QrBackupWire {
  private channel: RTCDataChannel;
  private buffer: (Uint8Array | undefined)[] = [];
  private id = '';
  private expectedSize = 0;
  private expectedChunks = 0;
  private digest = '';
  private receivedSize = 0;
  private active = false;
  private destroyed = false;
  private onProgress: (p: TransferProgress) => void;
  private onReceive: (text: string) => void;
  private onStatus: (text: string) => void;
  constructor(channel: RTCDataChannel, progress: (p: TransferProgress) => void,
    received: (text: string) => void, status: (text: string) => void) {
    this.channel = channel;
    this.onProgress = progress;
    this.onReceive = received;
    this.onStatus = status;
    channel.onmessage = e => { void this.message(String(e.data)); };
  }
  dispose() { this.destroyed = true; this.buffer = []; }
  private async message(raw: string) {
    if (this.destroyed) return;
    try {
      if (raw.length > 15000) throw new Error('Pacchetto eccessivo.');
      const m = JSON.parse(raw);
      if (!m || typeof m !== 'object') return;
      if (m.t === 'start') {
        if (this.active || typeof m.id !== 'string' || !/^[0-9a-f]{32}$/.test(m.id) ||
          !Number.isInteger(m.bytes) || m.bytes < 1 || m.bytes > MAX_BACKUP_BYTES ||
          !Number.isInteger(m.count) || m.count < 1 || m.count > MAX_CHUNKS ||
          typeof m.sha !== 'string' || !/^[0-9a-f]{64}$/.test(m.sha)) {
          throw new Error('Intestazione del backup non valida.');
        }
        this.active = true;
        this.id = m.id;
        this.expectedSize = m.bytes;
        this.expectedChunks = m.count;
        this.digest = m.sha;
        this.buffer = Array(m.count);
        this.receivedSize = 0;
        this.onStatus('Ricezione del backup in corso…');
        return;
      }
      if (m.t === 'chunk') {
        if (!this.active || m.id !== this.id || !Number.isInteger(m.i) || m.i < 0 || m.i >= this.expectedChunks ||
          typeof m.data !== 'string' || m.data.length > 8000) throw new Error('Blocco non valido.');
        if (this.buffer[m.i]) throw new Error('Blocco duplicato.');
        const bytes = b64ToBytes(m.data);
        const expectedLength = Math.min(RAW_CHUNK, this.expectedSize - m.i * RAW_CHUNK);
        if (bytes.length !== expectedLength || this.receivedSize + bytes.length > this.expectedSize) {
          throw new Error('Dimensioni del blocco non valide.');
        }
        this.buffer[m.i] = bytes;
        this.receivedSize += bytes.length;
        this.onProgress({ current: this.receivedSize, total: this.expectedSize, status: 'Ricezione' });
        return;
      }
      if (m.t === 'end') {
        if (!this.active || m.id !== this.id ||
            this.buffer.filter(Boolean).length !== this.expectedChunks ||
            this.receivedSize !== this.expectedSize) throw new Error('Backup incompleto. Nessun dato importato.');
        const all = new Uint8Array(this.expectedSize);
        let offset = 0;
        for (const part of this.buffer) { all.set(part!, offset); offset += part!.length; }
        const actual = await sha(all);
        if (actual !== this.digest) throw new Error('Controllo SHA-256 non riuscito. Nessun dato importato.');
        const text = new TextDecoder('utf-8', { fatal: true }).decode(all);
        checkReceivedBackup(text);
        this.onReceive(text);
        this.channel.send(JSON.stringify({ t: 'ack', id: this.id, sha: actual }));
        this.onStatus('Backup ricevuto e integro. Importazione NON ancora eseguita.');
        this.buffer = [];
        this.active = false;
        return;
      }
      if (m.t === 'ack') {
        if (m.id === this.id && m.sha === this.digest) this.onStatus('Backup ricevuto e verificato dal dispositivo di destinazione.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore trasferimento.';
      this.onStatus(`ERRORE: ${msg}`);
      this.active = false;
      this.buffer = [];
    }
  }
  async send(text: string): Promise<void> {
    if (this.channel.readyState !== 'open') throw new Error('Connessione non disponibile.');
    const bytes = new TextEncoder().encode(text);
    if (!bytes.length || bytes.length > MAX_BACKUP_BYTES) throw new Error('Dimensione backup non supportata.');
    const digest = await sha(bytes);
    const id = newLanId();
    this.id = id; this.digest = digest;
    const count = Math.ceil(bytes.length / RAW_CHUNK);
    this.channel.send(JSON.stringify({ t: 'start', id, bytes: bytes.length, count, sha: digest }));
    this.onStatus('Trasferimento in corso…');
    for (let i = 0; i < count; i++) {
      if (this.destroyed || this.channel.readyState !== 'open') throw new Error('Connessione interrotta. Nessun dato importato.');
      // Backpressure: attendere che il browser svuoti il buffer invece di saturarlo.
      let n = 0;
      while (this.channel.bufferedAmount > 128 * 1024) {
        if (this.destroyed || this.channel.readyState !== 'open' || ++n > 600) throw new Error('Trasferimento interrotto.');
        await pause(50);
      }
      const data = bytes.subarray(i * RAW_CHUNK, Math.min(bytes.length, (i + 1) * RAW_CHUNK));
      this.channel.send(JSON.stringify({ t: 'chunk', id, i, data: bytesToB64(data) }));
      this.onProgress({ current: Math.min(bytes.length, (i + 1) * RAW_CHUNK), total: bytes.length, status: 'Invio' });
    }
    let n = 0;
    while (this.channel.bufferedAmount > 0) {
      if (this.destroyed || this.channel.readyState !== 'open' || ++n > 600) throw new Error('Connessione interrotta.');
      await pause(50);
    }
    this.channel.send(JSON.stringify({ t: 'end', id }));
    this.onStatus('Invio terminato. In attesa della verifica del destinatario…');
  }
}
