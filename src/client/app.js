import '@fontsource-variable/fraunces';
import '@fontsource-variable/plus-jakarta-sans';
import './style.css';
import {
  CHAPTERS, CAST, LABELS, EXIT, FLOOR, PIT, CRANK, BRIDGE_SWITCHES, BRIDGE_REACH, PADS, RAFT_PAD,
  CLUE_HIGH, CLUE_LOW, PATTERN, SYMBOLS, TIMERS, CLIMB, stageOf, stageQuestionStart, within,
} from '../shared/chapters.js';
import { SKIN, HEAD, CLOTH, OUTFIT, ACCESSORY, DEFAULT_AVATAR } from '../shared/avatar-options.js';
import { RoomConnection, errors, normalizedCode, storeRead, storeWrite } from './network.js';
import { AudioEngine, MUSIC } from './audio.js';
import { drawAvatar, AVATAR_WIDTH, AVATAR_HEIGHT, AVATAR_PIXELS } from './avatar.js';
import { spriteArtReady } from './avatar-sprites.js';

const $ = selector => document.querySelector(selector);
const view = $('#screen');
const topbar = $('#topbar');
const overlay = $('#overlay');
const toastBox = $('#toast');
const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ESCAPE[char]);
const btn = (label, action, variant = 'secondary', extra = '') => '<button class="btn ' + variant + '" data-action="' + action + '" ' + extra + '>' + label + '</button>';
const icon = '<img class="brand-icon" src="/art/icon.svg" alt="">';
const avatarSize = `width="${AVATAR_WIDTH * AVATAR_PIXELS}" height="${AVATAR_HEIGHT * AVATAR_PIXELS}"`;
const avatars = structuredClone(storeRead('nusantara-avatars-v1', DEFAULT_AVATAR));
let preferred = storeRead('nusantara-role-v1', 0) === 1 ? 1 : 0;
const settings = { music: .6, effects: .75, mute: false, ...storeRead('nusantara-settings-v1', {}) };
const audio = new AudioEngine(settings);
const invite = normalizedCode(new URLSearchParams(location.search).get('room'));
let data = null;
let screen = '';
let connState = 'closed';
let roomPending = false;
let applyPreferences = false;
let soundFeedback = '';
let soundNotice = '';
let sceneKey = '';
let flashUntil = 0;
let quizTimer;
let toastTimer;
let modal = null;
let customizeRole = 0;
let phaser = null;
let renderKey = 0;
let endingIndex = 0;
let forceActions = false;
let lastToast = '';
let actionLock = '';
let lastFocused = null;

const room = new RoomConnection(receive, onConnection, text => {
  if (connState === 'closed' && !data) showEnter(invite || room.saved?.code || '');
  showToast(text, 'warn');
});

function selectScreen(name, markup) {
  if (screen === 'play' && name !== 'play') {
    releaseAll();
    if (phaser) phaser.destroy(true);
    phaser = null;
    renderKey++;
  }
  screen = name;
  document.body.dataset.screen = name;
  view.innerHTML = markup;
  updateTop();
}

function updateTop() {
  if (screen === 'play') {
    topbar.hidden = true;
    return;
  }
  topbar.hidden = false;
  topbar.innerHTML = '<button class="brand" data-action="home">' + icon +
    '<span>NUSANTARA<span class="brand-sub">IREN &amp; ADIT</span></span></button>' +
    '<div class="top-right"><span class="badge">✦ &nbsp; KOOPERATIF · 2 PEMAIN</span>' +
    btn('Pengaturan', 'settings', 'ghost') + '</div>';
}

function showToast(text, type = 'info', duration = 3100) {
  lastToast = text;
  toastBox.hidden = false;
  toastBox.dataset.kind = type;
  toastBox.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastBox.hidden = true; lastToast = ''; }, duration);
}

function showHome() {
  closeModal();
  audio.change('aceh');
  const resume = room.saved ? btn('Lanjutkan room ' + esc(room.saved.code), 'resume', 'ghost') : '';
  selectScreen('home', `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow"><span></span> JURNAL PETUALANGAN</p>
      <h1>Petualangan<br><em>Nusantara</em></h1>
      <p class="hero-names">Iren <span>&amp;</span> Adit</p>
      <p class="lede">Satu kompas tua, enam keping yang hilang, dan dua penjelajah yang harus kompak.</p>
      <div class="hero-actions">${btn('Mulai Petualangan <span aria-hidden="true">→</span>', 'start-menu', 'primary')}${resume}</div>
      <div class="hero-quick">${btn('Buat Room', 'create')}${btn('Gabung Room', 'join-menu')}${btn('Pilih Karakter', 'characters')}${btn('Cara Bermain', 'help')}</div>
    </div>
    <div class="hero-scene">
      <div class="hero-label"><span>✦</span> EKSPEDISI 01 <b>SUMATRA</b></div>
      <img class="hero-postcard" src="/art/referensi-sumatra.webp" alt="Cuplikan papan cerita Sumatra">
      <div class="art-compass" aria-hidden="true">✧</div>
      <div class="hero-avatars">
        <canvas ${avatarSize} data-avatar="iren" aria-label="Iren"></canvas>
        <canvas ${avatarSize} data-avatar="adit" aria-label="Adit"></canvas>
      </div>
      <span class="hero-bottom">Iren dan Adit · siap berangkat</span>
    </div>
  </section>
  <footer class="home-footer"><span>01–06 &nbsp; <b>Jejak Kepulauan</b></span><span>Sumatra · Jawa · Kalimantan · Sulawesi · Papua · Bali</span></footer>`);
}

function showEnter(code = '', mode = 'join') {
  closeModal();
  selectScreen('enter', `<section class="frame enter-frame">
    <p class="eyebrow"><span></span> CATATAN PERJALANAN</p>
    <h1>Berangkat berdua</h1>
    <p>Bagikan kode atau tautan room ke satu teman. Kalian bisa main dari dua ponsel.</p>
    <div class="enter-grid">
      <article class="field-card"><span class="overline">PILIHAN 01</span><h2>Buat Room</h2><p>Buat room dan undang satu teman.</p>${btn('Buat Room', 'create', 'primary')}</article>
      <form id="join-form" class="field-card"><span class="overline">PILIHAN 02</span><h2>Gabung Room</h2>
        <label for="room-code">Kode dari teman</label><input id="room-code" name="code" required maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(code)}" placeholder="ABCD2345">
        <button class="btn primary" type="submit">Gabung Room</button>
      </form>
    </div>
    <div class="row">${btn('Kembali ke Menu', 'home', 'ghost')}${room.saved && mode !== 'join' ? btn('Lanjutkan Room', 'resume') : ''}</div>
  </section>`);
}

