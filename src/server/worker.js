import { DurableObject } from 'cloudflare:workers';
import { cleanAvatar, DEFAULT_AVATAR } from '../shared/avatar-options.js';
import { advance, applyInput, checkpoint, gameCommand, newWorld, pause, publicMotion, publicWorld } from './world.js';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
const TOKEN_RE = /^[a-zA-Z0-9_-]{43}$/;
const DAY = 86_400_000;
const PROTOCOL = 'nusantara.v1';
const API = /^\/api\/rooms\/([A-HJ-NP-Z2-9]{8})\/(join|socket|status)$/;

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function fail(error, status) {
  return reply({ error }, status);
}

function newCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), x => LETTERS[x & 31]).join('');
}

function newToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function digest(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function allowed(env, request, scope) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const result = await env.ROOM_ENTRY_LIMIT.limit({ key: scope + ':' + ip });
  return result.success;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.headers.get('Origin') !== url.origin) return fail('origin', 403);
    try {
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        if (!await allowed(env, request, 'entry')) return fail('limit', 429);
        for (let attempt = 0; attempt < 3; attempt++) {
          const code = newCode();
          const room = env.ROOMS.getByName(code);
          const result = await room.fetch(new Request(url.origin + '/internal/create/' + code, { method: 'POST' }));
          if (result.status !== 409) return result;
        }
        return fail('busy', 503);
      }
      const route = API.exec(url.pathname);
      if (!route || !CODE_RE.test(route[1])) return fail('missing', 404);
      const [, code, action] = route;
      if (action === 'socket') {
        if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return fail('upgrade', 426);
        if (!await allowed(env, request, 'socket')) return fail('limit', 429);
      } else {
        if (request.method !== 'POST') return fail('method', 405);
        if (!await allowed(env, request, action === 'join' ? 'entry' : 'status')) return fail('limit', 429);
      }
      const room = env.ROOMS.getByName(code);
      return await room.fetch(request);
    } catch {
      return fail('busy', 503);
    }
  },
};

