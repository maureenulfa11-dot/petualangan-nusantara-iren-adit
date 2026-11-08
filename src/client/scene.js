import Phaser from 'phaser';
import {
  CHAPTERS, CAST, WIDTH, FLOOR, PIT, EXIT, CRANK, RAFT_HALF, RAFT_PAD,
  BRIDGE_SWITCHES, CLUE_HIGH, CLUE_LOW, PATTERN, CLIMB, PADS, TIMERS,
  stageOf, stageQuestionStart, platformsFor, hasPit,
} from '../shared/chapters.js';
import { drawAvatar, AVATAR_WIDTH, AVATAR_HEIGHT } from './avatar.js';

const VIEW_W = 960;
const VIEW_H = 480;
const PALETTE = {
  cream: 0xffe6ab, gold: 0xf1be66, deep: 0x243d37, brown: 0x704f42, timber: 0xa77854,
  teal: 0x3f8069, fern: 0x8eb36e, light: 0xe7bd83, stone: 0x6e8077,
};
const COLORS = [0xffe9b2, 0xc5f0e0];
const text = { fontFamily: 'Plus Jakarta Sans Variable, sans-serif', color: '#fff4d4', fontSize: '13px', fontStyle: 'bold', stroke: '#25433b', strokeThickness: 4 };

class AdventureScene extends Phaser.Scene {
  constructor(read) {
    super('adventure');
    this.read = read;
    this.artKeys = [...new Set(CHAPTERS.flatMap(ch => ch.stages.map(stage => stage.landscape || stage.theme)))];
  }

  preload() {
    for (const key of this.artKeys) {
      this.load.svg(key + '-far', '/art/' + key + '-far.svg');
      this.load.svg(key + '-near', '/art/' + key + '-near.svg');
    }
  }

  create() {
    this.cameras.main.setBounds(0, 0, WIDTH, VIEW_H);
    this.cameras.main.setBackgroundColor('#216155');
    this.stageObjects = this.add.container();
    this.dynamic = this.add.graphics().setDepth(8);
    this.foreground = this.add.graphics().setDepth(16);
    this.hero = [0, 1].map(i => {
      const canvas = this.textures.createCanvas('hiker-' + i, AVATAR_WIDTH, AVATAR_HEIGHT);
      return {
        canvas,
        image: this.add.image(0, 0, canvas.key).setScale(.68).setOrigin(.5, .905).setDepth(12),
        name: this.add.text(0, 0, '', { ...text, fontSize: '14px' }).setOrigin(.5).setDepth(14),
      };
    });
    this.targetIcon = this.add.text(0, 0, '', { ...text, fontSize: '19px' }).setOrigin(.5).setDepth(10);
    this.lastArt = -100;
  }

  stageArt(world) {
    this.stageObjects.removeAll(true);
    const stage = stageOf(world);
    const backdrop = stage.landscape || stage.theme;
    const layer = (x, y, key, factor, depth) => this.add.image(x, y, key)
      .setOrigin(0).setScrollFactor(factor, 1).setDepth(depth);
    this.stageObjects.add(layer(0, 0, backdrop + '-far', .35, 0));
    this.stageObjects.add(layer(0, 0, backdrop + '-near', .83, 1));
    const floor = this.add.graphics();
    this.stageObjects.add(floor);
    const banks = hasPit(stage) ? [[0, PIT[0]], [PIT[1], WIDTH]] : [[0, WIDTH]];
    if (hasPit(stage)) {
      floor.fillStyle(stage.mode === 'cable' ? 0x608b9c : 0x4da7a9, 1).fillRect(PIT[0], FLOOR + 29, PIT[1] - PIT[0], 91);
      floor.fillStyle(0x4e949b, 1).fillRect(PIT[0], FLOOR + 61, PIT[1] - PIT[0], 63);
      floor.lineStyle(2, 0xa9e5cc, .64);
      for (let i = 0; i < 14; i++) floor.lineBetween(512 + (i * 63 % 261), 430 + (i * 17 % 43), 533 + (i * 63 % 261), 430 + (i * 17 % 43));
    }
    for (const [left, right] of banks) this.ground(floor, left, right, stage);
    for (const [left, right, y] of platformsFor(stage)) {
      floor.fillStyle(0x586961, 1).fillRoundedRect(left, y, right - left, 24, 6);
      floor.fillStyle(0x8ba97b, 1).fillRoundedRect(left - 2, y - 2, right - left + 4, 8, 4);
      floor.lineStyle(2, 0xb8c580, .85).lineBetween(left + 4, y, right - 4, y);
      floor.lineStyle(2, 0x405a55, .65).lineBetween(left + 11, y + 14, right - 8, y + 14);
    }
    this.cameras.main.setScroll(0, 0);
    this.raftX = undefined;
    this.hero.forEach((h, i) => h.image.setPosition(110 + i * 50, FLOOR));
  }

