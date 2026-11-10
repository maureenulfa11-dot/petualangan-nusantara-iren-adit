import {
  CHAPTERS, FLOOR, WIDTH, PIT, EXIT, CRANK, BRIDGE_SWITCHES, BRIDGE_REACH, RAFT_FROM, RAFT_TO, RAFT_HALF, RAFT_PAD,
  CLUE_HIGH, CLUE_LOW, CLIMB, PATTERN, PADS, TIMERS, SYMBOLS, stageOf, stageQuestionStart, within,
  hasPit, platformsFor,
} from '../shared/chapters.js';
import { BY_ID, shuffledQuestions } from './questions.js';

const STOP = Object.freeze({ dir: 0, run: false, jump: false, use: false });
const JUMP_SPEED = 484;
const GRAVITY = 1160;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const isPair = list => list[0] && list[1];
const respawnX = [112, 161];
const overRiver = x => x > PIT[0] && x < PIT[1];
const bridgeRespawn = slot => BRIDGE_SWITCHES[0] - 32 - slot * 24;

function position(x) {
  return { x, y: FLOOR, vx: 0, vy: 0, face: 1, grounded: true, pose: 'idle', input: STOP, expires: 0, land: 0 };
}

export function newWorld(now) {
  const world = {
    run: crypto.randomUUID(), phase: 'play', chapter: 0, stage: 0, q: 0, order: shuffledQuestions(),
    pieces: [], continues: [false, false], last: now,
  };
  startStage(world, now);
  return world;
}

function startStage(world, now) {
  const stage = stageOf(world);
  const index = crypto.getRandomValues(new Uint8Array(1))[0] % 4;
  world.players = respawnX.map(position);
  world.puzzle = {
    done: false, meter: 0, bridge: false, raftX: RAFT_FROM, pad: [false, false],
    clues: [false, false], shared: [false, false], pattern: (stage.mode === 'clues' ? index : 0),
    patternOpen: false, taps: [0, 0], lanterns: [false, false],
  };
  world.quiz = null;
  world.feedback = null;
  world.notice = null;
  world.continues = [false, false];
  world.last = now;
  world.phase = 'play';
  mark(world, true);
}

function mark(world, persist = false) {
  world.changed = true;
  world.persist ||= persist;
}

export function checkpoint(world) {
  const saved = structuredClone(world);
  delete saved.changed;
  delete saved.persist;
  saved.puzzle.pad = [false, false];
  saved.puzzle.taps = [0, 0];
  const stage = stageOf(saved);
  saved.puzzle.meter = Number(stage.mode === 'bridge' && saved.puzzle.done);
  if (stage.mode === 'bridge') saved.puzzle.bridge = saved.puzzle.done;
  saved.players = saved.players.map((p, i) => {
    if (hasPit(stage) && overRiver(p.x) && !saved.puzzle.bridge) {
      if (stage.mode === 'bridge') return position(bridgeRespawn(i));
      if (saved.puzzle.done) return position(RAFT_TO + RAFT_PAD * (i === 0 ? -1 : 1));
      return position(saved.puzzle.raftX + RAFT_PAD * (i === 0 ? -1 : 1));
    }
    const rest = position(p.x);
    rest.face = p.face;
    const platform = platformsFor(stage).find(([left, right, y]) => p.x >= left && p.x <= right && Math.abs(p.y - y) <= 18);
    if (platform) rest.y = platform[2];
    return rest;
  });
  return saved;
}

export function pause(world, now) {
  if (!world) return;
  world.last = now;
  for (const p of world.players) {
    p.input = STOP;
    p.expires = 0;
    p.vx = 0;
    p.pose = p.grounded ? 'idle' : 'jump';
  }
  world.puzzle.pad = [false, false];
  world.puzzle.taps = [0, 0];
  const bridge = stageOf(world).mode === 'bridge';
  world.puzzle.meter = Number(bridge && world.puzzle.done);
  if (bridge) {
    world.puzzle.bridge = world.puzzle.done;
    if (!world.puzzle.done) world.players.forEach((p, slot) => {
      if (overRiver(p.x)) Object.assign(p, position(bridgeRespawn(slot)));
    });
  }
}

