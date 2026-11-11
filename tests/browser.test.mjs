import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { RECORDINGS } from '../src/client/audio.js';
import { startWorker, waitUntil, delay } from './server.mjs';
import { BY_ID } from '../src/server/questions.js';
import { CHAPTERS, CLIMB, CRANK, EXIT, PATTERN, PADS, RAFT_FROM, RAFT_PAD, SYMBOLS, TIMERS } from '../src/shared/chapters.js';

function watch(page) {
  const peer = { page, state: null, motion: null, problems: [], recordings: new Set() };
  page.on('pageerror', error => peer.problems.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && /\/(art|assets|audio)\/|manifest\.webmanifest|\/sw\.js/.test(response.url())) {
      peer.problems.push('Missing asset: ' + new URL(response.url()).pathname);
    }
    const path = new URL(response.url()).pathname;
    if (response.ok() && /^\/audio\/[^/]+\.mp3$/.test(path)) peer.recordings.add(path);
  });
  page.on('websocket', socket => socket.on('framereceived', ({ payload }) => {
    if (typeof payload !== 'string' || payload === 'pong') return;
    const packet = JSON.parse(payload);
    if (packet.t === 'state') { peer.state = packet; peer.motion = packet.motion; }
    if (packet.t === 'motion') peer.motion = packet.motion;
  }));
  peer.x = () => peer.motion?.players[peer.state.self][0];
  peer.y = () => peer.motion?.players[peer.state.self][1];
  peer.grounded = () => peer.motion?.players[peer.state.self][5];
  return peer;
}

async function go(peer, x, { jump = false, y = 390, run = false, tolerance = 16 } = {}) {
  const { page } = peer;
  for (let attempt = 0; attempt < 5; attempt++) {
    const from = peer.x();
    if (Math.abs(x - from) <= tolerance && !jump) {
      if (!peer.grounded()) await waitUntil(peer.grounded, 'land at x=' + peer.x(), 4000);
      return;
    }
    const dir = from > x ? -1 : 1;
    const key = dir === 1 ? 'ArrowRight' : 'ArrowLeft';
    const sprint = run && Math.abs(x - from) > 125;
    if (sprint) await page.keyboard.down('Shift');
    if (jump) await page.keyboard.down('Space');
    await page.keyboard.down(key);
    try {
      if (sprint) {
        await waitUntil(() => dir * (x - peer.x()) <= 105, 'run ' + from + ' → ' + x, 6000);
        await page.keyboard.up('Shift');
      }
      await waitUntil(() => dir * (x - peer.x()) <= 10, 'move ' + from + ' → ' + x + ' (slot ' + peer.state.self + ')', 6500);
    } finally {
      await page.keyboard.up(key);
      if (jump) await page.keyboard.up('Space');
      if (sprint) await page.keyboard.up('Shift');
    }
    if (jump) {
      await waitUntil(() => peer.grounded() && peer.y() === y, 'land on platform y=' + y + ' at x=' + peer.x(), 5500);
      return;
    }
    await delay(80);
  }
  assert.ok(Math.abs(peer.x() - x) <= tolerance + 2, 'near x=' + x + ', actually x=' + peer.x());
}

async function tap(peer) {
  await peer.page.keyboard.down('E');
  await delay(65);
  await peer.page.keyboard.up('E');
}

async function bothAt(peers, a, b = a, run = false, tolerance = 16) {
  await Promise.all([go(peers[0], a, { run, tolerance }), go(peers[1], b, { run, tolerance })]);
}