async function enter(mode, code) {
  if (roomPending) return;
  roomPending = true;
  audio.unlock();
  applyPreferences = mode !== 'resume';
  document.querySelectorAll('[data-action="create"], #join-form button').forEach(node => { node.disabled = true; });
  try {
    if (mode === 'resume') room.use();
    else await room.enter(mode, code);
    if (!data) showToast('Menyambungkan ke room…', 'info', 1800);
  } catch (error) {
    showToast(errors[error.message] || errors.busy, 'warn');
  } finally {
    roomPending = false;
    document.querySelectorAll('[data-action="create"], #join-form button').forEach(node => { node.disabled = false; });
  }
}

function onConnection(status) {
  connState = status;
  if (status === 'retry' || status === 'closed') releaseAll(false);
  if (screen === 'play') updateMotionUI();
  else if (screen === 'lobby') updateLobby();
  else if (screen === 'map') updateMapContinue();
  else if (screen === 'ending') updateEndingReplay();
}

function receive(packet) {
  if (packet.t === 'motion') {
    if (!data) return;
    data.motion = packet.motion;
    if (screen === 'play') updateMotionUI();
    return;
  }
  if (packet.t !== 'state') return;
  data = packet;
  if (!packet.online.every(Boolean)) releaseAll(false);
  if (!packet.world) {
    if (screen !== 'lobby') showLobby();
    else updateLobby();
    if (applyPreferences) {
      applyPreferences = false;
      const me = packet.members[packet.self];
      const role = packet.members[1 - packet.self]?.role === preferred ? me.role : preferred;
      if (!me.ready && (me.role !== role || JSON.stringify(me.avatar) !== JSON.stringify(avatars[role]))) {
        room.send({ t: 'avatar', role, avatar: avatars[role] });
      }
    }
    return;
  }
  if (modal?.type === 'avatar') closeModal();
  const { world } = packet;
  const nextKey = [world.run, world.chapter, world.stage].join(':');
  if (world.phase === 'play') {
    if (screen !== 'play') showPlay();
    if (nextKey !== sceneKey) {
      sceneKey = nextKey;
      soundNotice = '';
      soundFeedback = '';
      audio.change(stageOf(world).theme);
      audio.cue(world.q === 0 ? 'explore' : 'travel');
      $('#stage-caption').textContent = stageOf(world).quote;
      $('#stage-caption').classList.add('shown');
      clearTimeout(quizTimer);
      quizTimer = setTimeout(() => $('#stage-caption')?.classList.remove('shown'), 5900);
    }
    updatePlay();
  } else if (world.phase === 'map') {
    if (screen !== 'map') { audio.cue('success'); showMap(false); }
    else updateMapContinue();
  } else {
    if (screen !== 'ending') { endingIndex = 0; audio.change('senja'); audio.cue('final'); showEnding(); }
    else updateEndingReplay();
  }
}

function roomInvite() {
  const url = new URL('/', location.origin);
  url.searchParams.set('room', data.code);
  return url.href;
}

function showLobby() {
  closeModal();
  const link = roomInvite();
  selectScreen('lobby', `<section class="frame lobby-frame">
    <div class="lobby-head"><div><p class="eyebrow"><span></span> TITIK KUMPUL</p><h1>Room Petualangan</h1><p>Kalian berangkat begitu kedua penjelajah siap.</p></div>
      <div class="room-ticket"><span>KODE ROOM</span><strong id="lobby-code">${esc(data.code)}</strong></div>
    </div>
    <div class="invite-row"><label for="invite-link" class="sr-only">Tautan undangan</label><input id="invite-link" readonly value="${esc(link)}">
      ${btn('Salin Tautan', 'copy-invite')}<a class="btn whatsapp" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent('Yuk main Petualangan Nusantara bareng! ' + link)}">WhatsApp ↗</a></div>
    <div id="lobby-members" class="lobby-members"></div>
    <div class="lobby-foot"><div id="room-status" aria-live="polite"></div><div class="row" id="room-actions"></div></div>
    ${btn('Kembali ke Menu', 'home', 'ghost')}
  </section>`);
  updateLobby();
}

function updateLobby() {
  if (!data || !$('#lobby-members')) return;
  const me = data.members[data.self];
  const names = ['Perempuan', 'Laki-laki'];
  $('#lobby-members').innerHTML = CAST.map((name, role) => {
    const i = data.members.findIndex(member => member?.role === role);
    const member = i >= 0 ? data.members[i] : null;
    const self = i === data.self;
    return `<article class="player-card role-${role} ${self ? 'is-me' : ''}" data-role="${role}">
      <canvas ${avatarSize} data-avatar="lobby-${role}" aria-label="${name}"></canvas>
      <div><p class="overline">${names[role]}</p><h2>${name}</h2>
        <p class="player-status">${member ? (self ? 'Kamu' : 'Sudah dipilih · teman') + ' · ' + (data.online[i] ? (member.ready ? 'Siap' : 'Belum siap') : 'Terputus') : 'Bisa dipilih'}</p>
        ${self ? btn('Ubah Penampilan', 'customize', 'mini', 'data-role="' + role + '"') : member ? '' : btn('Pilih ' + name, 'claim', 'mini', 'data-role="' + role + '"')}
      </div>
    </article>`;
  }).join('');
  const bothHere = data.online.every(Boolean);
  const bothReady = data.members.every(member => member?.ready);
  $('#room-status').textContent = connState === 'retry' ? 'Menyambungkan kembali…'
    : bothHere ? (bothReady ? 'Kedua pemain siap.' : 'Tandai siap setelah memilih penampilan.')
      : 'Menunggu teman membuka undangan…';
  $('#room-actions').innerHTML =
    btn(me.ready ? 'Batalkan Siap' : 'Saya Siap', 'ready', me.ready ? 'secondary' : 'primary', connState !== 'open' ? 'disabled' : '') +
    (data.self === 0 ? btn('Mulai Game', 'begin', 'primary', bothHere && bothReady ? '' : 'disabled') : '');
}

