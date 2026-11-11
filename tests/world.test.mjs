import assert from 'node:assert/strict';
import test from 'node:test';
import { BY_ID, QUESTIONS, shuffledQuestions } from '../src/server/questions.js';
import { AudioEngine, MUSIC } from '../src/client/audio.js';
import { advance, applyInput, assignment, checkpoint, currentTarget, gameCommand, newWorld, pause, publicWorld } from '../src/server/world.js';
import {
  BRIDGE_SWITCHES, CHAPTERS, CLIMB, CRANK, EXIT, FLOOR, LABELS, PATTERN, PADS, PIT, RAFT_FROM, RAFT_PAD,
  SYMBOLS, TIMERS, stageOf,
} from '../src/shared/chapters.js';

class Pair {
  constructor() {
    this.t = 10_000;
    this.world = newWorld(this.t);
    this.controls = [{}, {}];
  }

  set(slot, input) {
    this.controls[slot] = input;
    applyInput(this.world, slot, input, this.t);
  }

  tick(ms) {
    const end = this.t + ms;
    while (this.t < end) {
      this.t = Math.min(this.t + 20, end);
      advance(this.world, this.t);
      this.controls.forEach((input, i) => applyInput(this.world, i, input, this.t));
    }
  }

  move(slot, x, y = FLOOR, jump = false) {
    const p = this.world.players[slot];
    const dir = Math.sign(x - p.x);
    this.set(slot, { dir, jump });
    for (let i = 0; Math.abs(p.x - x) > 4.1 && i < 325; i++) {
      this.tick(20);
    }
    this.set(slot, {});
    assert.ok(Math.abs(p.x - x) <= 4.1, 'Target x ' + x + ' from ' + p.x + ' in ' + stageOf(this.world).mode);
    if (jump) this.tick(920);
    assert.equal(p.y, y, 'Target y at ' + x + ' in ' + stageOf(this.world).mode);
  }

  tap(slot) {
    this.set(slot, { use: true });
    this.tick(40);
    this.set(slot, {});
  }

  command(slot, message) {
    const next = gameCommand(this.world, slot, message, this.t);
    if (next) this.world = next;
  }

  trivia(checkWrong = false) {
    const x = currentTarget(this.world);
    const slot = this.world.q % 2;
    const partner = 1 - slot;
    const support = stageOf(this.world).support && x === stageOf(this.world).quizAt[0];
    this.move(slot, x);
    this.move(partner, support ? CRANK : x - 9);
    if (support) {
      this.tap(slot);
      assert.equal(this.world.quiz, null, 'Soal tuas tertutup ketika bermain sendiri');
      this.set(partner, { use: true });
    }
    this.tap(slot);
    const { quiz } = this.world;
    assert.ok(quiz, 'Lentera opens at ' + x);
    const answer = BY_ID.get(quiz.id).answer;
    const q = this.world.q;
    this.command(partner, { t: 'answer', id: quiz.id, choice: answer });
    assert.equal(this.world.q, q, 'Only the assigned player can answer');
    if (checkWrong) {
      this.command(slot, { t: 'answer', id: quiz.id, choice: (answer + 1) % 4 });
      assert.equal(this.world.q, q);
      assert.equal(this.world.feedback.ok, false);
      assert.ok(publicWorld(this.world, slot).quiz.hint);
      this.tick(700);
    }
    this.command(slot, { t: 'answer', id: quiz.id, choice: answer });
    assert.equal(this.world.q, q + 1);
    this.command(slot, { t: 'answer', id: quiz.id, choice: answer });
    assert.equal(this.world.q, q + 1, 'Late replay cannot award a second answer');
    this.set(partner, {});
  }

