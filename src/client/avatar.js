import { SKIN, CLOTH } from '../shared/avatar-options.js';

export const AVATAR_WIDTH = 160;
export const AVATAR_HEIGHT = 182;
const INK = '#403539';
const HAIR = ['#28292d', '#352726', '#362822', '#2e242a'];
const HIJAB = [
  ['#efdbbb', '#c79977'], ['#444a51', '#31383f'], ['#aa5a69', '#763c53'], ['#769177', '#4c675d'],
];

function path(ctx, d, fill, stroke = INK, width = 2.7) {
  const p = new Path2D(d);
  if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(p); }
}

function ellipse(ctx, x, y, rx, ry, color, stroke = null, w = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

function limb(ctx, x, y, angle, cloth, skin, far) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  path(ctx, 'M-7 -1Q-1 -7 8 -1L9 15Q1 20 -7 15Z', far ? '#ae8e63' : cloth);
  path(ctx, 'M-5 15Q2 17 7 14L7 27Q7 32 2 32Q-4 31 -5 27Z', skin, INK, 2);
  path(ctx, 'M3 24q3 2 3 4', null, INK, 1.05);
  ctx.restore();
}

function leg(ctx, x, angle, color, far) {
  ctx.save();
  ctx.translate(x, 123);
  ctx.rotate(angle);
  path(ctx, 'M-10 -4H11L8 30H-7Z', color);
  path(ctx, 'M-8 28H8L9 36Q20 37 18 43H-8Q-12 39 -8 28Z', far ? '#544647' : '#634637');
  path(ctx, 'M-7 40h23m-12-6h5', null, '#c49b6e', 1.65);
  path(ctx, 'M-7 5h10m-7 5v9', null, '#695b55', 1.4);
  ctx.restore();
}

function curls(ctx, hair, short, tight) {
  const xs = short ? [49, 50, 53, 60, 72, 86, 99, 110, 117, 118, 115] : [48, 47, 48, 55, 68, 81, 97, 111, 120, 121, 118, 111, 51];
  const ys = short ? [57, 42, 30, 21, 16, 16, 20, 25, 37, 49, 57] : [76, 62, 45, 28, 20, 17, 19, 26, 39, 56, 73, 82, 87];
  xs.forEach((x, i) => {
    const r = (tight ? 9 : 13) + i % 3;
    ellipse(ctx, x, ys[i], r, r * .97, hair, INK, 1.8);
    if (i % 2 === 0) path(ctx, 'M' + (x - 5) + ' ' + (ys[i] - 2) + 'q5 -6 10 0', null, '#5d4544', 1.45);
  });
}

function backHair(ctx, role, head, color) {
  if (role === 1 && head === 4) return;
  if (role === 0 && head < 4) {
    path(ctx, 'M43 84Q31 58 43 34Q52 10 79 13Q109 11 122 41Q130 60 116 86L132 104Q104 115 78 112Q50 107 35 103Z', HIJAB[head][1]);
    return;
  }
  if ((role === 0 && head === 9) || (role === 1 && (head === 2 || head === 3))) {
    curls(ctx, color, role === 1, role === 1 && head === 3);
    return;
  }
  const backs = {
    4: 'M44 57Q39 15 83 14Q124 19 121 55L130 107Q108 120 86 111Q65 121 36 109Z',
    5: 'M46 52Q37 15 78 13Q116 14 124 45Q131 57 123 66Q132 82 124 91Q132 107 117 111Q104 121 90 110Q74 122 64 112Q45 118 32 106Q44 91 34 80Q43 71 46 52Z',
    6: 'M42 62Q37 19 78 17Q119 12 124 52L123 82Q109 96 81 92Q58 96 42 84Z',
    7: 'M45 58L39 37Q52 10 77 15Q103 5 120 32L126 63L115 81L109 72L97 85L60 82L46 87Z',
    8: 'M43 56Q40 16 79 17Q119 14 124 54L128 98Q107 108 82 99Q57 107 38 98Z',
  };
  path(ctx, role === 0 ? backs[head] : 'M43 54Q39 27 59 20Q76 9 98 18Q120 20 124 47L119 68L47 68Z', color);
}