function showPlay() {
  closeModal();
  selectScreen('play', `<section class="game">
    <div id="phaser" class="game-canvas" aria-label="Dunia permainan Petualangan Nusantara"></div>
    <div class="game-hud">
      <div class="game-head">
        <div class="game-location">${icon}<div><span id="game-location-small" class="overline"></span><b id="game-location-title"></b></div></div>
        <div class="hud-pills">
          <span class="hud-pill" id="quiz-count"></span><span class="hud-pill" id="piece-count"></span>
          ${btn('Peta', 'map-open', 'hud-button')}${btn('⚙', 'settings', 'hud-button', 'aria-label="Pengaturan"')}
        </div>
      </div>
      <div class="objective-row"><p id="objective"></p><p id="stage-caption" aria-live="polite"></p></div>
    </div>
    <div id="game-panel" class="game-panel" hidden></div>
    <div id="game-status" class="game-status" aria-live="polite" hidden></div>
    <div id="clue-fob" class="clue-fob" hidden></div>
    <div class="game-controls" aria-label="Kontrol permainan">
      <div class="move-pad">
        <button class="control control-dir" data-control="left" aria-label="Kiri"><span>◀</span><small>Kiri</small></button>
        <button class="control control-dir" data-control="right" aria-label="Kanan"><span>▶</span><small>Kanan</small></button>
        <button class="control control-run" data-action="sprint" aria-label="Lari" aria-pressed="false"><span>»</span><small>Lari</small></button>
      </div>
      <div class="control-tip" id="control-tip" aria-live="off"></div>
      <div class="action-pad">
        <button class="control control-jump" data-control="jump" aria-label="Lompat"><span>↑</span><small>Lompat</small></button>
        <button class="control control-use" data-control="use" aria-label="Aksi"><span>✦</span><small>Aksi</small></button>
      </div>
    </div>
    <div class="rotate-tip">↻ Putar ponsel ke posisi mendatar agar jalurnya terlihat lebih luas.</div>
  </section>`);
  wireTouch();
  const key = ++renderKey;
  import('./scene.js').then(({ mountGame }) => {
    if (key === renderKey && screen === 'play') phaser = mountGame($('#phaser'), () => data);
  }).catch(() => showToast('Pemandangan belum berhasil dimuat. Muat ulang halaman untuk kembali ke room.', 'warn', 6000));
}

function objectiveFor(world) {
  const stage = stageOf(world);
  const start = stageQuestionStart(world);
  const target = stage.quizAt[world.q - start];
  const slot = data.self;
  const cast = i => CAST[data.members[i].role];
  if (stage.mode === 'bridge') {
    const { bridge, pad, meter } = data.motion;
    if (!world.puzzle.done) {
      if (pad[slot]) return bridge ? 'Tahan Aksi. ' + cast(1 - slot) + ' menyeberang dan mengunci papan.'
        : 'Tetap tahan Aksi. Papan terangkat ' + meter + '%.';
      if (bridge) return 'Papan sudah rata. Seberang dan tekan Aksi di pengunci kanan.';
      if (pad[1 - slot]) return 'Tunggu papan rata sebelum menyeberang.';
      if (localPosition()?.x >= PIT[1]) return 'Tunggu temanmu menahan tuas, lalu tekan Aksi di pengunci.';
      if (world.q === start && localPosition()?.x < BRIDGE_SWITCHES[0] - BRIDGE_REACH) {
        return 'Jawab lentera di jalur kiri. Di tepi sungai, satu pemain tahan Aksi pada tuas kayu.';
      }
      return 'Satu pemain berdiri di lingkaran tuas kayu dan tahan Aksi. Temannya menunggu di tepi.';
    }
    if (target !== undefined) return 'Jembatan terkunci. ' + cast(world.q % 2) + ' jawab lentera ' + (target < PIT[0] ? 'di tepi kiri.' : 'berikutnya di tepi kanan.');
    return 'Jembatan terkunci. Bertemu di pos sebelah kanan, lalu tekan Aksi untuk lanjut.';
  }
  if (target !== undefined && world.q === start) {
    if (stage.support) return cast(world.q % 2) + ' dekati lentera. ' + cast(1 - world.q % 2) + ' tahan Aksi di tuas.';
    return 'Dekati lentera pertama dan tekan Aksi. ' + cast(world.q % 2) + ' menjawab.';
  }
  if (!world.puzzle.done) {
    if (stage.mode === 'raft') return 'Naik ke rakit, berdiri di dua dayung, lalu tahan Aksi bersama.';
    if (stage.mode === 'cable') return 'Naik ke gondola, pilih satu katrol per pemain, lalu tahan Aksi bersama.';
    if (stage.mode === 'clues') {
      if (world.puzzle.found.every(Boolean)) return 'Gabungkan dua petunjuk dan tekan Aksi di panel batu.';
      return slot === (world.chapter + world.stage) % 2
        ? 'Jalurmu di atas. Lompat dari pijakan ke pijakan dan baca lentera tinggi.'
        : 'Jalurmu di bawah. Ikuti tanah dan baca lentera rendah.';
    }
    if (stage.mode === 'timing') return (slot === (world.chapter + world.stage) % 2 ? 'Sakelarmu di atas.' : 'Sakelarmu di bawah.') + ' Hitung bersama dan tekan Aksi dalam selang 1,35 detik.';
    if (stage.mode === 'climb') return 'Lompat ke tebing. Nyalakan satu lentera puncak per pemain.';
    if (stage.mode === 'gate' && target !== undefined) return 'Cari lentera berikutnya. ' + cast(world.q % 2) + ' menjawab.';
    if (stage.mode === 'gate') return 'Berdiri di dua tuas gerbang dan tahan Aksi bersama untuk memutar kompas.';
    return (stage.mode === 'push' ? 'Dorong' : stage.mode === 'rope' ? 'Tarik' : 'Angkat') + ' bersama. Berdiri di dua tuas dekat beban dan tahan Aksi.';
  }
  if (target !== undefined) return 'Cari lentera berikutnya. ' + cast(world.q % 2) + ' menjawab.';
  return 'Kumpul di gerbang sebelah kanan. Salah satu pemain tekan Aksi untuk lanjut.';
}