  solve(mode) {
    const world = this.world;
    const [upper, lower] = assignment(world);
    if (mode === 'bridge') {
      this.move(0, 445);
      this.move(1, 468);
      this.set(0, { use: true });
      this.tick(750);
      this.move(1, 871);
      this.tap(1);
      this.set(0, {});
    } else if (mode === 'raft' || mode === 'cable') {
      this.move(0, RAFT_FROM - RAFT_PAD);
      this.move(1, RAFT_FROM + RAFT_PAD);
      this.set(0, { use: true });
      this.tick(850);
      assert.equal(world.puzzle.raftX, RAFT_FROM);
      this.set(1, { use: true });
      this.tick(2500);
      this.set(0, {});
      this.set(1, {});
    } else if (mode === 'clues') {
      this.move(upper, 266, 344, true);
      this.move(upper, 370, 297, true);
      this.move(upper, 451, 250, true);
      this.tap(upper);
      assert.ok(publicWorld(world, upper).puzzle.first);
      assert.equal(publicWorld(world, lower).puzzle.first, null, 'Private clue is filtered on the server');
      this.move(lower, 744);
      this.tap(lower);
      this.command(upper, { t: 'share' });
      this.command(lower, { t: 'share' });
      assert.equal(publicWorld(world, lower).puzzle.first, SYMBOLS[world.puzzle.pattern]);
      this.move(lower, PATTERN);
      this.tap(lower);
      this.command(lower, { t: 'pattern', choice: (world.puzzle.pattern + 1) % 4 });
      assert.equal(world.puzzle.done, false);
      this.command(lower, { t: 'pattern', choice: world.puzzle.pattern });
      this.set(upper, { dir: 1 });
      this.tick(750);
      this.set(upper, {});
    } else if (mode === 'timing') {
      this.move(upper, 269, 344, true);
      this.move(upper, 375, 310, true);
      this.move(upper, TIMERS[0][0], TIMERS[0][1], true);
      this.move(lower, TIMERS[1][0]);
      this.tap(upper);
      this.tick(1500);
      this.tap(lower);
      assert.equal(world.puzzle.done, false, 'Expired timing window does not open the gate');
      this.tap(upper);
      this.set(upper, { dir: 1 });
      this.tick(670);
      this.set(upper, {});
    } else if (mode === 'climb') {
      for (const slot of [upper, lower]) {
        this.move(slot, 449);
        this.move(slot, 553, 335, true);
        this.move(slot, 681, 280, true);
        this.move(slot, CLIMB[0] + (slot === lower ? 34 : 0), CLIMB[1], true);
        this.tap(slot);
      }
      this.set(0, { dir: 1 });
      this.set(1, { dir: 1 });
      this.tick(950);
      this.set(0, {});
      this.set(1, {});
    } else {
      const pads = mode === 'gate' ? [EXIT - 48, EXIT + 24] : PADS;
      this.move(0, pads[0]);
      this.move(1, pads[1]);
      this.set(0, { use: true });
      this.tick(1300);
      assert.equal(world.puzzle.done, false, 'Heavy mechanisms cannot be operated by one player');
      this.set(1, { use: true });
      this.tick(1200);
      this.set(0, {});
      this.set(1, {});
    }
    assert.equal(world.puzzle.done, true, 'Cooperative mechanism completes: ' + mode);
  }
}

test('60 distinct items, correct category counts and 10 unique server draws per island', () => {
  assert.equal(QUESTIONS.length, 60);
  assert.equal(new Set(QUESTIONS.map(q => q.text)).size, 60);
  assert.equal(BY_ID.size, 60);
  const categories = Object.values(Object.groupBy(QUESTIONS, q => q.category)).map(qs => qs.length);
  assert.deepEqual(categories, [24, 12, 12, 12]);
  assert.ok(QUESTIONS.every(q => q.options.length === 4 && new Set(q.options).size === 4 && q.options[q.answer] && q.correct && q.incorrect));
  const draws = new Set(Array.from({ length: 6 }, () => shuffledQuestions().join(',')));
  assert.equal(draws.size, 6);
  for (const order of draws) assert.equal(new Set(order.split(',')).size, 60);
  assert.deepEqual(CHAPTERS.map(ch => ch.name), ['Sumatra', 'Jawa', 'Kalimantan', 'Sulawesi', 'Papua', 'Bali']);
  for (const ch of CHAPTERS) assert.equal(ch.stages.reduce((n, stage) => n + stage.quizAt.length, 0), 10);
});

test('all 24 stages select the existing regional music, including three Sumatra themes and the ending', () => {
  assert.deepEqual(CHAPTERS.map(chapter => [...new Set(chapter.stages.map(stage => stage.theme))]), [
    ['aceh', 'toba', 'minang'], ['jawa'], ['kalimantan'], ['sulawesi'], ['papua'], ['bali'],
  ]);
  const audio = new AudioEngine({ music: .6, effects: .75, mute: false });
  for (const chapter of CHAPTERS) {
    for (const stage of chapter.stages) {
      const [title, beat, base, scale, melody] = MUSIC[stage.theme];
      assert.ok(title && beat > 0 && Number.isFinite(base));
      assert.equal(melody.length, 16);
      assert.ok(melody.every(note => note === null || Number.isInteger(note) && note >= 0 && note < scale.length));
      audio.change(stage.theme);
      assert.equal(audio.key, stage.theme);
    }
  }
  audio.change('senja');
  assert.equal(audio.key, 'senja');
  audio.change('missing');
  assert.equal(audio.key, 'senja');
});

