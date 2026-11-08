const KEY = 'nusantara-room-v1';
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const WAIT = [500, 1000, 2000, 4200, 8200, 14000, 24000];
export const errors = {
  full: 'Room sudah berisi dua pemain. Minta temanmu membuat room baru.',
  missing: 'Kode room tidak ditemukan atau sudah kedaluwarsa.',
  expired: 'Sesi room sudah kedaluwarsa. Kamu bisa membuat atau bergabung ke room baru.',
  busy: 'Layanan room sedang sibuk atau batas pemakaian tercapai. Coba lagi sebentar.',
  limit: 'Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.',
  offline: 'Koneksi terputus. Cek internetmu lalu coba lagi.',
  character: 'Karakter itu sudah dipilih temanmu.',
  timeout: 'Server terlalu lama merespons. Coba lagi sebentar.',
};

export function storeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export function storeWrite(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Room remains playable in this page when private storage is disabled.
  }
}

export function normalizedCode(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8);
}

async function post(path, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const response = await fetch(path, { method: 'POST', headers, signal: controller.signal, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || (response.status === 429 ? 'limit' : 'busy'));
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('timeout');
    if (error instanceof TypeError) throw new Error('offline');
    throw error;
  } finally { clearTimeout(timeout); }
}

export class RoomConnection {
  constructor(onState, onConnection, onError) {
    this.onState = onState;
    this.onConnection = onConnection;
    this.onError = onError;
    this.saved = storeRead(KEY, null);
    this.attempt = 0;
    addEventListener('online', () => { if (this.room && this.socket?.readyState !== 1) this.connect(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.room) {
        if (!this.socket || this.socket.readyState > 1) this.connect();
        else if (Date.now() - this.lastPong > 36000) {
          this.dropSocket();
          this.connect();
        } else this.heartbeat();
      }
    });
    this.timer = setInterval(() => this.heartbeat(), 15000);
  }

  async enter(mode, code) {
    let room;
    if (mode === 'join') {
      if (!CODE.test(code)) throw new Error('missing');
      if (this.saved?.code === code) {
        try {
          await post('/api/rooms/' + code + '/status', this.saved.token);
          this.use(this.saved);
          return;
        } catch (error) {
          if (!['missing', 'expired'].includes(error.message)) throw error;
          this.forget();
        }
      }
      room = await post('/api/rooms/' + code + '/join');
    } else room = await post('/api/rooms');
    this.saved = room;
    storeWrite(KEY, room);
    this.use(room);
  }

  use(room = this.saved) {
    if (!room) return;
    this.stop();
    this.room = room;
    this.attempt = 0;
    this.connect();
  }

  connect() {
    if (!this.room || this.socket?.readyState === 0 || this.socket?.readyState === 1) return;
    clearTimeout(this.retry);
    this.onConnection(this.attempt ? 'retry' : 'opening');
    const base = new URL('/api/rooms/' + this.room.code + '/socket', location.href);
    base.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.lastPong = Date.now();
    const socket = new WebSocket(base, ['nusantara.v1', 'auth.' + this.room.token]);
    this.socket = socket;
    const timeout = setTimeout(() => {
      if (this.socket === socket && socket.readyState === 0) socket.close();
    }, 8500);
    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      clearTimeout(timeout);
      this.attempt = 0;
      this.lastPong = Date.now();
      this.onConnection('open');
    });
    socket.addEventListener('message', event => {
      if (this.socket !== socket) return;
      this.lastPong = Date.now();
      if (event.data === 'pong') return;
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.t === 'error') this.onError(errors[data.error] || errors.busy);
      else this.onState(data);
    });
    socket.addEventListener('close', event => {
      clearTimeout(timeout);
      if (this.socket !== socket || !this.room) return;
      if (event.code === 4001) {
        this.stop();
        this.onConnection('closed');
        this.onError('Room ini sedang dibuka di sesi lain.');
        return;
      }
      this.onConnection('retry');
      this.scheduleRetry();
    });
  }

  async scheduleRetry() {
    const room = this.room;
    const attempt = this.attempt++;
    if (attempt === 2 || attempt % 7 === 6) {
      try { await post('/api/rooms/' + room.code + '/status', room.token); } catch (error) {
        if (this.room !== room) return;
        if (['missing', 'expired'].includes(error.message)) {
          this.forget();
          this.stop();
          this.onConnection('closed');
          this.onError(errors[error.message]);
          return;
        }
        this.onError(errors[error.message] || errors.busy);
      }
    }
    if (this.room === room) this.retry = setTimeout(() => this.connect(), WAIT[Math.min(attempt, WAIT.length - 1)] + Math.random() * 180);
  }

  heartbeat() {
    if (!this.room || this.socket?.readyState !== 1) return;
    if (!document.hidden && Date.now() - this.lastPong > 38000) {
      this.dropSocket();
      this.connect();
    } else this.socket.send('ping');
  }

  send(message) {
    if (this.socket?.readyState !== 1 || this.socket.bufferedAmount > 12_000) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  dropSocket() {
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < 2) socket.close(1000);
  }

  stop() {
    clearTimeout(this.retry);
    this.room = null;
    this.dropSocket();
  }

  forget() {
    this.saved = null;
    storeWrite(KEY, null);
  }
}