function updatePlay() {
  if (!data?.world || screen !== 'play') return;
  const { world } = data;
  const chapter = CHAPTERS[world.chapter];
  const stage = stageOf(world);
  $('#game-location-small').textContent = 'BAB ' + String(world.chapter + 1).padStart(2, '0') + ' · ' + chapter.name.toUpperCase() + ' / ' + stage.place;
  $('#game-location-title').textContent = stage.title;
  $('#quiz-count').textContent = '✦ ' + (world.q - world.chapter * 10) + '/10';
  $('#quiz-count').setAttribute('aria-label', (world.q - world.chapter * 10) + ' dari 10 trivia bab');
  $('#piece-count').textContent = '◆ ' + world.pieces.length + '/6';
  $('#objective').textContent = objectiveFor(world);
  updateGamePanel();
  updateClues();
  if (world.notice && (world.notice.at + world.notice.text) !== soundNotice && Date.now() - world.notice.at < 3500) {
    soundNotice = world.notice.at + world.notice.text;
    audio.cue(world.notice.kind);
    if (world.notice.text !== lastToast) showToast(world.notice.text, world.notice.kind);
  }
  if (world.feedback && (world.feedback.at + world.feedback.id) !== soundFeedback && Date.now() - world.feedback.at < 5000) {
    soundFeedback = world.feedback.at + world.feedback.id;
    audio.cue(world.feedback.ok ? 'right' : 'wrong');
    if (world.feedback.ok) flashUntil = Date.now() + 3600;
  }
  updateMotionUI();
}

function updateGamePanel() {
  const panel = $('#game-panel');
  const { world, self, members } = data;
  if (!panel) return;
  if (world.quiz) {
    const quiz = world.quiz;
    const answering = quiz.role === self;
    const retry = quiz.attempts ? world.feedback : null;
    const key = [quiz.id, quiz.attempts, quiz.hint, self].join(':');
    if (panel.dataset.key !== key) {
      const name = CAST[members[quiz.role].role];
      panel.dataset.key = key;
      panel.innerHTML = `<div class="quiz-top"><span class="overline">LENTERA ${world.q % 10 + 1} / 10 · ${esc(quiz.category)}</span><b>${name} menjawab</b></div>
        <h2>${esc(quiz.text)}</h2>
        <div class="answer-grid">${quiz.options.map((option, i) => btn('<span>' + 'ABCD'[i] + '</span> ' + esc(option), 'answer', 'answer',
          'data-choice="' + i + '" ' + (!answering ? 'disabled' : ''))).join('')}</div>
        <div class="quiz-foot">${answering && !quiz.hint ? btn('Petunjuk', 'hint', 'mini') : ''}
          <span>${quiz.hint ? esc(quiz.hint) : answering ? 'Pilih satu jawaban.' : quiz.supported ? 'Tahan Aksi di tuas agar temanmu bisa menjawab.' : 'Temanmu sedang memilih.'}</span>
        </div>
        ${retry && !retry.ok ? '<p class="quiz-retry" role="status"><b>' + esc(retry.text) + '</b> Jawaban: ' + esc(retry.answer) + '. Coba lagi!</p>' : ''}`;
    }
    panel.hidden = false;
    return;
  }
  if (world.puzzle.patternOpen && !world.puzzle.done) {
    const key = [world.stage, world.puzzle.first, world.puzzle.second].join(':');
    if (panel.dataset.key !== key) {
      panel.dataset.key = key;
      panel.innerHTML = `<div class="quiz-top"><span class="overline">KUNCI UKIRAN</span></div><h2>Susun simbol dari kedua jalur</h2>
        <p>${esc(world.puzzle.first || '?')} → ${esc(world.puzzle.second || '?')}</p>
        <div class="answer-grid">${SYMBOLS.map((name, i) => btn(name + ' → ' + SYMBOLS[(i + 2) % SYMBOLS.length], 'pattern', 'answer', 'data-choice="' + i + '"')).join('')}</div>`;
    }
    panel.hidden = false;
    return;
  }
  panel.dataset.key = '';
  panel.hidden = true;
}

function updateClues() {
  const node = $('#clue-fob');
  const { world, self } = data;
  const { first, second, found, shared, done } = world.puzzle;
  node.hidden = stageOf(world).mode !== 'clues' || done || !(first || second);
  if (node.hidden) return;
  const key = [first, second, shared[self]].join(':');
  if (node.dataset.key !== key) {
    node.dataset.key = key;
    node.innerHTML = '<span>Petunjuk: <b>' + esc(first || '?') + ' → ' + esc(second || '?') + '</b></span>' +
      (found[self] && !shared[self] ? btn('Bagikan Petunjuk', 'share-clue', 'mini') : '');
  }
}

function localPosition() {
  const tuple = data?.motion?.players?.[data.self];
  return tuple && { x: tuple[0], y: tuple[1], grounded: tuple[5], vx: tuple[2] };
}