test('two players traverse all six chapters, solve every puzzle type and restore the compass', () => {
  const pair = new Pair();
  const modes = new Set();
  const answerers = [0, 0];
  for (let chapter = 0; chapter < 6; chapter++) {
    for (const [i, stage] of CHAPTERS[chapter].stages.entries()) {
      assert.equal(pair.world.stage, i);
      modes.add(stage.mode);
      answerers[pair.world.q % 2]++;
      pair.trivia(chapter === 0 && i === 0);
      if (stage.mode !== 'gate') pair.solve(stage.mode);
      for (let j = 1; j < stage.quizAt.length; j++) {
        answerers[pair.world.q % 2]++;
        pair.trivia();
      }
      if (stage.mode === 'gate') pair.solve('gate');
      else {
        pair.move(0, EXIT - 30);
        pair.tap(0);
        assert.equal(pair.world.stage, i, 'One player cannot finish a stage alone');
        pair.move(1, EXIT);
        pair.tap(1);
      }
    }
    assert.equal(pair.world.q, (chapter + 1) * 10);
    assert.equal(pair.world.pieces.length, chapter + 1);
    assert.equal(pair.world.phase, chapter === 5 ? 'ending' : 'map');
    if (chapter < 5) {
      pair.command(0, { t: 'continue' });
      assert.equal(pair.world.phase, 'map');
      pair.command(1, { t: 'continue' });
    }
  }
  assert.equal(modes.size, Object.keys(LABELS).length);
  assert.deepEqual(answerers, [30, 30]);
  const first = pair.world.order.join(',');
  pair.command(0, { t: 'continue' });
  pair.command(1, { t: 'continue' });
  assert.equal(pair.world.q, 0);
  assert.notEqual(pair.world.order.join(','), first);
});

test('checkpoints keep earned items and clear temporary actions', () => {
  const pair = new Pair();
  pair.trivia();
  pair.move(0, 445);
  pair.set(0, { use: true });
  pair.tick(750);
  assert.equal(pair.world.puzzle.bridge, true);
  const saved = checkpoint(pair.world);
  assert.equal(saved.q, 1);
  assert.equal(saved.puzzle.bridge, false);
  assert.ok(saved.players.every(player => !player.input.use && player.vx === 0));
  assert.equal(saved.order.length, 60);
});

test('a bridge rises before trivia, requires two players, and survives interruption and checkpoint restore', () => {
  const pair = new Pair();
  const { world } = pair;
  const [lever, latch] = BRIDGE_SWITCHES;
  assert.ok(world.players.every(p => p.x < PIT[0] && p.grounded));
  pair.move(0, lever);
  pair.move(1, PIT[0] - 15);
  pair.set(1, { dir: 1 });
  pair.tick(190);
  assert.ok(world.players[1].y > FLOOR, 'no invisible crossing when the planks are down');
  pair.set(1, {});
  pair.tick(600);
  assert.ok(world.players[1].x < PIT[0] && world.players[1].grounded, 'fall restores the near-bank checkpoint');
  assert.equal(world.notice.kind, 'danger');

  pair.set(0, { use: true });
  pair.tick(220);
  assert.ok(world.puzzle.meter > 0 && world.puzzle.meter < 1);
  assert.equal(world.puzzle.bridge, false);
  pair.tick(550);
  assert.equal(world.q, 0);
  assert.equal(world.puzzle.bridge, true);
  pair.move(1, (PIT[0] + PIT[1]) / 2);
  pause(world, pair.t);
  pair.set(0, {});
  assert.equal(world.puzzle.bridge, false);
  assert.equal(world.puzzle.meter, 0);
  assert.ok(world.players[1].x < PIT[0]);

  pair.set(0, { use: true });
  pair.tick(750);
  pair.move(1, latch);
  pair.set(0, {});
  pair.tap(1);
  assert.equal(world.puzzle.done, false, 'far latch needs the other player holding the lever');
  pair.set(0, { use: true });
  pair.tick(750);
  pair.tap(1);
  assert.equal(world.puzzle.done, true);
  pair.set(0, {});
  pair.move(0, latch + 40);
  const saved = checkpoint(world);
  pause(saved, pair.t);
  assert.equal(saved.puzzle.bridge, true);
  assert.equal(saved.puzzle.meter, 1);
  assert.ok(saved.players.every(p => p.x >= PIT[1] && p.grounded));
});