function done(world, now, text = 'Berhasil! Jalan terbuka.') {
  if (world.puzzle.done) return;
  world.puzzle.done = true;
  world.notice = { kind: 'success', text, at: now };
  mark(world, true);
}

function notice(world, now, text, kind = 'info') {
  world.notice = { kind, text, at: now };
  mark(world);
}

export function assignment(world) {
  const first = (world.chapter + world.stage) % 2;
  return [first, 1 - first];
}

export function currentTarget(world) {
  return stageOf(world).quizAt[world.q - stageQuestionStart(world)];
}

function useNear(p, x, y = FLOOR, range = 42) {
  return p.input.use && p.grounded && within(p, x, y, range);
}

function occupiedPair(players, points) {
  const holds = players.map(p => points.map(([x, y, range]) => useNear(p, x, y, range)));
  return {
    pad: points.map((_, i) => holds.some(holding => holding[i])),
    both: (holds[0][0] && holds[1][1]) || (holds[1][0] && holds[0][1]),
  };
}

function updateBridge(world, dt, now) {
  const { players, puzzle } = world;
  if (puzzle.done) return;
  const [lever, latch] = BRIDGE_SWITCHES;
  const holders = players.map(player => useNear(player, lever, FLOOR, BRIDGE_REACH));
  const lifting = holders.some(Boolean);
  puzzle.pad = holders;
  puzzle.meter = clamp(puzzle.meter + dt * (lifting ? 1.4 : -1.8), 0, 1);
  puzzle.bridge = lifting && puzzle.meter === 1;
  if (puzzle.bridge && players.some((player, slot) => holders[1 - slot] && useNear(player, latch, FLOOR, BRIDGE_REACH))) {
    puzzle.pad = [false, false];
    done(world, now, 'Jembatan terkunci! Lepas tuas dan susul temanmu.');
  }
}

function mechanism(world, stage, dt, now) {
  const { players, puzzle } = world;
  if (stage.mode === 'bridge') return updateBridge(world, dt, now);
  const calibrated = world.q > stageQuestionStart(world);
  const questionsDone = currentTarget(world) === undefined;
  if (puzzle.done) return;
  if (stage.mode === 'raft' || stage.mode === 'cable') {
    const { pad, both } = occupiedPair(players, [-1, 1].map(side => [puzzle.raftX + side * RAFT_PAD, FLOOR, 29]));
    puzzle.pad = pad;
    if (calibrated && both) {
      const shift = Math.min(RAFT_TO - puzzle.raftX, dt * 150);
      for (const p of players) {
        if (p.grounded && Math.abs(p.y - FLOOR) < 2 && Math.abs(p.x - puzzle.raftX) < RAFT_HALF) p.x += shift;
      }
      puzzle.raftX += shift;
      if (puzzle.raftX >= RAFT_TO) done(world, now, 'Sampai! Turun ke darat dan cari lentera berikutnya.');
    }
    return;
  }
  const isGate = stage.mode === 'gate';
  if (isGate || ['lift', 'push', 'rope'].includes(stage.mode)) {
    const points = (isGate ? [EXIT - 48, EXIT + 24] : PADS).map(x => [x, FLOOR, 23]);
    const { pad, both } = occupiedPair(players, points);
    puzzle.pad = pad;
    const canMove = isGate ? questionsDone : calibrated;
    puzzle.meter = clamp(puzzle.meter + dt * (canMove && both ? 0.94 : -1.55), 0, 1);
    if (puzzle.meter >= 1) {
      done(world, now, isGate ? 'Kompas Nusantara menyala!' : 'Kompak! Bebannya berhasil digeser.');
      if (isGate) completeStage(world, now);
    }
  }
}