async function trivia(peers, x, options = {}) {
  const world = peers[0].state.world;
  const q = world.q;
  const slot = q % 2;
  const answering = peers[slot];
  const partner = peers[1 - slot];
  const tolerance = options.support ? 16 : 34;
  await Promise.all([go(answering, x, { run: x > 1000, tolerance }), go(partner, options.support ? CRANK : x - 10, { run: x > 1000, tolerance })]);
  if (options.support) {
    await tap(answering);
    assert.equal(answering.state.world.quiz, null, 'needs help before opening quiz');
    await partner.page.keyboard.down('E');
    await delay(160);
  }
  try {
    await tap(answering);
    const quiz = await waitUntil(() => answering.state.world.quiz, 'quiz opens at x=' + x);
    await waitUntil(() => partner.state.world.quiz?.id === quiz.id, 'both see same question');
    assert.equal(await partner.page.locator('[data-action="answer"]:enabled').count(), 0);
    const right = BY_ID.get(quiz.id).answer;
    if (options.wrong) {
      await answering.page.locator('[data-action="answer"][data-choice="' + ((right + 1) % 4) + '"]').click();
      await answering.page.locator('.quiz-retry').waitFor();
      assert.match(await answering.page.locator('.quiz-retry').innerText(), /Coba lagi/);
      assert.equal(answering.state.world.q, q);
    }
    await answering.page.locator('[data-action="answer"][data-choice="' + right + '"]').click();
    await waitUntil(() => peers.every(peer => peer.state.world.q === q + 1), 'correct answer shared');
  } finally {
    if (options.support) await partner.page.keyboard.up('E');
  }
}

async function nextStage(peers, stage) {
  await bothAt(peers, EXIT - 15, EXIT + 8, true, 35);
  await tap(peers[0]);
  await waitUntil(() => peers.every(peer => stage === 'map' ? peer.state.world.phase === 'map' : peer.state.world.stage === stage), 'both advance stage ' + stage);
}

async function holdTouch(context, page, selector) {
  const client = await context.newCDPSession(page);
  const box = await page.locator(selector).boundingBox();
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  return async () => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  };
}

const fullJourney = process.env.NUSANTARA_FULL_BROWSER === '1';

