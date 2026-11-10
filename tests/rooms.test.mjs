import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import { launchWorker, startWorker, waitUntil, delay } from './server.mjs';
import { BY_ID } from '../src/server/questions.js';
import { BRIDGE_SWITCHES, FLOOR, PIT } from '../src/shared/chapters.js';

function connect(base, membership, origin = base) {
  const url = base.replace(/^http/, 'ws') + '/api/rooms/' + membership.code + '/socket';
  const ws = new WebSocket(url, ['nusantara.v1', 'auth.' + membership.token], { origin });
  const peer = { ws, state: null, motion: null, messages: [], errors: [], status: null, closeCode: null };
  ws.on('message', raw => {
    if (raw.toString() === 'pong') { peer.pong = true; return; }
    const value = JSON.parse(raw);
    peer.messages.push(value);
    if (value.t === 'state') {
      peer.state = value;
      peer.motion = value.motion;
    }
    if (value.t === 'motion') peer.motion = value.motion;
  });
  ws.on('unexpected-response', (request, response) => {
    peer.status = response.statusCode;
    response.resume();
    request.destroy();
  });
  ws.on('close', code => { peer.closeCode = code; });
  ws.on('error', error => { peer.errors.push(error.message); });
  peer.send = value => ws.send(JSON.stringify(value));
  return peer;
}

async function api(base, path, token, origin = base) {
  const headers = { Origin: origin };
  if (token) headers.Authorization = 'Bearer ' + token;
  const result = await fetch(base + path, { method: 'POST', headers });
  return { status: result.status, ...await result.json() };
}

test('local Cloudflare runtime authenticates two isolated connections, syncs inputs, persists checkpoint and reconnects', { timeout: 65_000 }, async t => {
  const storage = process.env.NUSANTARA_URL ? null : await mkdtemp(join(tmpdir(), 'nusantara-restart-'));
  const local = storage ? await launchWorker(t, storage) : null;
  if (storage) t.after(() => rm(storage, { recursive: true, force: true }));
  const base = local?.url || await startWorker(t);
  const aRoom = await api(base, '/api/rooms');
  assert.equal(aRoom.status, 201, JSON.stringify({ status: aRoom.status, error: aRoom.error }));
  assert.match(aRoom.code, /^[A-Z2-9]{8}$/);
  assert.equal(aRoom.token.length, 43);
  const route = '/api/rooms/' + aRoom.code;
  assert.equal((await api(base, route + '/join', null, 'https://other.example')).status, 403);
  const a = connect(base, aRoom);
  const peers = [a];
  t.after(() => peers.forEach(p => p.ws.terminate()));
  await waitUntil(() => a.state?.online[0], 'host connected');
  assert.equal(a.state.members[1], null);
  a.send({ t: 'avatar', role: 1, avatar: { skin: 4, head: 4, cloth: 2, outfit: 1, accessory: 3 } });
  await waitUntil(() => a.state.members[0].role === 1, 'host reserves Adit');
  const [first, second] = await Promise.all([api(base, route + '/join'), api(base, route + '/join')]);
  const bRoom = [first, second].find(item => item.status === 201);
  assert.deepEqual([first.status, second.status].sort(), [201, 409]);
  assert.notEqual(bRoom.token, aRoom.token);
  const unauthorized = connect(base, { ...aRoom, token: 'A'.repeat(43) });
  peers.push(unauthorized);
  await waitUntil(() => unauthorized.status, 'invalid credential rejected');
  assert.equal(unauthorized.status, 401);
  const b = connect(base, bRoom);
  peers.push(b);
  await waitUntil(() => a.state.online.every(Boolean) && b.state?.online.every(Boolean), 'both online');
  assert.equal(b.state.members[0].avatar.skin, 4);
  assert.equal(b.state.members[1].role, 0);
  assert.equal((await api(base, route + '/join')).status, 409);
  b.send({ t: 'start' });
  a.send({ t: 'start' });
  await delay(120);
  assert.equal(a.state.world, null);
  a.send({ t: 'ready', value: true });
  b.send({ t: 'ready', value: true });
  await waitUntil(() => a.state.members.every(p => p.ready), 'both ready');
  a.send({ t: 'start' });
  await waitUntil(() => a.state.world?.phase === 'play' && b.state.world?.phase === 'play', 'synced world');
  assert.equal(a.state.world.run, b.state.world.run);
  assert.equal(a.state.world.order, undefined, 'future questions remain private');
  assert.equal(JSON.stringify(a.state).includes(aRoom.token), false);

  const initial = a.motion.players[0][0];
  a.send({ t: 'input', dir: 1, run: true });
  for (let i = 0; i < 7; i++) {
    await delay(92);
    a.send({ t: 'input', dir: 1, run: true, x: 1500 });
  }
  a.send({ t: 'input', dir: 0 });
  await waitUntil(() => a.motion.players[0][0] > initial + 120 && b.motion.players[0][0] === a.motion.players[0][0], 'server-derived movement visible to both');
  assert.ok(a.motion.players[0][0] < 390);
  a.send({ t: 'input', jump: true });
  await delay(120);
  a.send({ t: 'input' });
  await waitUntil(() => b.motion.players[0][1] < 390, 'jump synced');
  for (let i = 0; i < 9; i++) {
    await delay(95);
    a.send({ t: 'input' });
  }

  a.send({ t: 'input', use: true });
  await waitUntil(() => a.state.world.quiz && b.state.world.quiz, 'shared trivia panel');
  assert.equal(a.state.world.quiz.id, b.state.world.quiz.id);
  assert.equal(a.state.world.quiz.answer, undefined);
  const { id } = a.state.world.quiz;
  a.send({ t: 'input' });
  a.send({ t: 'answer', id, choice: BY_ID.get(id).answer });
  await waitUntil(() => a.state.world.q === 1 && b.state.world.q === 1, 'trivia checkpoint written');
  b.ws.close(1000);
  await waitUntil(() => a.state.online[1] === false, 'disconnect broadcast');
  const before = a.motion.players[0][0];
  a.send({ t: 'input', dir: 1 });
  await delay(130);
  a.send({ t: 'input' });
  assert.equal(a.motion.players[0][0], before, 'progress is paused when peer disconnects');

  const again = connect(base, bRoom);
  peers.push(again);
  await waitUntil(() => again.state?.online.every(Boolean) && a.state.online[1], 'guest reconnect');
  assert.equal(again.state.world.q, 1);
  assert.equal(again.state.world.run, a.state.world.run);
  again.ws.send('ping');
  await waitUntil(() => again.pong, 'hibernation automatic pong');

  const replacement = connect(base, aRoom);
  peers.push(replacement);
  await waitUntil(() => a.closeCode === 4001 && replacement.state?.world.q === 1, 'old socket invalidated by new socket');
  assert.equal(replacement.state.self, 0);
  assert.equal((await api(base, route + '/status', bRoom.token)).status, 200);

  if (local) {
    const run = replacement.state.world.run;
    replacement.ws.close(1000);
    await waitUntil(() => again.state.online[0] === false, 'checkpoint written on final disconnect');
    again.ws.close(1000);
    await local.stop();
    const restarted = await launchWorker(t, storage);
    const restored = connect(restarted.url, aRoom);
    peers.push(restored);
    await waitUntil(() => restored.state?.world.q === 1, 'SQLite checkpoint restored after Worker process restart');
    assert.equal(restored.state.world.run, run);
    assert.equal(restored.state.members[0].avatar.skin, 4);
  }
});