  ground(g, left, right, stage) {
    const width = right - left;
    g.fillStyle(0x69544a, 1).fillRect(left, FLOOR, width, VIEW_H - FLOOR);
    g.fillStyle(0x7c6052, 1).fillRect(left, FLOOR, width, 31);
    g.fillStyle(0x97745a, 1).fillRect(left, FLOOR, width, 14);
    g.fillStyle(0x517957, 1).fillRect(left, FLOOR - 4, width, 10);
    g.fillStyle(0xa6be76, 1).fillRect(left, FLOOR - 4, width, 3);
    for (let x = left + 5; x < right - 5; x += 13) {
      const n = (x * 29) % 17;
      g.fillStyle(x % 5 ? 0x63865a : 0xaac275, 1).fillTriangle(x - 3, FLOOR, x + (x % 5), FLOOR - 7 - n / 2, x + 6, FLOOR);
      if (x % 3 === 0) {
        g.fillStyle(n % 2 ? 0x8a6a58 : 0x584b45, .78).fillEllipse(x, FLOOR + 14 + (x * 31) % 72, 4 + n, 3 + n / 3);
      }
    }
    for (let x = left + 30; x < right - 30; x += 124) {
      this.leaves(g, x + (x * 9 % 26), FLOOR + 4, x % 5 ? 0x568c64 : 0x90ac68, x % 7);
      if (stage.theme !== 'papua' && x % 3) {
        g.fillStyle(x % 2 ? 0xf1bd72 : 0xe8a8a0, .96).fillCircle(x + 9, FLOOR - 18, 3).fillCircle(x + 5, FLOOR - 20, 3);
        g.fillStyle(0xffdf9a, 1).fillCircle(x + 7, FLOOR - 19, 2);
      }
    }
  }

  leaves(g, x, y, color, sway) {
    g.fillStyle(color, 1);
    for (let i = -2; i <= 2; i++) {
      const dx = i * (7 + sway / 3);
      const height = 16 - Math.abs(i) * 3;
      g.fillTriangle(x, y, x + dx, y - height, x + dx + 6, y - height / 2);
    }
  }

  lantern(g, x, y, type, active, ms) {
    const c = PALETTE;
    g.fillStyle(0x2f4a41, .42).fillEllipse(x, y + 2, 42, 11);
    g.fillStyle(c.deep, 1).fillRoundedRect(x - 16, y - 13, 32, 14, 4);
    g.fillStyle(c.stone, 1).fillRoundedRect(x - 12, y - 24, 24, 15, 5);
    g.fillStyle(c.brown, 1).fillRoundedRect(x - 5, y - 52, 10, 36, 4);
    const t = active ? .26 + Math.sin(ms / 260) * .045 : .12;
    g.fillStyle(active ? c.gold : 0xa3cdb6, t).fillCircle(x, y - 46, 23 + Math.sin(ms / 350) * 2);
    g.fillStyle(active ? c.cream : 0xadd1b3, 1).fillRoundedRect(x - 12, y - 58, 24, 23, 5);
    g.lineStyle(3, c.brown, 1).strokeRoundedRect(x - 12, y - 58, 24, 23, 5);
    if (type === 'clue') {
      g.fillStyle(c.teal, 1).fillTriangle(x - 6, y - 45, x + 6, y - 45, x, y - 55);
    } else {
      g.fillStyle(c.brown, 1).fillCircle(x, y - 46, 3);
    }
  }