function terrain(world, stage, p, slot, dt, now) {
  const oldY = p.y;
  let nextX = clamp(p.x + p.input.dir * (p.input.run ? 303 : 203) * dt, 25, WIDTH - 25);
  const pzl = world.puzzle;
  if (!pzl.done && ['lift', 'push', 'rope'].includes(stage.mode) && p.x < 593) nextX = Math.min(592, nextX);
  if (!pzl.done && stage.mode === 'clues' && p.x < 948) nextX = Math.min(947, nextX);
  if (!pzl.done && stage.mode === 'climb' && p.x < 937) nextX = Math.min(936, nextX);
  if (!pzl.done && stage.mode === 'timing' && p.x < 930) nextX = Math.min(929, nextX);
  p.vx = dt ? (nextX - p.x) / dt : 0;
  p.x = nextX;
  if (p.input.dir) p.face = p.input.dir;
  const wasGrounded = p.grounded;
  p.grounded = false;
  p.vy += GRAVITY * dt;
  p.y += p.vy * dt;
  const floors = platformsFor(stage).filter(([left, right]) => p.x >= left && p.x <= right).map(([, , y]) => y);
  const openGap = hasPit(stage) && overRiver(p.x) && !pzl.bridge;
  const onRaft = ['raft', 'cable'].includes(stage.mode) && Math.abs(p.x - pzl.raftX) <= RAFT_HALF;
  if (!openGap || onRaft) floors.push(FLOOR);
  if (p.vy >= 0) {
    const floor = floors.find(y => oldY <= y + 0.5 && p.y >= y);
    if (floor !== undefined) {
      p.y = floor;
      p.vy = 0;
      p.grounded = true;
      if (!wasGrounded) p.land = now + 125;
    }
  }
  if (p.y > 520) {
    let x = stage.mode === 'bridge' ? bridgeRespawn(slot) : respawnX[slot];
    if (['raft', 'cable'].includes(stage.mode)) x = pzl.raftX + RAFT_PAD * (slot === 0 ? -1 : 1);
    Object.assign(p, position(x), { pose: 'surprise' });
    notice(world, now, 'Byur! Kembali ke pijakan aman.', 'danger');
    world.notice.slot = slot;
    return;
  }
  if (!p.grounded) p.pose = 'jump';
  else if (p.input.use) {
    p.pose = ['lift', 'push', 'rope'].includes(stage.mode) ? stage.mode
      : ['raft', 'cable'].includes(stage.mode) ? 'rope' : 'use';
  } else if (p.land > now) p.pose = 'land';
  else if (p.vx) p.pose = p.input.run ? 'run' : 'walk';
  else p.pose = 'idle';
}

export function advance(world, now, online = true) {
  if (!world || world.phase !== 'play') return;
  if (!online) {
    world.last = now;
    return;
  }
  let t = Math.max(world.last, now - 450);
  const stage = stageOf(world);
  const players = world.players;
  while (t < now && world.phase === 'play' && world.players === players) {
    const ms = Math.min(now - t, 20);
    t += ms;
    for (const p of players) if (p.expires <= t) p.input = STOP;
    mechanism(world, stage, ms / 1000, t);
    if (world.phase !== 'play' || world.players !== players) break;
    for (let i = 0; i < players.length; i++) terrain(world, stage, players[i], i, ms / 1000, t);
  }
  world.last = now;
}

export function applyInput(world, slot, message, now) {
  if (world?.phase !== 'play') return;
  const p = world.players[slot];
  const previous = p.input;
  p.input = {
    dir: [-1, 0, 1].includes(message.dir) ? message.dir : 0,
    run: message.run === true, jump: message.jump === true, use: message.use === true,
  };
  p.expires = now + 460;
  if (p.input.jump && !previous.jump && p.grounded) {
    p.vy = -JUMP_SPEED;
    p.grounded = false;
    p.pose = 'jump';
  }
  if (p.input.use && !previous.use) interact(world, slot, now);
  if (stageOf(world).mode === 'bridge') updateBridge(world, 0, now);
}