function tipFor(world, p) {
  if (!p) return '';
  const stage = stageOf(world);
  const start = stageQuestionStart(world);
  const target = stage.quizAt[world.q - start];
  if (target !== undefined && within(p, target, FLOOR, 58)) return '✦ Tekan Aksi di lentera';
  if (stage.support && world.q === start && within(p, CRANK, FLOOR, 37)) return 'Tahan Aksi di tuas';
  if (stage.mode === 'bridge' && !world.puzzle.done && p.grounded) {
    if (within(p, BRIDGE_SWITCHES[0], FLOOR, BRIDGE_REACH)) return '① Tahan Aksi di tuas';
    if (within(p, BRIDGE_SWITCHES[1], FLOOR, BRIDGE_REACH)) return data.motion.bridge ? '② Tekan Aksi untuk mengunci' : '② Tunggu papan terangkat';
  }
  if (['raft', 'cable'].includes(stage.mode) && !world.puzzle.done && [-1, 1].some(side => within(p, data.motion.raftX + side * RAFT_PAD, FLOOR, 33))) return 'Tahan Aksi bersama';
  if (['lift', 'push', 'rope'].includes(stage.mode) && !world.puzzle.done && PADS.some(x => within(p, x, FLOOR, 27))) return 'Tahan Aksi bersama';
  if (stage.mode === 'timing' && !world.puzzle.done && TIMERS.some(([x, y]) => within(p, x, y, 50))) return 'Siap? Tekan serempak!';
  if (stage.mode === 'clues' && !world.puzzle.done && [CLUE_HIGH, CLUE_LOW, [PATTERN, FLOOR]].some(([x, y]) => within(p, x, y, 48))) return 'Tekan Aksi untuk membaca';
  if (stage.mode === 'climb' && !world.puzzle.done && within(p, CLIMB[0] + 17, CLIMB[1], 65)) return 'Nyalakan lentera puncak';
  if (within(p, EXIT, FLOOR, 104)) return stage.mode === 'gate' ? 'Tahan Aksi di dua tuas' : 'Tekan Aksi untuk lanjut';
  return '';
}

function updateMotionUI() {
  if (screen !== 'play' || !data?.world || !data.motion) return;
  const { world, motion, online, self } = data;
  if (stageOf(world).mode === 'bridge') $('#objective').textContent = objectiveFor(world);
  const status = $('#game-status');
  const tip = $('#control-tip');
  const offline = connState !== 'open' || !online.every(Boolean);
  const p = localPosition();
  const quizNear = world.quiz && within(p, stageOf(world).quizAt[world.q - stageQuestionStart(world)], FLOOR, 75);
  status.hidden = !offline;
  if (offline) {
    const line = connState === 'closed' ? 'Sesi room terputus. Kembali ke menu untuk memilih room.'
      : connState !== 'open' ? 'Koneksi terputus. Menyambungkan kembali…' : 'Temanmu terputus. Perjalanan dijeda.';
    if (status.dataset.line !== line) {
      status.dataset.line = line;
      status.innerHTML = '<span>' + line + '</span>' + btn('Menu', 'home', 'mini');
    }
  }
  const answering = world.quiz?.role === self;
  const ready = !world.quiz?.supported || (
    motion.players[1 - self][5] && Math.abs(motion.players[1 - self][0] - CRANK) <= 34 && remoteHolding()
  );
  document.querySelectorAll('[data-action="answer"]').forEach(node => {
    node.disabled = offline || !answering || !quizNear || (world.quiz.supported && !ready) || Date.now() < world.quiz.retryAt || actionLock === world.quiz.id;
  });
  const supportTip = world.quiz?.supported && answering && !ready ? 'Temanmu perlu menahan tuas' : '';
  const recent = world.feedback?.ok && Date.now() < flashUntil;
  const localTip = supportTip || (recent ? world.feedback.text + ' · ' + world.feedback.answer : tipFor(world, p));
  if (tip.dataset.text !== localTip) {
    tip.dataset.text = localTip;
    tip.textContent = localTip;
    tip.title = recent ? world.feedback.explanation : '';
  }
  if (recent && world.feedback.source && !tip.querySelector('a')) {
    const link = document.createElement('a');
    link.href = world.feedback.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Sumber';
    const desc = document.createElement('span');
    desc.textContent = ' ';
    tip.append(desc, link);
  }
  document.querySelectorAll('[data-action="pattern"]').forEach(node => {
    node.disabled = offline || !p.grounded || !within(p, PATTERN, FLOOR, 63);
  });
  const pads = motion.pad.filter(Boolean).length;
  view.dataset.mechanism = stageOf(world).mode;
  view.dataset.stage = world.chapter + '-' + world.stage;
  view.dataset.trivia = String(world.q);
  view.dataset.online = offline ? 'false' : 'true';
  view.dataset.music = audio.key;
  $('.control-use').classList.toggle('charged', !world.puzzle.done && (motion.meter > 0 || pads > 0));
}

function remoteHolding() {
  const p = data.motion.players[1 - data.self];
  return ['use', 'lift', 'push', 'rope'].includes(p[4]);
}


const pressed = new Set();
const touches = new Map();
let sprint = false;
let previousInput = '';
let lastInputAt = 0;
const keys = new Map([
  ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
  ['Space', 'jump'], ['ArrowUp', 'jump'], ['KeyW', 'jump'],
  ['KeyE', 'use'], ['Enter', 'use'], ['ShiftLeft', 'run'], ['ShiftRight', 'run'],
]);

function inputState() {
  const active = new Set([...pressed].map(key => keys.get(key)));
  for (const name of touches.values()) active.add(name);
  return { t: 'input', dir: Number(active.has('right')) - Number(active.has('left')),
    run: sprint || active.has('run'), jump: active.has('jump'), use: active.has('use') };
}

function emitInput(force = false) {
  if (screen !== 'play' || !data || connState !== 'open' || !data.online.every(Boolean)) return;
  const input = inputState();
  const json = JSON.stringify(input);
  const now = performance.now();
  const p = localPosition();
  const sustained = input.dir || input.use || input.jump || (p && !p.grounded);
  if (force || json !== previousInput || (sustained && now - lastInputAt >= 97)) {
    if (room.send(input)) {
      previousInput = json;
      lastInputAt = now;
    }
  }
  document.querySelectorAll('[data-control]').forEach(button => {
    const label = button.dataset.control;
    const on = label === 'left' ? input.dir < 0 : label === 'right' ? input.dir > 0 : input[label];
    button.classList.toggle('held', Boolean(on));
  });
}

function releaseAll(send = true) {
  pressed.clear();
  touches.clear();
  previousInput = '';
  document.querySelectorAll('[data-control].held').forEach(button => button.classList.remove('held'));
  if (send) emitInput(true);
}