  switch(g, x, y, on, stage = 'wood') {
    const c = PALETTE;
    g.fillStyle(c.deep, .42).fillEllipse(x, y + 1, 43, 10);
    g.fillStyle(stage === 'wood' ? c.brown : c.stone, 1).fillRoundedRect(x - 17, y - 17, 34, 17, 4);
    g.lineStyle(5, c.deep, 1).lineBetween(x, y - 15, x + (on ? 12 : -12), y - 35);
    g.fillStyle(on ? 0xc6e7a3 : 0xefbb7b, 1).fillCircle(x + (on ? 12 : -12), y - 37, 7);
    g.lineStyle(2, c.brown, 1).strokeCircle(x + (on ? 12 : -12), y - 37, 7);
  }

  gate(g, x, y, open, special = false) {
    const c = PALETTE;
    g.fillStyle(0x29473d, .43).fillEllipse(x, y + 3, 103, 19);
    g.fillStyle(open ? 0x84b985 : c.deep, open ? .26 : .8).fillRoundedRect(x - 33, y - 110, 66, 111, 16);
    for (const sign of [-1, 1]) {
      const px = x + sign * 39;
      g.fillStyle(c.stone, 1).fillRoundedRect(px - 11, y - 102, 22, 102, 6);
      g.fillStyle(c.deep, .45).fillRect(px - 11, y - 22, 22, 4).fillRect(px - 11, y - 60, 22, 4);
      g.fillStyle(c.light, .58).fillRect(px - 7, y - 96, 3, 83);
      g.fillStyle(c.brown, 1).fillRoundedRect(px - 15, y - 8, 30, 10, 3);
    }
    g.fillStyle(c.stone, 1).fillRoundedRect(x - 57, y - 112, 114, 21, 8);
    g.fillStyle(c.cream, open ? 1 : .55).fillCircle(x, y - 105, special ? 15 : 9);
    g.lineStyle(2, c.brown, 1).strokeCircle(x, y - 105, special ? 15 : 9);
  }

