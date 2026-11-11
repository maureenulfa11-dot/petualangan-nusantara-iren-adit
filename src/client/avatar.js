import { SKIN, CLOTH } from '../shared/avatar-options.js';
import { drawSpriteAvatar, drawSpriteCompanion, hasSpriteLook } from './avatar-sprites.js';

export const AVATAR_WIDTH = 160;
export const AVATAR_HEIGHT = 182;
export const AVATAR_PIXELS = 2;
const INK = '#403539';
const HAIR = ['#28292d', '#352726', '#362822', '#2e242a'];
const HIJAB = [
  ['#efdbbb', '#c79977'], ['#444a51', '#31383f'], ['#aa5a69', '#763c53'], ['#769177', '#4c675d'],
];

function tint(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  return '#' + [16, 8, 0].map(shift => {
    const channel = (value >> shift) & 255;
    return Math.round(channel + (target - channel) * Math.abs(amount)).toString(16).padStart(2, '0');
  }).join('');
}

function shade(ctx, x, y, endX, endY, color, light = .27, dark = -.24) {
  const gradient = ctx.createLinearGradient(x, y, endX, endY);
  gradient.addColorStop(0, tint(color, light));
  gradient.addColorStop(.53, color);
  gradient.addColorStop(1, tint(color, dark));
  return gradient;
}

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
  path(ctx, 'M-8 -1Q-2 -7 8 -1Q11 6 9 16Q1 20 -7 16Z', shade(ctx, -7, 1, 10, 16, far ? tint(cloth, -.17) : cloth));
  path(ctx, 'M-6 14q7 3 14-1', null, tint(cloth, -.33), 1.5);
  if (!far) {
    path(ctx, 'M-3 2h8v5h-8z', '#fff1d5', INK, .7);
    path(ctx, 'M-3 2h8v2.5h-8z', '#c44b44', null);
  }
  path(ctx, 'M-5 16Q1 18 7 15L7 24Q10 27 8 30Q6 35 1 34Q-5 32 -6 27Z', shade(ctx, -6, 16, 8, 31, skin, .20, -.18), INK, 2);
  path(ctx, 'M3 25q3 1 3 4m-5 0q2 0 2 2', null, tint(skin, -.40), 1.05);
  ctx.restore();
}

function leg(ctx, x, angle, color, far) {
  ctx.save();
  ctx.translate(x, 123);
  ctx.rotate(angle);
  path(ctx, 'M-10 -4H11L9 15L8 31H-7L-10 16Z', shade(ctx, -11, 0, 12, 28, color));
  path(ctx, 'M-8 28H8L10 35Q21 36 18 43H-8Q-12 39 -8 28Z', shade(ctx, -9, 28, 18, 43, far ? '#5e4c49' : '#80573b'));
  path(ctx, 'M-7 40q12 1 23 0m-15-9h7m-7 3h8', null, '#e2b27d', 1.55);
  path(ctx, 'M-7 5h11l-1 9h-8zm0 11 1 8m9-3 2 4', null, tint(color, -.40), 1.25);
  ctx.restore();
}

function curls(ctx, hair, short, tight) {
  const xs = short ? [49, 50, 53, 60, 72, 86, 99, 110, 117, 118, 115] : [48, 47, 48, 55, 68, 81, 97, 111, 120, 121, 118, 111, 51];
  const ys = short ? [57, 42, 30, 21, 16, 16, 20, 25, 37, 49, 57] : [76, 62, 45, 28, 20, 17, 19, 26, 39, 56, 73, 82, 87];
  xs.forEach((x, i) => {
    const r = (tight ? 9 : 13) + i % 3;
    ellipse(ctx, x, ys[i], r, r * .97, shade(ctx, x - r, ys[i] - r, x + r, ys[i] + r, hair, .22, -.25), INK, 1.8);
    if (i % 2 === 0) path(ctx, 'M' + (x - 5) + ' ' + (ys[i] - 2) + 'q5 -6 10 0', null, '#5d4544', 1.45);
  });
}