function fringe(ctx, role, head, hair) {
  if (role === 0 && head < 4) {
    const [color, fold] = HIJAB[head];
    path(ctx, 'M39 49Q45 17 75 14Q108 11 122 41L123 70Q113 96 95 103L107 114Q83 122 62 109L57 98Q39 89 36 65Z M48 59Q51 86 67 93Q83 106 105 86Q120 72 112 49Q102 30 78 31Q56 31 48 59Z', color);
    path(ctx, 'M44 55Q52 25 76 24Q99 22 115 43M45 72Q47 89 65 102M117 76Q109 100 87 107M63 107Q73 115 90 116', null, fold, 2.2);
    return;
  }
  if (role === 1 && head === 4) {
    path(ctx, 'M57 37Q74 23 94 29', null, '#fff2dc', 2);
    return;
  }
  const straight = 'M44 55Q35 35 52 22Q69 8 97 17Q119 18 126 42L116 55L108 41Q91 44 78 33Q72 46 55 49L51 62Z';
  const wave = 'M45 53L39 37Q50 32 51 21Q66 25 73 14Q89 20 101 12Q105 24 120 24L126 40L120 55L110 42Q99 49 88 41Q74 48 66 40Q61 52 50 60Z';
  const curl = 'M46 58Q36 51 45 39Q41 27 55 27Q53 16 67 19Q75 9 86 18Q100 12 106 22Q119 18 123 31Q134 37 124 48L115 55Q110 40 101 43Q91 47 84 37Q74 44 66 38Q62 54 49 55Z';
  path(ctx, role === 0 ? (head === 9 ? curl : head === 5 || head === 7 ? wave : straight) : [straight, wave, curl, curl][head], hair);
  path(ctx, 'M54 32Q65 24 74 27M88 24q12 0 18 6', null, '#71504a', 2.05);
}