  drawMechanism(stage, world, motion, ms, smooth) {
    const g = this.dynamic.clear();
    const c = PALETTE;
    const { mode, quizAt } = stage;
    const { puzzle } = world;
    const start = stageQuestionStart(world);
    const target = quizAt[world.q - start];
    for (let i = 0; i < quizAt.length; i++) {
      this.lantern(g, quizAt[i], FLOOR, 'quiz', i <= world.q - start, ms);
    }
    this.targetIcon.setVisible(target !== undefined && !world.quiz);
    if (target !== undefined) this.targetIcon.setText('✦').setPosition(target, FLOOR - 78 + Math.sin(ms / 170) * 4);
    if (stage.support) this.switch(g, CRANK, FLOOR, Boolean(world.quiz?.supported), 'stone');
    if (mode === 'bridge') {
      const [left, right] = PIT;
      if (motion.bridge) {
        g.fillStyle(c.brown, 1).fillRoundedRect(left - 3, FLOOR - 4, right - left + 6, 16, 4);
        for (let x = left; x <= right; x += 16) g.fillStyle(c.timber, 1).fillRoundedRect(x, FLOOR - 5, 13, 10, 2);
        for (let x = left; x <= right; x += 40) g.lineStyle(4, c.brown, 1).lineBetween(x, FLOOR + 3, x, FLOOR - 25);
        g.lineStyle(3, 0xd4ab6e, 1).lineBetween(left, FLOOR - 21, right, FLOOR - 21);
      } else {
        g.lineStyle(3, c.timber, .9);
        g.lineBetween(left, FLOOR - 7, left + 52, FLOOR + 32);
        g.lineBetween(right, FLOOR - 7, right - 44, FLOOR + 39);
        for (let i = 0; i < 4; i++) g.fillStyle(c.brown, 1).fillRect(left + i * 11, FLOOR + i * 5, 9, 6);
      }
      this.switch(g, BRIDGE_SWITCHES[0], FLOOR, motion.bridge);
      this.switch(g, BRIDGE_SWITCHES[1], FLOOR, puzzle.done);
    }
    if (mode === 'raft' || mode === 'cable') {
      this.raftX = this.raftX === undefined ? motion.raftX : Phaser.Math.Linear(this.raftX, motion.raftX, smooth);
      const x = this.raftX;
      if (mode === 'cable') {
        g.lineStyle(5, c.brown, .93).lineBetween(PIT[0] - 40, FLOOR - 123, PIT[1] + 55, FLOOR - 123);
        g.lineStyle(3, c.cream, .75).lineBetween(x - 67, FLOOR - 7, x, FLOOR - 120).lineBetween(x, FLOOR - 120, x + 67, FLOOR - 7);
        g.fillStyle(c.brown, 1).fillCircle(x, FLOOR - 120, 9);
      }
      g.fillStyle(c.brown, 1).fillRoundedRect(x - RAFT_HALF, FLOOR - 3, RAFT_HALF * 2, 18, 8);
      g.fillStyle(c.light, 1).fillRoundedRect(x - RAFT_HALF, FLOOR - 4, RAFT_HALF * 2, 8, 4);
      for (let i = 0; i < 9; i++) g.lineStyle(2, c.brown, .55).lineBetween(x - 85 + i * 21, FLOOR - 3, x - 85 + i * 21, FLOOR + 10);
      [-1, 1].forEach((sign, i) => this.switch(g, x + sign * RAFT_PAD, FLOOR, motion.pad[i]));
    }
    if (['lift', 'push', 'rope'].includes(mode)) {
      const x = puzzle.done ? 706 : 638 + motion.meter * .45;
      const y = puzzle.done ? FLOOR - 18 : FLOOR - motion.meter * .56;
      if (mode === 'push' && world.chapter === 2) {
        g.fillStyle(c.brown, 1).fillRoundedRect(x - 50, y - 74, 122, 67, 21);
        g.fillStyle(c.timber, 1).fillEllipse(x - 45, y - 41, 33, 59);
        g.lineStyle(3, c.brown, 1).strokeEllipse(x - 45, y - 41, 26, 45).strokeEllipse(x - 45, y - 41, 17, 28);
      } else if (mode === 'push') {
        g.fillStyle(c.deep, 1).fillRoundedRect(x - 48, y - 103, 108, 107, 15);
        g.fillStyle(c.stone, 1).fillRoundedRect(x - 44, y - 104, 97, 97, 14);
        g.lineStyle(3, 0xbac2a5, .75).lineBetween(x - 33, y - 81, x + 15, y - 81).lineBetween(x - 33, y - 67, x - 4, y - 67);
      } else {
        g.fillStyle(c.brown, 1).fillRoundedRect(x - 45, y - 104, 98, 107, 7);
        g.fillStyle(c.timber, 1).fillRoundedRect(x - 41, y - 101, 87, 92, 5);
        g.lineStyle(4, c.brown, .95).strokeRoundedRect(x - 36, y - 95, 77, 84, 4);
        g.lineBetween(x - 35, y - 93, x + 42, y - 13).lineBetween(x + 42, y - 93, x - 35, y - 13);
      }
      if (!puzzle.done) PADS.forEach((pad, i) => this.switch(g, pad, FLOOR, motion.pad[i]));
    }
    if (mode === 'clues') {
      this.lantern(g, ...CLUE_HIGH, 'clue', puzzle.found[(world.chapter + world.stage) % 2], ms);
      this.lantern(g, ...CLUE_LOW, 'clue', puzzle.found[1 - (world.chapter + world.stage) % 2], ms);
      this.switch(g, PATTERN, FLOOR, puzzle.done, 'stone');
      if (!puzzle.done) this.gate(g, 961, FLOOR, false);
    }
    if (mode === 'timing') {
      const first = (world.chapter + world.stage) % 2;
      TIMERS.forEach(([x, y], i) => this.switch(g, x, y, puzzle.done || Date.now() - puzzle.taps[i === 0 ? first : 1 - first] < 1350, 'stone'));
      if (!puzzle.done) this.gate(g, 943, FLOOR, false);
    }
    if (mode === 'climb') {
      const first = (world.chapter + world.stage) % 2;
      this.lantern(g, ...CLIMB, 'clue', puzzle.lanterns[first], ms);
      this.lantern(g, CLIMB[0] + 34, CLIMB[1], 'clue', puzzle.lanterns[1 - first], ms);
      if (!puzzle.done) this.gate(g, 951, FLOOR, false);
    }
    const canExit = puzzle.done && target === undefined;
    this.gate(g, EXIT, FLOOR, canExit, mode === 'gate');
    if (mode === 'gate') [EXIT - 48, EXIT + 24].forEach((pad, i) => this.switch(g, pad, FLOOR, motion.pad[i], 'stone'));
    if (canExit) {
      const y = FLOOR - 138 + Math.sin(ms / 215) * 4;
      g.fillStyle(c.gold, .32).fillCircle(EXIT, y, 16);
      g.fillStyle(c.gold, 1).fillTriangle(EXIT - 9, y, EXIT + 9, y, EXIT, y - 13).fillTriangle(EXIT - 9, y, EXIT + 9, y, EXIT, y + 13);
    }
  }