function backHair(ctx, role, head, color) {
  if (role === 1 && head === 4) return;
  if (role === 0 && head < 4) {
    path(ctx, 'M43 84Q31 58 43 34Q52 10 79 13Q109 11 122 41Q130 60 116 86L132 104Q104 115 78 112Q50 107 35 103Z', shade(ctx, 38, 18, 115, 109, HIJAB[head][1]));
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
  path(ctx, role === 0 ? backs[head] : 'M43 54Q39 27 59 20Q76 9 98 18Q120 20 124 47L119 68L47 68Z', shade(ctx, 44, 17, 123, 90, color, .21, -.33));
}

function fringe(ctx, role, head, hair) {
  if (role === 0 && head < 4) {
    const [color, fold] = HIJAB[head];
    path(ctx, 'M39 49Q45 17 75 14Q108 11 122 41L123 70Q113 96 95 103L107 114Q83 122 62 109L57 98Q39 89 36 65Z M48 59Q51 86 67 93Q83 106 105 86Q120 72 112 49Q102 30 78 31Q56 31 48 59Z', shade(ctx, 44, 20, 122, 110, color, .38, -.25));
    path(ctx, 'M44 55Q52 25 76 24Q99 22 115 43M45 72Q47 89 65 102M117 76Q109 100 87 107M63 107Q73 115 90 116', null, fold, 2.2);
    path(ctx, 'M48 42q13 -22 36 -19q18 1 29 17M55 91q11 12 23 15', null, tint(color, .53), 2.6);
    return;
  }
  if (role === 1 && head === 4) {
    path(ctx, 'M57 37Q74 23 94 29', null, '#fff2dc', 2);
    return;
  }
  const straight = 'M44 55Q35 35 52 22Q69 8 97 17Q119 18 126 42L116 55L108 41Q91 44 78 33Q72 46 55 49L51 62Z';
  const wave = 'M45 53L39 37Q50 32 51 21Q66 25 73 14Q89 20 101 12Q105 24 120 24L126 40L120 55L110 42Q99 49 88 41Q74 48 66 40Q61 52 50 60Z';
  const curl = 'M46 58Q36 51 45 39Q41 27 55 27Q53 16 67 19Q75 9 86 18Q100 12 106 22Q119 18 123 31Q134 37 124 48L115 55Q110 40 101 43Q91 47 84 37Q74 44 66 38Q62 54 49 55Z';
  path(ctx, role === 0 ? (head === 9 ? curl : head === 5 || head === 7 ? wave : straight) : [straight, wave, curl, curl][head], shade(ctx, 51, 18, 117, 57, hair, .28, -.30));
  path(ctx, 'M54 32Q65 24 74 27M88 24q12 0 18 6M48 38q8-5 14-5', null, tint(hair, .29), 2.05);
}

export function drawAvatar(ctx, look, role, pose = 'idle', ms = 0, face = 1, variation = '') {
  if (variation && drawSpriteCompanion(ctx, variation, pose)) return;
  if (hasSpriteLook(look, role, variation)) {
    drawSpriteAvatar(ctx, role, pose, ms, face, look);
    return;
  }
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.scale(ctx.canvas.width / AVATAR_WIDTH, ctx.canvas.height / AVATAR_HEIGHT);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const skin = SKIN[look.skin][1];
  const cloth = CLOTH[look.cloth][1];
  const hair = variation === 'leo' ? '#ba814e' : HAIR[(look.skin + role) % HAIR.length];
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
  const effort = work ? Math.sin(ms * .011) * 1.5 : 0;
  const bob = step ? -Math.abs(wave) * 4 : high ? -Math.abs(Math.sin(ms * .011)) * 8 : Math.sin(ms * .004) * 1.65;
  ctx.translate(80, drop + bob);
  ctx.scale(face === -1 ? -1 : 1, 1);
  ctx.translate(-80, 0);
  ctx.rotate(fast ? .045 : work ? .035 + effort * .008 : 0);
  if (look.accessory === 0 || (role === 1 && look.accessory === 2)) {
    path(ctx, 'M43 87Q32 86 29 101L31 125Q44 134 55 125L59 92Z', shade(ctx, 29, 86, 57, 124, '#916044'));
    path(ctx, 'M31 105Q41 100 50 104L49 120Q40 123 32 117Z', shade(ctx, 33, 101, 52, 119, '#c39766'), INK, 2);
    path(ctx, 'M33 107q8-4 14-1m-12 8q5 3 10 1', null, '#f2c996', 1.15);
  }
  const pants = look.outfit === 1 ? '#5c6662' : look.outfit === 2 ? '#6b5c64' : '#786755';
  const gait = (fast ? .58 : .4) * wave;
  leg(ctx, 70, step ? -gait : airborne ? .48 : -.07, '#625854', true);
  leg(ctx, 91, step ? gait : airborne ? -.52 : .1, pants, false);
  limb(ctx, 56, 92, step ? gait * .73 : high ? 2.35 : airborne ? .55 : pose === 'lift' ? 2.4 : .18, cloth, skin, true);
  path(ctx, 'M57 86Q80 80 101 86L107 110L101 127Q80 136 54 125L51 101Z', shade(ctx, 56, 87, 105, 130, cloth, .34, -.24));
  path(ctx, 'M59 89q6-4 13-3m-16 34q13 7 24 5m14-23 7 2', null, tint(cloth, .39), 1.3);
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
  limb(ctx, 101, 92, work ? (pose === 'lift' ? -2.32 : pose === 'rope' ? -.96 : -1.25) + effort * .055
    : high ? -2.44 : airborne ? -.88 : think ? -.78 : step ? -gait * .9 : -.15, cloth, skin, false);

  backHair(ctx, role, look.head, hair);
  if (!hijab) {
    ellipse(ctx, 48, 62, 8, 10, skin, INK, 2.3);
    ellipse(ctx, 115, 62, 8, 10, skin, INK, 2.3);
  }
  path(ctx, 'M48 58Q44 28 78 24Q106 21 117 46Q122 65 109 83Q100 96 82 97Q66 97 55 83Q49 74 48 58Z', shade(ctx, 62, 33, 103, 93, skin, .24, -.19));
  const blush = tint(skin, -.10);
  ellipse(ctx, 59, 72, 7, 4, blush);
  ellipse(ctx, 107, 72, 6.5, 4, blush);
  path(ctx, 'M53 70q2-2 4-2m44 1q3-1 5 0', null, tint(skin, .36), 1.4);
  const blink = ms % 3100 > 2960 && !startled;
  for (const x of [69, 99]) {
    path(ctx, 'M' + (x - 7) + ' ' + (startled ? 51 : 52) + 'q7 -5 13 0', null, hair, 2.15);
    if (blink || high) {
      path(ctx, 'M' + (x - 6) + ' 64q6 -7 12 0', null, INK, 2.7);
    } else {
      ellipse(ctx, x, 62, 7.7, startled ? 10.2 : 9.1, shade(ctx, x - 4, 54, x + 2, 72, '#ffeedb', .64, -.08), INK, 1.65);
      const iris = x + (think ? -1.1 : 1.55);
      ellipse(ctx, iris, 62.8, 5.1, 6.7, shade(ctx, iris - 1, 57, iris + 1, 69, '#5d3c2f', -.10, .38), '#372630', 1.1);
      ellipse(ctx, iris + .2, 62.5, 2.75, 4.25, '#241e27');
      ellipse(ctx, iris - 1.6, 59.45, 1.8, 2.35, '#fffafa');
      ellipse(ctx, iris + 2.1, 65.7, 1.1, 1.25, '#fbd9ab');
    }
  }
  path(ctx, 'M85 66q4 3 1 6', null, tint(skin, -.35), 1.55);
  if (startled) ellipse(ctx, 85, 80, 5, 5.7, '#72454a', INK, 1.25);
  else if (happy || !think) {
    path(ctx, 'M76 78q8 4 18 -1q-3 12-11 11q-5 -1-7-10Z', '#793e4c', INK, 1.6);
    path(ctx, 'M78 79q6 2 13 0q-1 4 -7 4Z', '#fff1dc', null);
    path(ctx, 'M83 85q3-2 6-1q-2 3-5 3Z', '#e38d81', null);
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
