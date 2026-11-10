import { DEFAULT_AVATAR } from '../shared/avatar-options.js';

const FRAME_WIDTH = 384;
const FRAME_HEIGHT = 448;
const FRAMES_PER_ROW = 6;
const WALK = [1, 2, 3, 2];

const sheets = ['iren', 'adit'].map(name => {
  const image = new Image();
  image.src = '/art/' + name + '-sprites.webp';
  return image;
});

export const spriteArtReady = Promise.allSettled(sheets.map(image => image.decode()));

export function hasSpriteLook(look, role, variation = '') {
  const defaults = DEFAULT_AVATAR[role];
  return !variation && !!defaults && Object.keys(defaults).every(key => look[key] === defaults[key]);
}

function frameFor(pose, ms) {
  if (pose === 'walk') return WALK[Math.floor(ms / 108) % WALK.length];
  if (pose === 'run') return 6 + Math.floor(ms / 125) % 2;
  switch (pose) {
    case 'jump': return 4;
    case 'land': return 5;
    case 'push': return 8;
    case 'lift': return 9;
    case 'use':
    case 'rope': return 10;
    case 'celebrate':
    case 'correct': return 11;
    default: return 0;
  }
}

export function drawSpriteAvatar(ctx, role, pose, ms, face) {
  const sheet = sheets[role];
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!sheet.complete || !sheet.naturalWidth) return;

  const frame = frameFor(pose, ms);
  const x = frame % FRAMES_PER_ROW * FRAME_WIDTH;
  const y = Math.floor(frame / FRAMES_PER_ROW) * FRAME_HEIGHT;
  const scale = Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT);
  const drawWidth = FRAME_WIDTH * scale;
  const drawHeight = FRAME_HEIGHT * scale;
  ctx.save();
  if (face < 0) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(sheet, x, y, FRAME_WIDTH, FRAME_HEIGHT,
    (width - drawWidth) / 2, height - drawHeight, drawWidth, drawHeight);
  ctx.restore();
}