function openQuiz(world, slot, now) {
  const stage = stageOf(world);
  const x = currentTarget(world);
  const { players } = world;
  if (x === undefined || !within(players[slot], x, FLOOR, 52)) return false;
  if (world.quiz) return true;
  const role = world.q % 2;
  const supported = stage.support === true && world.q === stageQuestionStart(world);
  if (supported && (slot !== role || !useNear(players[1 - role], CRANK, FLOOR, 33))) {
    notice(world, now, 'Penjawab mendekat ke lentera. Temannya tahan tuas di sebelah kanan.');
    return true;
  }
  world.quiz = { id: world.order[world.q], role, supported, hint: false, attempts: 0, retryAt: 0 };
  mark(world);
  return true;
}

function interact(world, slot, now) {
  const stage = stageOf(world);
  const { mode } = stage;
  const { players, puzzle } = world;
  const p = players[slot];
  if (!p.grounded) return;
  if (openQuiz(world, slot, now)) return;

  const [high, low] = assignment(world);
  if (!puzzle.done && mode === 'bridge' && within(p, BRIDGE_SWITCHES[1], FLOOR, BRIDGE_REACH)) {
    if (!puzzle.bridge) notice(world, now, 'Tunggu temanmu mengangkat papan dari tuas kiri.');
    return;
  }
  if (!puzzle.done && mode === 'clues') {
    if (within(p, ...(slot === high ? CLUE_HIGH : CLUE_LOW), 48)) {
      puzzle.clues[slot] = true;
      notice(world, now, 'Petunjuk ditemukan. Bagikan ke temanmu jika sudah siap.', 'clue');
      mark(world, true);
      return;
    }
    if (within(p, PATTERN, FLOOR, 49)) {
      if (!isPair(puzzle.clues)) notice(world, now, 'Temukan petunjuk dari kedua jalur dulu.');
      else {
        puzzle.patternOpen = true;
        mark(world);
      }
      return;
    }
  }
  if (!puzzle.done && mode === 'timing') {
    const [x, y] = TIMERS[slot === high ? 0 : 1];
    if (within(p, x, y, 50)) {
      puzzle.taps[slot] = now;
      if (puzzle.taps[1 - slot] && now - puzzle.taps[1 - slot] <= 1350) done(world, now, 'Dentangnya serempak! Gerbang terbuka.');
      else notice(world, now, 'Satu sakelar aktif. Temanmu punya waktu sekitar satu detik!');
      return;
    }
  }
  if (!puzzle.done && mode === 'climb' && within(p, CLIMB[0] + (slot === low ? 34 : 0), CLIMB[1], 40)) {
    puzzle.lanterns[slot] = true;
    if (isPair(puzzle.lanterns)) done(world, now, 'Kedua lentera tebing menyala!');
    else notice(world, now, 'Satu lentera menyala. Ajak temanmu ke puncak.', 'clue');
    mark(world, true);
    return;
  }
  if (within(p, EXIT, FLOOR, 102)) {
    if (mode === 'gate') return;
    if (!puzzle.done || currentTarget(world) !== undefined) notice(world, now, 'Selesaikan tantangan dan semua lentera di jalur ini dulu.');
    else if (players.every(member => member.grounded && within(member, EXIT, FLOOR, 102))) completeStage(world, now);
    else notice(world, now, 'Tunggu temanmu mendekat ke gerbang.');
  }
}

function clueParts(pattern) {
  return [pattern, (pattern + 2) % SYMBOLS.length];
}

export function patternOptions() {
  return SYMBOLS.map((name, i) => [name, SYMBOLS[(i + 2) % SYMBOLS.length]].join(' → '));
}

function completeStage(world, now) {
  if (world.phase !== 'play' || !world.puzzle.done || currentTarget(world) !== undefined) return;
  if (world.stage + 1 < CHAPTERS[world.chapter].stages.length) {
    world.stage++;
    startStage(world, now);
    return;
  }
  if (!world.pieces.includes(world.chapter)) world.pieces.push(world.chapter);
  world.phase = world.chapter === CHAPTERS.length - 1 ? 'ending' : 'map';
  world.continues = [false, false];
  pause(world, now);
  mark(world, true);
}