test('two WebSocket players raise, interrupt, reconnect and lock the Aceh bridge before trivia', { timeout: 65_000 }, async t => {
  const base = await startWorker(t);
  const hostRoom = await api(base, '/api/rooms');
  const guestRoom = await api(base, '/api/rooms/' + hostRoom.code + '/join');
  const peers = [connect(base, hostRoom), connect(base, guestRoom)];
  const sockets = [...peers];
  t.after(() => sockets.forEach(peer => peer.ws.terminate()));
  await waitUntil(() => peers.every(peer => peer.state?.online.every(Boolean)), 'both players online');
  peers.forEach(peer => peer.send({ t: 'ready', value: true }));
  await waitUntil(() => peers.every(peer => peer.state.members.every(member => member.ready)), 'both ready');
  peers[0].send({ t: 'start' });
  await waitUntil(() => peers.every(peer => peer.state.world?.phase === 'play'), 'Aceh starts');

  const controls = [{}, {}];
  const pulse = setInterval(() => peers.forEach((peer, slot) => {
    if (peer.ws.readyState === WebSocket.OPEN) peer.send({ t: 'input', ...controls[slot] });
  }), 95);
  t.after(() => clearInterval(pulse));
  const set = (slot, input) => {
    controls[slot] = input;
    peers[slot].send({ t: 'input', ...input });
  };
  const move = async (slot, target) => {
    const direction = Math.sign(target - peers[slot].motion.players[slot][0]);
    set(slot, { dir: direction, run: true });
    try {
      await waitUntil(() => direction * (target - peers[slot].motion.players[slot][0]) <= 14, 'move to ' + target, 6500);
    } finally {
      set(slot, {});
    }
    await waitUntil(() => peers[slot].motion.players[slot][5], 'land at ' + target);
  };

  await Promise.all([move(0, BRIDGE_SWITCHES[0]), move(1, PIT[0] - 24)]);
  set(0, { use: true });
  await waitUntil(() => peers.every(peer => peer.motion.meter > 0 && peer.motion.meter < 100), 'shared raising progress');
  await waitUntil(() => peers.every(peer => peer.motion.bridge && peer.motion.meter === 100), 'both see the raised bridge');
  assert.equal(peers[0].state.world.q, 0, 'the lever works before the first answer');
  await move(1, (PIT[0] + PIT[1]) / 2);
  peers[1].ws.close(1000);
  controls[0] = {};
  await waitUntil(() => peers[0].state.online[1] === false, 'disconnect pauses the bridge');
  assert.equal(peers[0].motion.bridge, false);
  assert.equal(peers[0].motion.meter, 0);
  assert.ok(peers[0].motion.players[1][0] < PIT[0], 'the crossing player returns to the safe bank');
  assert.equal(peers[0].motion.players[1][1], FLOOR);

  peers[1] = connect(base, guestRoom);
  sockets.push(peers[1]);
  await waitUntil(() => peers.every(peer => peer.state?.online.every(Boolean)), 'guest rejoins');
  assert.equal(peers[1].state.world.run, peers[0].state.world.run);
  set(0, { use: true });
  await waitUntil(() => peers.every(peer => peer.motion.bridge), 'bridge raises again');
  await move(1, BRIDGE_SWITCHES[1]);
  set(1, { use: true });
  await waitUntil(() => peers.every(peer => peer.state.world.puzzle.done), 'far latch locks on both sessions');
  set(0, {});
  set(1, {});
  await move(0, BRIDGE_SWITCHES[1] + 60);
  assert.ok(peers.every(peer => peer.motion.bridge && peer.motion.meter === 100));
  assert.equal(peers[0].state.world.q, 0);
});