  update(ms, dt) {
    const data = this.read();
    if (!data?.world || !data.motion || data.world.phase !== 'play') return;
    const { world, motion, members, self } = data;
    const key = [world.run, world.chapter, world.stage].join(':');
    if (this.stageKey !== key) {
      this.stageKey = key;
      this.stageArt(world);
    }
    const smooth = 1 - Math.exp(-Math.min(dt, 60) / 49);
    this.drawMechanism(stageOf(world), world, motion, ms, smooth);
    for (let slot = 0; slot < 2; slot++) {
      const h = this.hero[slot];
      const [x, y, , face, pose, grounded] = motion.players[slot];
      const member = members[slot];
      if (!member) continue;
      const fx = Math.abs(x - h.image.x) > 185 ? 1 : smooth;
      h.image.setPosition(Phaser.Math.Linear(h.image.x, x, fx), Phaser.Math.Linear(h.image.y, y, fx));
      h.name.setText(CAST[member.role] + (slot === self ? ' ◇' : '')).setPosition(h.image.x, h.image.y - 121);
      const feedback = world.feedback && Date.now() - world.feedback.at < 1450 && world.feedback.role === slot ? world.feedback : null;
      const expression = feedback ? (feedback.ok ? 'correct' : 'wrong')
        : world.quiz?.role === slot && grounded && pose === 'idle' ? 'think'
          : world.notice?.kind === 'success' && Date.now() - world.notice.at < 1050 && pose === 'idle' ? 'celebrate' : pose;
      if (ms - this.lastArt >= 31) {
        drawAvatar(h.canvas.getContext(), member.avatar, member.role, expression, ms + slot * 300, face);
        h.canvas.refresh();
      }
    }
    if (ms - this.lastArt >= 31) this.lastArt = ms;
    const local = this.hero[self].image;
    this.cameras.main.setScroll(Phaser.Math.Clamp(Phaser.Math.Linear(this.cameras.main.scrollX, local.x - 390, smooth), 0, WIDTH - VIEW_W), 0);
    const g = this.foreground.clear();
    for (let i = 0; i < 2; i++) {
      const hero = this.hero[i].image;
      if (hero.x < this.cameras.main.scrollX || hero.x > this.cameras.main.scrollX + VIEW_W) {
        const side = hero.x < this.cameras.main.scrollX ? -1 : 1;
        const x = this.cameras.main.scrollX + (side === -1 ? 18 : VIEW_W - 18);
        g.fillStyle(COLORS[i], .94).fillTriangle(x + side * 8, 194, x - side * 7, 186, x - side * 7, 202);
      }
    }
  }
}

export function mountGame(parent, read) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: VIEW_W, height: VIEW_H,
    backgroundColor: '#1b4f47', antialias: true, banner: false,
    fps: { target: 60 }, audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new AdventureScene(read)],
  });
}