function wireTouch() {
  document.querySelectorAll('[data-control]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || modal) return;
      event.preventDefault();
      audio.unlock();
      touches.set(event.pointerId, button.dataset.control);
      button.setPointerCapture(event.pointerId);
      if (button.dataset.control === 'jump' && localPosition()?.grounded) audio.cue('jump');
      emitInput();
    });
    const end = event => {
      if (touches.delete(event.pointerId)) emitInput();
    };
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    button.addEventListener('lostpointercapture', end);
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('click', event => {
      if (event.detail !== 0 || event.pointerType) return;
      const id = -20;
      touches.set(id, button.dataset.control);
      emitInput();
      setTimeout(() => { touches.delete(id); emitInput(); }, 125);
    });
  });
}

addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal) { closeModal(); return; }
  if (screen !== 'play' || modal || !keys.has(event.code) || event.target.matches('input, select, textarea')
      || (event.code === 'Enter' && event.target.matches('button, a'))) return;
  event.preventDefault();
  if (!pressed.has(event.code)) {
    pressed.add(event.code);
    audio.unlock();
    if (keys.get(event.code) === 'jump' && localPosition()?.grounded) audio.cue('jump');
    emitInput();
  }
});
addEventListener('keyup', event => { if (pressed.delete(event.code)) emitInput(); });
addEventListener('blur', () => releaseAll());
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
setInterval(() => {
  if (screen === 'play' && !document.hidden) {
    emitInput();
    if (data?.world && data.motion && (data.world.quiz || Date.now() < flashUntil + 400)) updateMotionUI();
  }
}, 52);

function showModal(type, markup) {
  if (!modal) lastFocused = document.activeElement;
  modal = { type };
  if (screen === 'play') releaseAll();
  overlay.hidden = false;
  overlay.innerHTML = '<section class="dialog frame" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    btn('×', 'close', 'close', 'aria-label="Tutup"') + markup + '</section>';
  view.inert = true;
  topbar.inert = true;
  overlay.querySelector('[data-action="close"]').focus({ preventScroll: true });
}