export function drawAvatar(ctx, look, role, pose = 'idle', ms = 0, face = 1, variation = '') {
  ctx.clearRect(0, 0, AVATAR_WIDTH, AVATAR_HEIGHT);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const skin = SKIN[look.skin][1];
  const cloth = CLOTH[look.cloth][1];
  const hair = variation === 'leo' ? '#a66d48' : HAIR[(look.skin + role) % HAIR.length];
  const fast = pose === 'run';
  const step = fast || pose === 'walk';
  const phase = ms * (fast ? .019 : .013);
  const wave = Math.sin(phase);
  const work = ['push', 'lift', 'rope', 'use'].includes(pose);
  const high = pose === 'celebrate';
  const airborne = pose === 'jump';
  const drop = pose === 'land' ? 6 : 0;
  const happy = high || pose === 'correct';
  const startled = ['wrong', 'surprise'].includes(pose);
  const think = pose === 'think';
  const hijab = role === 0 && look.head < 4;
  const bob = step ? -Math.abs(Math.sin(phase)) * 4 : high ? -Math.abs(Math.sin(ms * .011)) * 8 : Math.sin(ms * .004) * 1.45;
  ctx.translate(80, drop + bob);
  ctx.scale(face === -1 ? -1 : 1, 1);
  ctx.translate(-80, 0);
  ctx.rotate(fast ? .035 : work ? .025 : 0);
  if (look.accessory === 0) {
    path(ctx, 'M43 88Q34 89 33 105L35 126Q45 133 54 125L58 92Z', '#916044');
    path(ctx, 'M34 105Q41 100 50 104L49 118Q42 121 35 116Z', '#c39766', INK, 2);
  }
  const pants = look.outfit === 1 ? '#5c6662' : look.outfit === 2 ? '#6b5c64' : '#786755';
  const gait = (fast ? .58 : .4) * wave;
  leg(ctx, 70, step ? -gait : airborne ? .48 : -.07, '#625854', true);
  leg(ctx, 91, step ? gait : airborne ? -.52 : .1, pants, false);
  limb(ctx, 56, 92, step ? gait * .73 : high ? 2.35 : airborne ? .55 : pose === 'lift' ? 2.4 : .18, cloth, skin, true);
  path(ctx, 'M57 86Q80 80 101 86L107 110L101 127Q80 136 54 125L51 101Z', cloth);
  if (look.outfit === 1) {
    path(ctx, 'M76 87h13l6 42H70Z', '#f1d8aa', INK, 1.7);
    path(ctx, 'M83 95v30', null, '#877563', 1.5);
  } else if (look.outfit === 2) {
    path(ctx, 'M57 89L72 91L75 129H56L50 105Z M92 91L100 86L107 103L100 127L90 130Z', '#7e564d', INK, 1.6);
    for (let i = 0; i < 3; i++) {
      path(ctx, 'M59 ' + (101 + i * 7) + 'l5 -3 5 3-5 3z M94 ' + (101 + i * 7) + 'l3 -2 3 2-3 2z', '#e5b775', null);
    }
  } else {
    path(ctx, 'M72 89l11 8 12-8 M82 97v28 M60 110h11v9H60z M91 110h10v9H91z', null, '#805b48', 1.55);
    ellipse(ctx, 85, 108, 1.65, 1.65, '#f9d48b');
    ellipse(ctx, 85, 119, 1.65, 1.65, '#f9d48b');
  }
  path(ctx, 'M55 124Q80 131 101 123v5Q79 135 56 128Z', '#554549', INK, 1.7);
  path(ctx, 'M79 125h10v6H79Z', '#e4bd71', INK, 1.1);
  if (look.accessory <= 1) {
    path(ctx, 'M60 89l6 -1 34 31-4 4Z', '#694b42', INK, 1.35);
    if (look.accessory === 1) {
      path(ctx, 'M91 110q9 -4 16 1l1 19q-9 5-17 0Z', '#a77050');
      path(ctx, 'M93 113q7 -2 12 0v7h-12Z', '#d5a66f', INK, 1.2);
    }
  }
  if (look.accessory === 3) path(ctx, 'M67 88q18 -6 29 4l-8 12-9 9-4-12-10-4Z', '#b95255');
  limb(ctx, 101, 92, work ? (pose === 'lift' ? -2.32 : pose === 'rope' ? -.96 : -1.25)
    : high ? -2.44 : airborne ? -.88 : think ? -.78 : step ? -gait * .9 : -.15, cloth, skin, false);

  backHair(ctx, role, look.head, hair);
  if (!hijab) {
    ellipse(ctx, 48, 62, 8, 10, skin, INK, 2.3);
    ellipse(ctx, 115, 62, 8, 10, skin, INK, 2.3);
  }
  path(ctx, 'M48 58Q44 28 78 24Q106 21 117 46Q122 65 109 83Q100 96 82 97Q66 97 55 83Q49 74 48 58Z', skin);
  ellipse(ctx, 60, 72, 7, 4, '#d98472', null);
  ellipse(ctx, 106, 71, 6.5, 4, '#d98472', null);
  const blink = ms % 3100 > 2960 && !startled;
  for (const x of [69, 99]) {
    path(ctx, 'M' + (x - 7) + ' ' + (startled ? 51 : 52) + 'q7 -5 13 0', null, hair, 2.15);
    if (blink || high) {
      path(ctx, 'M' + (x - 6) + ' 64q6 -7 12 0', null, INK, 2.7);
    } else {
      ellipse(ctx, x, 62, 6.6, startled ? 9.4 : 8.2, '#fff4df', INK, 1.55);
      ellipse(ctx, x + (think ? -1 : 1.8), 62.9, 3.85, 6.0, '#45303b');
      ellipse(ctx, x + .2, 60.15, 1.65, 2.05, '#fffafa');
    }
  }
  path(ctx, 'M85 66q4 3 1 6', null, '#a46455', 1.55);
  if (startled) ellipse(ctx, 85, 80, 5, 5.7, '#72454a', INK, 1.25);
  else if (happy || !think) {
    path(ctx, 'M76 78q8 4 18 -1q-3 12-11 11q-5 -1-7-10Z', '#793e4c', INK, 1.6);
    path(ctx, 'M78 79q6 2 13 0q-1 4 -7 4Z', '#fff1dc', null);
  } else path(ctx, 'M79 81q5 3 10 -1', null, INK, 1.8);
  fringe(ctx, role, look.head, hair);
  if (look.accessory === 2) {
    if (hijab) {
      path(ctx, 'M110 62l7-5 5 5-6 8Z', '#f4d17c', INK, 1.3);
    } else {
      path(ctx, 'M43 44Q77 34 118 42L120 50Q80 43 45 52Z', '#b64f4f', INK, 1.8);
      path(ctx, 'M45 48L33 43L34 51L26 58L43 54Z', '#a8474f', INK, 1.55);
      for (let x = 52; x < 117; x += 12) path(ctx, 'M' + x + ' 45l4 -2 4 2-4 2z', '#f5bc72', null);
    }
  }
  if (variation === 'laras') {
    for (const [x, y] of [[114,39],[121,42],[114,47],[108,43]]) ellipse(ctx, x, y, 4, 4, '#f3ac9c', INK, 1.1);
    ellipse(ctx, 115, 43, 2.4, 2.4, '#f4cc6f');
  }
  if (high || pose === 'correct') {
    const lift = Math.sin(ms * .008) * 5;
    path(ctx, 'M129 ' + (20 + lift) + 'l4 9 9 4-9 3-4 9-3-9-9-3 9-4Z', '#f6c664', '#9b5b40', 1.25);
  }
  ctx.restore();
}