export class AdventureRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.record = null;
    this.buckets = new WeakMap();
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      this.record = await ctx.storage.get('room') ?? null;
      if (this.record?.world) pause(this.record.world, Date.now());
    });
  }

  activeSockets(slot) {
    const all = slot === undefined ? this.ctx.getWebSockets() : this.ctx.getWebSockets('p' + slot);
    return all.filter(socket => socket.readyState === 1 && socket.deserializeAttachment()?.active === true);
  }

  online() {
    return [0, 1].map(i => this.activeSockets(i).length > 0);
  }

  async save(refresh = false) {
    const record = this.record;
    await this.ctx.storage.put('room', { ...record, world: record.world ? checkpoint(record.world) : null });
    if (refresh) {
      const time = Date.now() + (record.world ? 7 * DAY : DAY);
      const existing = await this.ctx.storage.getAlarm();
      if (existing === null || existing < time - DAY / 2) await this.ctx.storage.setAlarm(time);
    }
  }

  async alarm() {
    if (this.activeSockets().length) {
      await this.ctx.storage.setAlarm(Date.now() + DAY);
      return;
    }
    this.record = null;
    await this.ctx.storage.deleteAll();
  }

  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/internal/create/')) return this.create(pathname.split('/').at(-1));
    if (!this.record) return fail('missing', 404);
    if (pathname.endsWith('/join')) return this.join();
    if (pathname.endsWith('/status')) {
      const token = request.headers.get('Authorization')?.slice(7);
      return await this.tokenSlot(token) >= 0 ? reply({ ok: true }) : fail('expired', 401);
    }
    if (pathname.endsWith('/socket')) return this.connect(request);
    return fail('missing', 404);
  }

  async create(code) {
    if (this.record) return fail('collision', 409);
    const token = newToken();
    const hash = await digest(token);
    if (this.record) return fail('collision', 409);
    this.record = {
      code, members: [{ hash, role: 0, avatar: DEFAULT_AVATAR[0], ready: false }, null], world: null,
    };
    await this.save(true);
    return reply({ code, token, slot: 0 }, 201);
  }

  async join() {
    const token = newToken();
    const hash = await digest(token);
    if (!this.record) return fail('missing', 404);
    if (this.record.members[1] || this.record.world) return fail('full', 409);
    const role = 1 - this.record.members[0].role;
    this.record.members[1] = { hash, role, avatar: DEFAULT_AVATAR[role], ready: false };
    await this.save(true);
    this.broadcast();
    return reply({ code: this.record.code, token, slot: 1 }, 201);
  }

  async tokenSlot(token) {
    if (!token || !TOKEN_RE.test(token)) return -1;
    const hash = await digest(token);
    return this.record?.members.findIndex(member => member?.hash === hash) ?? -1;
  }

  async connect(request) {
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(p => p.trim());
    if (!protocols.includes(PROTOCOL)) return fail('upgrade', 426);
    const slot = await this.tokenSlot(protocols.find(p => p.startsWith('auth.'))?.slice(5));
    if (slot < 0) return fail('expired', 401);
    const [client, server] = Object.values(new WebSocketPair());
    for (const old of this.activeSockets(slot)) {
      old.serializeAttachment({ slot, active: false });
      old.close(4001, 'Room dibuka di sesi lain');
    }
    this.ctx.acceptWebSocket(server, ['p' + slot]);
    server.serializeAttachment({ slot, active: true });
    pause(this.record.world, Date.now());
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': PROTOCOL } });
  }

  broadcast(motionOnly = false) {
    if (!this.record) return;
    const online = this.online();
    const { code, members, world } = this.record;
    const motion = publicMotion(world);
    const movement = JSON.stringify({ t: 'motion', motion });
    for (const socket of this.activeSockets()) {
      const { slot } = socket.deserializeAttachment();
      try {
        if (motionOnly) socket.send(movement);
        else socket.send(JSON.stringify({
          t: 'state', code, self: slot, online, motion, world: publicWorld(world, slot),
          members: members.map(member => member && { role: member.role, ready: member.ready, avatar: member.avatar }),
        }));
      } catch {
        // A socket can disappear between enumeration and send. The peer receives the close event.
      }
    }
  }

  async webSocketMessage(socket, raw) {
    const auth = socket.deserializeAttachment();
    if (!auth?.active || !this.record || typeof raw !== 'string' || raw.length > 768) return;
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (!message || typeof message.t !== 'string') return;
    const now = Date.now();
    const rate = this.buckets.get(socket) ?? { at: now, credit: 22 };
    rate.credit = Math.min(22, rate.credit + (now - rate.at) * 0.014);
    rate.at = now;
    this.buckets.set(socket, rate);
    if (rate.credit < 1) return;
    rate.credit--;
    const { slot } = auth;
    const { world, members } = this.record;
    if (!world) {
      const member = members[slot];
      if (message.t === 'avatar') {
        const avatar = cleanAvatar(message.avatar, message.role);
        if (!avatar || members[1 - slot]?.role === message.role) {
          socket.send(JSON.stringify({ t: 'error', error: 'character' }));
          return;
        }
        member.role = message.role;
        member.avatar = avatar;
        member.ready = false;
      } else if (message.t === 'ready' && typeof message.value === 'boolean' && member.ready !== message.value) member.ready = message.value;
      else if (message.t === 'start' && slot === 0 && members.every(p => p?.ready) && this.online().every(Boolean)) {
        this.record.world = newWorld(now);
      } else return;
      await this.save(Boolean(this.record.world));
      this.broadcast();
      return;
    }
    if (!['input', 'answer', 'hint', 'share', 'pattern', 'continue'].includes(message.t)) return;
    const online = this.online().every(Boolean);
    advance(world, now, online);
    if (online) {
      if (message.t === 'input') applyInput(world, slot, message, now);
      else {
        const replacement = gameCommand(world, slot, message, now);
        if (replacement) this.record.world = replacement;
      }
    }
    const next = this.record.world;
    const changed = next.changed;
    const shouldSave = next.persist;
    next.changed = false;
    next.persist = false;
    if (shouldSave) await this.save(changed && ['map', 'ending'].includes(next.phase));
    this.broadcast(!changed);
  }

  async disconnected(socket) {
    const auth = socket.deserializeAttachment();
    if (!auth?.active || !this.record) return;
    socket.serializeAttachment({ ...auth, active: false });
    if (this.activeSockets(auth.slot).length) return;
    const now = Date.now();
    const world = this.record.world;
    pause(world, now);
    if (world) await this.save(true);
    this.broadcast();
  }

  async webSocketClose(socket, code, reason) {
    if (socket.readyState === 2) socket.close(code === 1005 || code === 1006 ? 1000 : code, reason);
    await this.disconnected(socket);
  }

  async webSocketError(socket) {
    await this.disconnected(socket);
  }
}