test('approved artwork covers both characters, every action, mirrored movement and existing custom looks', { timeout: 55_000 }, async t => {
  const base = await startWorker(t);
  const browser = await chromium.launch(process.env.NUSANTARA_CHROMIUM
    ? { executablePath: process.env.NUSANTARA_CHROMIUM, args: ['--disable-gpu', '--no-sandbox'] } : {});
  t.after(() => browser.close());
  const page = await browser.newPage();
  const modules = {};
  for (const path of ['client/avatar.js', 'client/avatar-sprites.js', 'shared/avatar-options.js']) {
    modules['/src/' + path] = await readFile(new URL('../src/' + path, import.meta.url), 'utf8');
  }
  await page.route(/\/src\/(client\/avatar(?:-sprites)?|shared\/avatar-options)\.js$/, route =>
    route.fulfill({ contentType: 'text/javascript', body: modules[new URL(route.request().url()).pathname] }));
  await page.goto(base);
  await page.waitForFunction(() => {
    const canvases = [...document.querySelectorAll('.hero-avatars canvas')];
    return canvases.length === 2 && canvases.every(canvas => canvas.width === 320 && canvas.height === 364
      && canvas.getContext('2d').getImageData(0, 0, 320, 364).data.some(value => value));
  });
  const result = await page.evaluate(async () => {
    const { drawAvatar } = await import('/src/client/avatar.js');
    const { spriteArtReady, hasSpriteLook } = await import('/src/client/avatar-sprites.js');
    const { DEFAULT_AVATAR, SKIN, HEAD, CLOTH, OUTFIT, ACCESSORY } = await import('/src/shared/avatar-options.js');
    const loaded = await spriteArtReady;
    const poses = [
      ['idle', 0, 0], ['walk', 0, 1], ['walk', 108, 2], ['walk', 216, 3], ['walk', 324, 2],
      ['run', 0, 6], ['run', 125, 7], ['jump', 0, 4], ['land', 0, 5], ['push', 0, 8],
      ['lift', 0, 9], ['rope', 0, 10], ['use', 0, 10], ['celebrate', 0, 11], ['correct', 0, 11],
    ];
    const actual = document.createElement('canvas');
    const expected = document.createElement('canvas');
    actual.width = expected.width = 320;
    actual.height = expected.height = 364;
    const ctx = actual.getContext('2d', { willReadFrequently: true });
    const reference = expected.getContext('2d', { willReadFrequently: true });
    const failures = loaded.filter(result => result.status === 'rejected').map(() => 'sprite asset failed to load');
    let checked = 0;
    for (const role of [0, 1]) {
      const defaultFrames = new Map();
      const sheet = new Image();
      sheet.src = '/art/' + ['iren', 'adit'][role] + '-sprites.webp';
      await sheet.decode();
      if (sheet.naturalWidth !== 2304 || sheet.naturalHeight !== 896) failures.push('sheet size ' + role);
      for (const [pose, ms, frame] of poses) {
        for (const face of [-1, 1]) {
          drawAvatar(ctx, DEFAULT_AVATAR[role], role, pose, ms, face);
          reference.clearRect(0, 0, 320, 364);
          reference.save();
          if (face < 0) { reference.translate(320, 0); reference.scale(-1, 1); }
          reference.drawImage(sheet, frame % 6 * 384, Math.floor(frame / 6) * 448, 384, 448, 4, 0, 312, 364);
          reference.restore();
          const pixels = ctx.getImageData(0, 0, 320, 364).data;
          const wanted = reference.getImageData(0, 0, 320, 364).data;
          if (!pixels.every((value, i) => value === wanted[i])) failures.push([role, pose, ms, face].join('/'));
          if (!pixels.some((value, i) => i % 4 === 3 && value > 128)) failures.push('empty ' + pose);
          if (face === 1) defaultFrames.set(frame, pixels);
          checked++;
        }
      }
      const choices = { skin: SKIN, head: HEAD[role], cloth: CLOTH, outfit: OUTFIT, accessory: ACCESSORY };
      for (const [field, options] of Object.entries(choices)) {
        for (let choice = 0; choice < options.length; choice++) {
          const look = { ...DEFAULT_AVATAR[role], [field]: choice };
          for (const [pose, ms, frame] of poses) {
            drawAvatar(ctx, look, role, pose, ms);
            const pixels = ctx.getImageData(0, 0, 320, 364).data;
            if (!pixels.some((value, i) => i % 4 === 3 && value > 128)) {
              failures.push('custom ' + [role, field, choice, pose].join('/'));
            }
            if (choice !== DEFAULT_AVATAR[role][field] && pixels.every((value, i) => value === defaultFrames.get(frame)[i])) {
              failures.push('option had no effect ' + [role, field, choice, pose].join('/'));
            }
            checked++;
          }
        }
      }
      if (hasSpriteLook(DEFAULT_AVATAR[role], role, 'leo')) failures.push('ending variation');
    }
    return { checked, failures };
  });
  assert.ok(result.checked > 700);
  assert.deepEqual(result.failures, []);
});