export function gameCommand(world, slot, message, now) {
  if (!world) return;
  if (message.t === 'continue' && ['map', 'ending'].includes(world.phase)) {
    world.continues[slot] = true;
    if (isPair(world.continues)) {
      if (world.phase === 'ending') return newWorld(now);
      world.chapter++;
      world.stage = 0;
      startStage(world, now);
    }
    mark(world, true);
    return;
  }
  if (world.phase !== 'play') return;
  const stage = stageOf(world);
  const { quiz, puzzle } = world;
  if (message.t === 'share' && stage.mode === 'clues' && puzzle.clues[slot] && !puzzle.shared[slot]) {
    puzzle.shared[slot] = true;
    notice(world, now, 'Petunjuk sudah dibagikan.', 'clue');
    mark(world, true);
  }
  if (message.t === 'pattern' && stage.mode === 'clues' && puzzle.patternOpen && !puzzle.done
    && within(world.players[slot], PATTERN, FLOOR, 63) && Number.isInteger(message.choice) && message.choice >= 0 && message.choice < 4) {
    if (message.choice === puzzle.pattern) {
      puzzle.patternOpen = false;
      done(world, now, 'Urutan tepat. Pintu ukirannya terbuka!');
    } else notice(world, now, 'Ukirannya belum cocok. Cocokkan petunjuk pertama dan kedua.', 'wrong');
  }
  if (!quiz || quiz.id !== message.id || quiz.role !== slot) return;
  if (message.t === 'hint') {
    quiz.hint = true;
    mark(world);
  }
  if (message.t !== 'answer' || !Number.isInteger(message.choice) || message.choice < 0 || message.choice > 3 || now < quiz.retryAt) return;
  const answerer = world.players[slot];
  if (!answerer.grounded || !within(answerer, currentTarget(world), FLOOR, 74)) {
    world.quiz = null;
    notice(world, now, 'Dekati lentera lagi untuk menjawab.');
    return;
  }
  if (quiz.supported && !useNear(world.players[1 - slot], CRANK, FLOOR, 33)) {
    notice(world, now, 'Temanmu perlu menahan tuas saat kamu menjawab.');
    return;
  }
  const question = BY_ID.get(quiz.id);
  const ok = message.choice === question.answer;
  world.feedback = {
    id: quiz.id, ok, answer: question.options[question.answer], chosen: message.choice, role: slot,
    text: ok ? question.correct : question.incorrect, explanation: question.explanation,
    source: question.source, at: now,
  };
  if (ok) {
    world.quiz = null;
    world.q++;
    mark(world, true);
  } else {
    quiz.attempts++;
    quiz.hint = true;
    quiz.retryAt = now + 620;
    mark(world);
  }
}

export function publicMotion(world) {
  if (!world) return null;
  const { puzzle } = world;
  return {
    players: world.players.map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.vx), p.face, p.pose, p.grounded]),
    bridge: puzzle.bridge, raftX: Math.round(puzzle.raftX), meter: Math.floor(puzzle.meter * 100), pad: puzzle.pad,
  };
}

export function publicWorld(world, slot) {
  if (!world) return null;
  const { phase, run, chapter, stage, q, pieces, quiz, puzzle, feedback, notice: message, continues } = world;
  const parts = clueParts(puzzle.pattern);
  const [high] = assignment(world);
  return {
    phase, run, chapter, stage, q, pieces, feedback, notice: message, continues,
    puzzle: {
      done: puzzle.done, found: puzzle.clues, shared: puzzle.shared, lanterns: puzzle.lanterns, taps: puzzle.taps,
      first: puzzle.clues[high] && (slot === high || puzzle.shared[high]) ? SYMBOLS[parts[0]] : null,
      second: puzzle.clues[1 - high] && (slot !== high || puzzle.shared[1 - high]) ? SYMBOLS[parts[1]] : null,
      patternOpen: puzzle.patternOpen,
    },
    quiz: quiz ? {
      id: quiz.id, role: quiz.role, supported: quiz.supported, attempts: quiz.attempts, retryAt: quiz.retryAt,
      text: BY_ID.get(quiz.id).text, category: BY_ID.get(quiz.id).category,
      options: BY_ID.get(quiz.id).options, hint: quiz.hint ? BY_ID.get(quiz.id).hint : null,
    } : null,
  };
}