function closeModal() {
  const hadModal = modal;
  modal = null;
  overlay.hidden = true;
  overlay.innerHTML = '';
  view.inert = false;
  topbar.inert = false;
  if (hadModal && lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
  lastFocused = null;
}

function help() {
  showModal('help', `<p class="eyebrow"><span></span> CATATAN PENJELAJAH</p><h2 id="dialog-title">Cara Bermain</h2>
    <p>Buat room, undang satu teman, lalu pilih Iren atau Adit dan tandai siap. Kalian akan menemukan enam keping Kompas Nusantara.</p>
    <dl class="guide-list"><div><dt>Bergerak</dt><dd>Sentuh tombol Kiri dan Kanan. Di komputer, gunakan panah atau A dan D. Tekan Lari untuk berlari atau tahan Shift.</dd></div>
    <div><dt>Lompat</dt><dd>Tekan tombol Lompat atau Spasi. Gunakan pijakan untuk naik.</dd></div>
    <div><dt>Aksi</dt><dd>Tekan Aksi atau E untuk membaca dan menekan sakelar. Tahan tombol untuk mengangkat, menjaga tuas, atau mendayung.</dd></div>
    <div><dt>Trivia</dt><dd>Temukan lentera yang menyala. Nama penjawab muncul di kartu soal. Jika salah, coba lagi atau buka petunjuk.</dd></div>
    <div><dt>Terputus</dt><dd>Perjalanan dijeda. Buka kembali room pada browser yang sama untuk melanjutkan.</dd></div></dl>`);
}

function settingsDialog() {
  const route = audio.key === 'aceh' && !data?.world ? 'Musik pembuka' : (MUSIC[audio.key]?.[0] || '');
  showModal('settings', `<p class="eyebrow"><span></span> PERLENGKAPAN</p><h2 id="dialog-title">Pengaturan</h2>
    <p>Sedang diputar · <b>${esc(route)}</b></p>
    <div class="settings-grid"><label>Volume musik <input type="range" id="music-volume" data-setting="music" min="0" max="1" step=".05" value="${settings.music}"></label>
      <label>Volume efek <input type="range" id="effects-volume" data-setting="effects" min="0" max="1" step=".05" value="${settings.effects}"></label>
      <label class="switch-label"><input type="checkbox" data-setting="mute" ${settings.mute ? 'checked' : ''}> Bisukan semua suara</label></div>
    <div class="row">${screen === 'play' || screen === 'ending' ? btn('Kembali ke Menu', 'home', 'secondary') : ''}${btn('Selesai', 'close', 'primary')}</div>`);
}

function avatarSelect(key, label, list, choice) {
  return '<label>' + label + '<select data-avatar-field="' + key + '">' +
    list.map((value, index) => '<option value="' + index + '" ' + (index === choice ? 'selected' : '') + '>' + esc(Array.isArray(value) ? value[0] : value) + '</option>').join('') +
    '</select></label>';
}

let avatarDraft = null;
function customize(role) {
  customizeRole = role;
  avatarDraft = structuredClone(screen === 'lobby' ? data.members[data.self].avatar : avatars[role]);
  renderAvatarDialog();
}

function renderAvatarDialog() {
  const role = customizeRole;
  const a = avatarDraft;
  const switchRole = screen === 'lobby' ? '' : '<div class="segment">' +
    btn('Perempuan · Iren', 'preview-role', role === 0 ? 'selected' : 'secondary', 'data-role="0"') +
    btn('Laki-laki · Adit', 'preview-role', role === 1 ? 'selected' : 'secondary', 'data-role="1"') + '</div>';
  showModal('avatar', `<p class="eyebrow"><span></span> PILIH KARAKTER</p><h2 id="dialog-title">Penampilan ${CAST[role]}</h2>
    ${switchRole}
    <div class="avatar-workbench"><div class="avatar-preview"><canvas ${avatarSize} data-avatar="draft" aria-label="Pratinjau ${CAST[role]}"></canvas></div>
      <div class="avatar-fields">${avatarSelect('skin', 'Warna kulit', SKIN, a.skin)}${avatarSelect('head', 'Rambut atau hijab', HEAD[role], a.head)}
        ${avatarSelect('cloth', 'Warna pakaian', CLOTH, a.cloth)}${avatarSelect('outfit', 'Pakaian petualang', OUTFIT, a.outfit)}
        ${avatarSelect('accessory', 'Aksesori', ACCESSORY, a.accessory)}</div></div>
    <div class="row">${btn('Simpan Penampilan', 'save-avatar', 'primary')}</div>`);
}

function saveAvatar() {
  avatars[customizeRole] = avatarDraft;
  preferred = customizeRole;
  storeWrite('nusantara-avatars-v1', avatars);
  storeWrite('nusantara-role-v1', preferred);
  if (screen === 'lobby') room.send({ t: 'avatar', role: customizeRole, avatar: avatarDraft });
  closeModal();
  showToast('Penampilan tersimpan.');
}

function mapMarkup(progress) {
  const stage = progress?.phase === 'map' ? progress.chapter + 1 : progress?.chapter ?? 0;
  const pieces = progress?.pieces || [];
  const markers = CHAPTERS.map(({ name, marker }, i) => {
    const state = pieces.includes(i) ? 'complete' : i === stage ? 'current' : 'locked';
    return '<span class="map-pin ' + state + '" style="left:' + marker[0] + '%;top:' + marker[1] + '%" aria-label="' + name + '">' + (i + 1) + '</span>';
  }).join('');
  const list = CHAPTERS.map(({ name, title }, i) => '<li class="' + (pieces.includes(i) ? 'complete' : i === stage ? 'current' : 'locked') + '">' +
    '<span>' + (pieces.includes(i) ? '◆' : '0' + (i + 1)) + '</span><div><b>' + name + '</b><small>' + title + '</small></div></li>').join('');
  return '<div class="map-body"><div class="map-art" aria-label="Ilustrasi rute kepulauan Indonesia">' +
    '<img src="/art/peta.svg" alt=""><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="' +
    CHAPTERS.map(ch => ch.marker.join(',')).join(' ') + '"/></svg>' + markers + '</div><ol class="map-stops">' + list + '</ol></div>' +
    '<p class="map-progress"><span>◆ Keping Kompas <b>' + pieces.length + '/6</b></span><span>✦ Trivia <b>' + (progress?.q || 0) + '/60</b></span></p>';
}

function showMap(asDialog) {
  if (asDialog) {
    showModal('map', '<p class="eyebrow"><span></span> JURNAL PERJALANAN</p><h2 id="dialog-title">Peta Nusantara</h2>' + mapMarkup(data?.world));
    return;
  }
  closeModal();
  selectScreen('map', '<section class="frame map-frame"><p class="eyebrow"><span></span> PETA NUSANTARA</p><h1>Keping ditemukan!</h1><p>' +
    CHAPTERS[data.world.chapter].name + ' selesai. Tujuan selanjutnya ' + CHAPTERS[data.world.chapter + 1].name + '.</p>' +
    mapMarkup(data.world) + '<div class="row" id="continue-row"></div></section>');
  updateMapContinue();
}

function updateMapContinue() {
  const waiting = data.world.continues[data.self];
  const active = data.online.every(Boolean) && connState === 'open';
  $('#continue-row').innerHTML = btn(waiting ? 'Menunggu teman…' : 'Lanjut ke ' + CHAPTERS[data.world.chapter + 1].name,
    'continue', 'primary', waiting || !active ? 'disabled' : '') + btn('Kembali ke Menu', 'home', 'ghost') +
    (!active ? '<span class="muted">Temanmu sedang menyambung kembali.</span>' : '');
}

const ENDING = [
  { tag: 'TANJUNG SENJA', title: 'Senja untuk berdua', lines: ['Adit: Akhirnya selesai juga petualangan kita!', 'Iren: Iya! Tapi kayaknya masih ada kejutan terakhir!'], cast: ['iren', 'adit'] },
  { tag: 'TEMUAN TAK TERDUGA', title: 'Iren dan Leo', lines: ['Leo: Aku baru tiba di Bali. Di mana tempat terbaik untuk lihat matahari terbenam?', 'Iren: Sini. Tapi tempat duduk terbaik harganya satu cerita perjalanan.', 'Leo: Setuju. Aku bawa dua cerita. Besok boleh duduk di sini lagi?', 'Iren: Boleh. Aku simpan tempatnya.'], cast: ['iren', 'leo'] },
  { tag: 'KEJUTAN KEDUA', title: 'Adit dan Laras', lines: ['Laras: Aku dari Jawa. Boleh numpang melihat kompas yang katanya mengalahkan enam pulau?', 'Adit: Boleh. Sebagai gantinya, ajari aku tempat cari pisang goreng.', 'Laras: Besok aku antar. Mau?', 'Adit: Mau. Aku bahkan rela bagi gorengan terakhir.'], cast: ['adit', 'laras'] },
  { tag: 'ENAM KEPING · SATU KISAH BARU', title: 'PETUALANGAN SELESAI!', lines: ['Berangkat berdua mencari petualangan. Pulang membawa pasangan.'], cast: ['iren', 'leo', 'adit', 'laras'] },
];

function showEnding() {
  closeModal();
  const ending = ENDING[endingIndex];
  selectScreen('ending', `<section class="ending-frame">
    <div class="ending-art"><div class="ending-glint">✧</div><div class="ending-cast">${ending.cast.map(name => '<canvas ' + avatarSize + ' data-avatar="' + name + '" aria-label="' + name + '"></canvas>').join('')}</div></div>
    <div class="ending-copy"><p class="eyebrow"><span></span> ${ending.tag}</p><h1>${ending.title}</h1>
      <div class="ending-lines">${ending.lines.map(line => '<p>' + line + '</p>').join('')}</div>
      <div class="row" id="ending-actions"></div>
      ${endingIndex === 3 ? '<details><summary>Kredit Akhir</summary><p>Petualangan Nusantara · Iren &amp; Adit<br>Konsep dan papan cerita: Maureen<br>Ilustrasi, karakter, musik, dan teka-teki: tim Petualangan Nusantara<br>Dibuat dengan Phaser 3</p></details>' : ''}
    </div>
  </section>`);
  updateEndingReplay();
}

function updateEndingReplay() {
  const node = $('#ending-actions');
  if (!node) return;
  const waiting = data.world.continues[data.self];
  node.innerHTML = endingIndex !== 3
    ? btn('Lanjut ' + (endingIndex + 1) + '/4 →', 'ending-next', 'primary') + btn('Kembali ke Menu', 'home', 'ghost')
    : btn(waiting ? 'Menunggu teman…' : 'Main Lagi', 'continue', 'primary', waiting || !data.online.every(Boolean) || connState !== 'open' ? 'disabled' : '') +
      btn('Kembali ke Menu', 'home', 'secondary') + btn('Bagikan Game', 'share-game', 'secondary');
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Tautan disalin.');
  } catch {
    const field = $('#invite-link');
    if (field) {
      field.focus();
      field.select();
      field.setSelectionRange(0, field.value.length);
      showToast('Tahan pada tautan yang dipilih untuk menyalin.');
    } else showToast(text, 'info', 6500);
  }
}