test('two mobile-sized Chromium sessions finish ' + (fullJourney ? 'the six-island adventure' : 'Sumatra') + ' through the player UI', { timeout: fullJourney ? 430_000 : 165_000 }, async t => {
  const base = await startWorker(t);
  const launch = process.env.NUSANTARA_CHROMIUM ? { executablePath: process.env.NUSANTARA_CHROMIUM, args: ['--disable-gpu', '--no-sandbox'] } : {};
  const browsers = await Promise.all([chromium.launch(launch), chromium.launch(launch)]);
  t.after(() => Promise.all(browsers.map(browser => browser.close())));
  const contexts = await Promise.all(browsers.map((browser, i) => browser.newContext({
    viewport: { width: i === 0 ? 844 : 915, height: i === 0 ? 390 : 412 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 1,
  })));
  const [a, b] = (await Promise.all(contexts.map(context => context.newPage()))).map(watch);
  const peers = [a, b];
  await Promise.all(peers.map(peer => peer.page.addInitScript(() => {
    const create = AudioContext.prototype.createOscillator;
    const createBufferSource = AudioContext.prototype.createBufferSource;
    window.playedNotes = 0;
    window.playedLoops = 0;
    AudioContext.prototype.createBufferSource = function () {
      const source = createBufferSource.call(this);
      const start = source.start.bind(source);
      source.start = (...args) => {
        if (source.loop && source.buffer?.duration > 0) window.playedLoops++;
        return start(...args);
      };
      return source;
    };
    AudioContext.prototype.createOscillator = function () {
      const oscillator = create.call(this);
      const start = oscillator.start.bind(oscillator);
      oscillator.start = (...args) => { window.playedNotes++; return start(...args); };
      return oscillator;
    };
  })));
  const output = '.test-output/browser';
  await mkdir(output, { recursive: true });
  t.after(async () => {
    if (a.page.isClosed()) return;
    await a.page.screenshot({ path: output + '/last-host.png' }).catch(() => {});
    await b.page.screenshot({ path: output + '/last-guest.png' }).catch(() => {});
  });
  await a.page.goto(base);
  await a.page.locator('.hero-avatars canvas').first().waitFor();
  await a.page.screenshot({ path: output + '/menu-landscape.png' });
  await a.page.getByRole('button', { name: 'Buat Room', exact: true }).click();
  await a.page.locator('#lobby-code').waitFor();
  const invite = await a.page.locator('#invite-link').inputValue();
  await b.page.goto(invite);
  await b.page.getByRole('button', { name: 'Gabung Room', exact: true }).click();
  await waitUntil(() => peers.every(peer => peer.state?.online.every(Boolean)), 'two browser members');
  await a.page.getByRole('button', { name: 'Ubah Penampilan' }).click();
  await a.page.locator('[data-avatar-field="head"]').selectOption('2');
  await a.page.locator('[data-avatar-field="skin"]').selectOption('3');
  await a.page.getByRole('button', { name: 'Simpan Penampilan' }).click();
  await waitUntil(() => b.state.members[0].avatar.head === 2 && b.state.members[0].avatar.skin === 3, 'customization sync');
  await b.page.getByRole('button', { name: 'Saya Siap' }).click();
  await a.page.getByRole('button', { name: 'Saya Siap' }).click();
  await a.page.getByRole('button', { name: 'Mulai Game' }).click();
  await Promise.all(peers.map(peer => peer.page.locator('#phaser canvas').waitFor()));
  await waitUntil(() => peers.every(peer => peer.state.world?.stage === 0 && peer.state.world.phase === 'play'), 'Aceh loaded');
  await delay(400);
  await a.page.screenshot({ path: output + '/aceh.png' });
  assert.equal(await a.page.locator('#screen').getAttribute('data-music'), 'aceh');
  await Promise.all(peers.map(peer => peer.page.waitForFunction(() => window.playedLoops > 0)));
  const zoom = a.page.getByRole('button', { name: 'Zoom out', exact: true });
  const zoomBox = await zoom.boundingBox();
  assert.ok(zoomBox.width >= 44 && zoomBox.height >= 44, 'zoom has a touch target of at least 44 CSS pixels');
  await zoom.tap();
  assert.equal(await zoom.getAttribute('aria-pressed'), 'true');
  assert.equal(await b.page.getByRole('button', { name: 'Zoom out', exact: true }).getAttribute('aria-pressed'), 'false');
  const stopJump = await holdTouch(contexts[0], a.page, '[data-control="jump"]');
  await delay(130);
  await stopJump();
  await waitUntil(() => b.motion.players[0][1] < 380, 'touch jump visible to remote');
  await waitUntil(a.grounded, 'touch jump lands');
  await zoom.tap();
  assert.equal(await zoom.getAttribute('aria-pressed'), 'false');
  for (const peer of peers) {
    for (const button of await peer.page.locator('.game-controls button').all()) {
      const box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, 'touch targets are at least 44 CSS pixels');
    }
  }
  const touch = await contexts[0].newCDPSession(a.page);
  const points = await Promise.all(['right', 'jump'].map(async (control, i) => {
    const box = await a.page.locator('[data-control="' + control + '"]').boundingBox();
    return { id: i + 1, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }));
  const beforeTouch = a.x();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await waitUntil(() => b.motion.players[0][0] > beforeTouch + 12 && b.motion.players[0][1] < 380, 'two-finger movement and jump sync');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await touch.detach();
  await a.page.waitForFunction(() => document.querySelectorAll('[data-control].held').length === 0);
  await waitUntil(a.grounded, 'cancelled touch jump lands');

  const releaseMove = await holdTouch(contexts[0], a.page, '[data-control="right"]');
  await a.page.locator('[data-control="right"].held').waitFor();
  await b.page.goto('about:blank');
  await waitUntil(() => a.state.online[1] === false, 'peer navigation pauses controls');
  assert.equal(await a.page.locator('[data-control].held').count(), 0);
  await releaseMove();
  await b.page.goto(invite);
  await b.page.getByRole('button', { name: 'Gabung Room', exact: true }).click();
  await waitUntil(() => peers.every(peer => peer.state.online.every(Boolean)), 'touch interruption reconnects');
  await waitUntil(a.grounded, 'resumed player lands');
  const resting = a.x();
  await delay(350);
  assert.equal(a.x(), resting, 'old touch movement does not resume after reconnection');
  await trivia(peers, 312, { wrong: true });
  await bothAt(peers, 445, 467);
  await a.page.keyboard.down('E');
  await waitUntil(() => b.motion.bridge, 'bridge opens on held switch');
  await go(b, 873, { run: true });
  await tap(b);
  await waitUntil(() => a.state.world.puzzle.done, 'far lever locks bridge');
  await a.page.keyboard.up('E');
  await trivia(peers, 1000);
  await trivia(peers, 1175);
  await nextStage(peers, 1);
  assert.equal(await b.page.locator('#screen').getAttribute('data-music'), 'toba');
  await b.page.waitForFunction(() => window.playedNotes > 0);

  await trivia(peers, 312);
  await bothAt(peers, RAFT_FROM - RAFT_PAD, RAFT_FROM + RAFT_PAD);
  await a.page.keyboard.down('E');
  await delay(430);
  assert.equal(a.motion.raftX, RAFT_FROM, 'raft waits for second player');
  await b.page.keyboard.down('E');
  await waitUntil(() => b.state.world.puzzle.done && a.motion.raftX === 835, 'two-player raft crosses', 7000);
  await Promise.all(peers.map(peer => peer.page.keyboard.up('E')));
  await trivia(peers, 1000);
  await trivia(peers, 1175);
  await nextStage(peers, 2);
  assert.equal(await a.page.locator('#screen').getAttribute('data-music'), 'minang');

  await trivia(peers, 312);
  await go(a, 266, { jump: true, y: 344 });
  await go(a, 369, { jump: true, y: 297 });
  await go(a, 451, { jump: true, y: 250 });
  await tap(a);
  await waitUntil(() => a.state.world.puzzle.first, 'private high clue');
  assert.equal(b.state.world.puzzle.first, null);
  await go(b, 744, { run: true });
  await tap(b);
  await b.page.getByRole('button', { name: 'Bagikan Petunjuk' }).click();
  await a.page.getByRole('button', { name: 'Bagikan Petunjuk' }).click();
  await go(b, PATTERN);
  await tap(b);
  await waitUntil(() => b.state.world.puzzle.patternOpen, 'pattern panel opens');
  const index = SYMBOLS.indexOf(b.state.world.puzzle.first);
  await b.page.locator('[data-action="pattern"][data-choice="' + index + '"]').click();
  await waitUntil(() => a.state.world.puzzle.done, 'combination opens hidden gate');
  await go(a, 866, { run: true });
  await trivia(peers, 1090);
  await nextStage(peers, 3);

  await trivia(peers, 312, { support: true });
  await bothAt(peers, PADS[0], PADS[1]);
  const releaseA = await holdTouch(contexts[0], a.page, '[data-control="use"]');
  await delay(1250);
  assert.equal(b.state.world.puzzle.done, false);
  const releaseB = await holdTouch(contexts[1], b.page, '[data-control="use"]');
  await waitUntil(() => peers.every(peer => peer.state.world.puzzle.done), 'both players lift and move the heavy block', 6500);
  await Promise.all([releaseA(), releaseB()]);
  await trivia(peers, 1090);
  await nextStage(peers, 'map');
  assert.equal(a.state.world.q, 10);
  assert.deepEqual(a.state.world.pieces, [0]);
  await a.page.screenshot({ path: output + '/sumatra-complete.png' });

  await b.page.reload();
  await b.page.getByRole('button', { name: 'Gabung Room', exact: true }).click();
  await waitUntil(() => peers.every(peer => peer.state.online.every(Boolean)), 'guest reconnects after reloading');
  await b.page.getByRole('heading', { name: 'Keping ditemukan!' }).waitFor();
  assert.equal(b.state.world.q, 10);
  await Promise.all(peers.map(peer => peer.page.getByRole('button', { name: 'Lanjut ke Jawa' }).click()));
  await waitUntil(() => peers.every(peer => peer.state.world.chapter === 1 && peer.state.world.phase === 'play'), 'both advance to Jawa');
  if (fullJourney) {
    await finishJourney(peers, output);
    const expectedRecordings = Object.values(RECORDINGS).map(recording => '/audio/' + recording.file).sort();
    for (const peer of peers) assert.deepEqual([...peer.recordings].sort(), expectedRecordings);
    assert.ok(await a.page.evaluate(count => window.playedLoops >= count, expectedRecordings.length), 'all regional recordings loop during the journey');
  }
  for (const peer of peers) assert.deepEqual(peer.problems, []);
});

async function solveUI(peers, mode, chapter, stage) {
  const [a, b] = peers;
  const high = peers[(chapter + stage) % 2];
  const low = peers[1 - (chapter + stage) % 2];
  if (mode === 'bridge') {
    await bothAt(peers, 445, 467);
    await a.page.keyboard.down('E');
    await waitUntil(() => b.motion.bridge, 'bridge extends');
    await go(b, 873, { run: true });
    await tap(b);
    await waitUntil(() => a.state.world.puzzle.done, 'bridge latches');
    await a.page.keyboard.up('E');
  } else if (mode === 'raft' || mode === 'cable') {
    await bothAt(peers, RAFT_FROM - RAFT_PAD, RAFT_FROM + RAFT_PAD);
    await Promise.all(peers.map(peer => peer.page.keyboard.down('E')));
    await waitUntil(() => b.state.world.puzzle.done, 'raft or gondola crosses', 6800);
    await Promise.all(peers.map(peer => peer.page.keyboard.up('E')));
  } else if (mode === 'clues' || mode === 'timing') {
    const isClue = mode === 'clues';
    await Promise.all([
      (async () => {
        await go(high, 266, { jump: true, y: 344 });
        await go(high, 371, { jump: true, y: isClue ? 297 : 310 });
        await go(high, isClue ? 450 : TIMERS[0][0], { jump: true, y: isClue ? 250 : TIMERS[0][1] });
      })(),
      go(low, isClue ? 744 : TIMERS[1][0], { run: true }),
    ]);
    await Promise.all(peers.map(tap));
    if (isClue) {
      await Promise.all(peers.map(peer => peer.page.getByRole('button', { name: 'Bagikan Petunjuk' }).click()));
      await go(low, PATTERN);
      await tap(low);
      await waitUntil(() => low.state.world.puzzle.patternOpen && low.state.world.puzzle.first, 'shared clue sequence');
      await low.page.locator('[data-action="pattern"][data-choice="' + SYMBOLS.indexOf(low.state.world.puzzle.first) + '"]').click();
    }
    await waitUntil(() => a.state.world.puzzle.done, 'symbol or timing mechanism opens');
    await go(high, 871, { run: true });
  } else if (mode === 'climb') {
    await bothAt(peers, 451, 452);
    await Promise.all([high, low].map(async (peer, i) => {
      await go(peer, 553, { jump: true, y: 335 });
      await go(peer, 682, { jump: true, y: 280 });
      await go(peer, CLIMB[0] + i * 34, { jump: true, y: CLIMB[1] });
      await tap(peer);
    }));
    await waitUntil(() => a.state.world.puzzle.done, 'both cliff lamps lit');
    await bothAt(peers, 973, 975);
  } else {
    const x = mode === 'gate' ? [EXIT - 48, EXIT + 24] : PADS;
    await bothAt(peers, ...x);
    await Promise.all(peers.map(peer => peer.page.keyboard.down('E')));
    await waitUntil(() => peers.every(peer => peer.state.world.puzzle.done), 'dual hold completes ' + mode);
    await Promise.all(peers.map(peer => peer.page.keyboard.up('E')));
  }
}

async function finishJourney(peers, output) {
  for (let chapter = 1; chapter < CHAPTERS.length; chapter++) {
    for (const [stage, spec] of CHAPTERS[chapter].stages.entries()) {
      const [first, ...rest] = spec.quizAt;
      await trivia(peers, first, { support: spec.support });
      if (spec.mode !== 'gate') await solveUI(peers, spec.mode, chapter, stage);
      for (const x of rest) await trivia(peers, x);
      if (spec.mode === 'gate') await solveUI(peers, 'gate', chapter, stage);
      else await nextStage(peers, stage < 3 ? stage + 1 : 'map');
    }
    assert.ok(peers.every(peer => peer.state.world.q === (chapter + 1) * 10 && peer.state.world.pieces.length === chapter + 1));
    if (chapter < 5) {
      await Promise.all(peers.map(peer => peer.page.getByRole('button', { name: 'Lanjut ke ' + CHAPTERS[chapter + 1].name }).click()));
      await waitUntil(() => peers.every(peer => peer.state.world.chapter === chapter + 1 && peer.state.world.phase === 'play'), 'enter next island');
    }
  }
  for (const peer of peers) {
    await peer.page.getByRole('heading', { name: 'Senja untuk berdua' }).waitFor();
    const next = peer.page.getByRole('button', { name: /^Lanjut/ });
    for (const [title, speaker] of [['Iren dan Usamah', 'Usamah'], ['Adit dan Ika', 'Ika']]) {
      await next.click();
      await peer.page.getByRole('heading', { name: title, exact: true }).waitFor();
      assert.ok((await peer.page.locator('.ending-lines p').first().innerText()).startsWith(speaker + ': '));
      assert.equal(await peer.page.locator('.ending-cast canvas[aria-label="' + speaker + '"]').count(), 1);
    }
    await next.click();
    await peer.page.getByRole('heading', { name: 'PETUALANGAN SELESAI!' }).waitFor();
    assert.equal(await peer.page.locator('.ending-cast canvas').count(), 4);
  }
  await peers[0].page.screenshot({ path: output + '/bali-ending.png' });
  await Promise.all(peers.map(peer => peer.page.getByRole('button', { name: 'Main Lagi' }).click()));
  await waitUntil(() => peers.every(peer => peer.state.world.phase === 'play' && peer.state.world.q === 0), 'both restart together');
}

test('portrait shell has no horizontal overflow and PWA assets install locally', { timeout: 55_000 }, async t => {
  const base = await startWorker(t);
  const launch = process.env.NUSANTARA_CHROMIUM ? { executablePath: process.env.NUSANTARA_CHROMIUM, args: ['--disable-gpu', '--no-sandbox'] } : {};
  const browser = await chromium.launch(launch);
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('heading', { name: 'Petualangan Nusantara' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const manifest = await (await page.request.get(base + '/manifest.webmanifest')).json();
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'landscape');
  for (const icon of manifest.icons) assert.equal((await page.request.get(base + icon.src)).status(), 200);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Petualangan Nusantara' }).waitFor();
});