function exitToMenu() {
  if (data || room.room) {
    releaseAll();
    room.stop();
    data = null;
    sceneKey = '';
    connState = 'closed';
    if (new URLSearchParams(location.search).has('room')) history.replaceState(null, '', location.pathname);
  }
  showHome();
}

document.addEventListener('submit', event => {
  if (event.target.id !== 'join-form') return;
  event.preventDefault();
  enter('join', normalizedCode($('#room-code').value));
});

document.addEventListener('input', event => {
  const { target } = event;
  if (target.dataset.setting) {
    const key = target.dataset.setting;
    settings[key] = key === 'mute' ? target.checked : Number(target.value);
    audio.apply(settings);
    storeWrite('nusantara-settings-v1', settings);
  }
  if (target.dataset.avatarField && avatarDraft) avatarDraft[target.dataset.avatarField] = Number(target.value);
  if (target.id === 'room-code') target.value = normalizedCode(target.value);
});

document.addEventListener('click', async event => {
  if (event.target === overlay) { closeModal(); return; }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton || actionButton.disabled) return;
  audio.unlock();
  const { action, choice } = actionButton.dataset;
  const role = Number(actionButton.dataset.role);
  switch (action) {
    case 'home': exitToMenu(); break;
    case 'start-menu': showEnter('', 'start'); break;
    case 'join-menu': showEnter(invite); break;
    case 'create': enter('create'); break;
    case 'resume': enter('resume'); break;
    case 'close': closeModal(); break;
    case 'help': help(); break;
    case 'settings': settingsDialog(); break;
    case 'characters': customize(preferred); break;
    case 'customize': customize(role); break;
    case 'preview-role': customize(role); break;
    case 'save-avatar': saveAvatar(); break;
    case 'claim': room.send({ t: 'avatar', role, avatar: avatars[role] }); break;
    case 'ready': room.send({ t: 'ready', value: !data.members[data.self].ready }); break;
    case 'begin': room.send({ t: 'start' }); break;
    case 'copy-invite': await copy(roomInvite()); break;
    case 'map-open': showMap(true); break;
    case 'sprint':
      sprint = !sprint;
      actionButton.setAttribute('aria-pressed', String(sprint));
      emitInput();
      break;
    case 'hint':
      if (data.world.quiz) room.send({ t: 'hint', id: data.world.quiz.id });
      break;
    case 'answer':
      if (data.world.quiz) {
        const id = data.world.quiz.id;
        if (room.send({ t: 'answer', id, choice: Number(choice) })) {
          actionLock = id;
          updateMotionUI();
          setTimeout(() => { if (actionLock === id) actionLock = ''; }, 340);
        }
      }
      break;
    case 'pattern': room.send({ t: 'pattern', choice: Number(choice) }); break;
    case 'share-clue': room.send({ t: 'share' }); break;
    case 'continue': room.send({ t: 'continue' }); break;
    case 'ending-next':
      endingIndex = Math.min(3, endingIndex + 1);
      audio.cue(endingIndex === 3 ? 'final' : 'travel');
      showEnding();
      break;
    case 'share-game': {
      const url = new URL('/', location.origin).href;
      if (navigator.share) {
        try { await navigator.share({ title: 'Petualangan Nusantara', text: 'Yuk main bareng!', url }); }
        catch (error) { if (error.name !== 'AbortError') await copy(url); }
      } else await copy(url);
      break;
    }
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !modal) return;
  const focusable = [...overlay.querySelectorAll('button:not([disabled]), input, select, a[href]')];
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) {
    event.preventDefault(); focusable.at(-1).focus();
  } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
    event.preventDefault(); focusable[0].focus();
  }
});

let lastPaint = 0;
function animate(ms) {
  if (!document.hidden && ms - lastPaint > 33) {
    lastPaint = ms;
    document.querySelectorAll('canvas[data-avatar]').forEach((canvas, i) => {
      const id = canvas.dataset.avatar;
      let role = id === 'adit' || id === 'leo' ? 1 : 0;
      let a = avatars[role];
      let variation = '';
      let pose = screen === 'ending' && endingIndex === 3 ? 'celebrate' : 'idle';
      if (id === 'draft' && avatarDraft) { role = customizeRole; a = avatarDraft; }
      else if (id.startsWith('lobby-')) {
        role = Number(id.slice(-1));
        const member = data?.members.find(p => p?.role === role);
        a = member?.avatar || avatars[role];
        if (member?.ready) pose = 'celebrate';
      } else if (id === 'leo') {
        a = { skin: 0, head: 1, cloth: 2, outfit: 1, accessory: 1 }; variation = 'leo';
      } else if (id === 'laras') {
        a = { skin: 3, head: 9, cloth: 3, outfit: 2, accessory: 4 }; variation = 'laras';
      } else if (screen === 'ending') a = data.members.find(member => member.role === role).avatar;
      drawAvatar(canvas.getContext('2d'), a, role, pose, ms + i * 390, 1, variation);
    });
  }
  requestAnimationFrame(animate);
}

if (invite) showEnter(invite);
else showHome();
requestAnimationFrame(animate);
spriteArtReady.then(results => {
  if (results.some(result => result.status === 'rejected')) {
    showToast('Ilustrasi karakter belum berhasil dimuat. Muat ulang halaman untuk mencoba lagi.', 'warn', 6000);
  }
});
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

