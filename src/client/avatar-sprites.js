import { DEFAULT_AVATAR, SKIN } from '../shared/avatar-options.js';

const FRAME_WIDTH = 384;
const FRAME_HEIGHT = 448;
const FRAMES_PER_ROW = 6;
const COMPOSITE_WIDTH = FRAME_WIDTH / 2;
const COMPOSITE_HEIGHT = FRAME_HEIGHT / 2;
const WALK = [1, 2, 3, 2];
const MAX_CACHED_FRAMES = 36;
const frames = new Map();
const sourcePixels = new Map();

// Centers of the painted features for each frame on the 192 × 224 canvas.
const FACE_POINTS = [
  [[109, 48], [94, 50], [105, 47], [104, 48], [109, 78], [109, 70], [106, 57], [112, 57], [120, 57], [107, 38], [104, 36], [102, 33]],
  [[101, 48], [104, 49], [103, 49], [99, 49], [105, 84], [111, 73], [122, 59], [112, 56], [124, 54], [105, 46], [112, 43], [105, 42]],
];
const BODY_POINTS = [
  [[99, 100], [91, 107], [96, 101], [91, 104], [93, 127], [95, 127], [94, 110], [98, 110], [93, 113], [94, 85], [93, 86], [94, 86]],
  [[91, 100], [91, 104], [92, 104], [84, 104], [96, 129], [85, 130], [100, 111], [89, 109], [97, 107], [90, 99], [97, 97], [92, 98]],
];
const HAND_POINTS = [
  [[70, 142, 128, 143], [45, 137, 115, 121], [94, 129, 123, 109], [47, 136, 138, 102], [82, 133, 137, 119], [28, 151, 148, 151], [48, 127, 142, 92], [44, 125, 134, 97], [174, 81, 167, 96], [127, 95, 162, 90], [48, 104, 162, 90], [76, 77, 134, 12]],
  [[67, 143, 122, 141], [61, 145, 137, 125], [99, 128, 136, 118], [49, 139, 130, 109], [83, 137, 140, 130], [31, 153, 155, 151], [47, 128, 156, 85], [47, 115, 143, 100], [149, 83, 175, 77], [127, 105, 161, 94], [61, 132, 165, 100], [81, 81, 138, 23]],
];
const CLOTH_TINTS = [[1, 1, 1], [.66, .91, .69], [.59, .84, 1.12], [1.05, .71, .66], [.78, .72, 1.04]];
const JACKET_TINTS = [[1.55, 1.12, .62], [1, 1, 1], [.94, 1.1, 1.46], [1.55, .81, .69], [1.35, .9, 1.36]];
const HIJAB_TINTS = [[1, 1, 1], [.50, .58, .69], [.85, .51, .58], [.56, .78, .61]];
const skinRGB = SKIN.map(([, hex]) => hex.slice(1).match(/../g).map(value => parseInt(value, 16)));

function imageAt(url) {
  const image = new Image();
  image.src = url;
  return image;
}

function sheet(name) {
  return imageAt('/art/' + name + '-sprites.webp');
}

const defaults = ['iren', 'adit'].map(sheet);
const outfits = [
  [defaults[0], sheet('iren-coastal'), sheet('iren-vest')],
  [sheet('adit-explorer'), sheet('adit-coastal'), defaults[1]],
];
const hair = [
  {
    4: sheet('iren-long-straight'), 5: sheet('iren-long-wavy'), 6: sheet('iren-bob'),
    7: sheet('iren-layered'), 8: sheet('iren-shoulder'), 9: sheet('iren-coils'),
  },
  { 0: sheet('adit-straight'), 2: sheet('adit-curly'), 3: sheet('adit-coils'), 4: sheet('adit-bald-band') },
];
const accessories = [
  { 1: sheet('iren-satchel'), 2: sheet('iren-headband'), 3: sheet('iren-scarf'), 4: sheet('iren-simple') },
  { 0: sheet('adit-backpack'), 1: sheet('adit-satchel'), 3: sheet('adit-scarf'), 4: sheet('adit-simple') },
];
const aditWithoutBand = [
  sheet('adit-straight-bare'), accessories[1][0], sheet('adit-curly-bare'),
  sheet('adit-coils-bare'), sheet('adit-bald'),
];
const companions = imageAt('/art/ending-companions.webp');
const allImages = new Set([
  ...outfits.flat(), ...hair.flatMap(group => Object.values(group)),
  ...accessories.flatMap(group => Object.values(group)), ...aditWithoutBand, companions,
]);

export const spriteArtReady = Promise.allSettled([...allImages].map(image => image.decode())).then(results => {
  frames.clear();
  sourcePixels.clear();
  return results;
});

export function hasSpriteLook(look, role, variation = '') {
  return Boolean(look && !variation && DEFAULT_AVATAR[role]);
}

function ready(image) {
  return image?.complete && image.naturalWidth > 0;
}

function directSheet(look, role) {
  const standard = DEFAULT_AVATAR[role];
  const baseHead = role === 0 ? look.head < HIJAB_TINTS.length : look.head === standard.head;
  if (look.accessory !== standard.accessory) {
    if (look.outfit !== standard.outfit) return null;
    if (role === 1 && look.head === 4 && look.accessory === 0) return aditWithoutBand[4];
    return baseHead ? accessories[role][look.accessory] : null;
  }
  if (look.outfit === standard.outfit && hair[role][look.head]) return hair[role][look.head];
  return baseHead ? outfits[role][look.outfit] : null;
}

function drawFrame(ctx, image, frame, x, y, width, height) {
  const frameWidth = image.naturalWidth / FRAMES_PER_ROW;
  const frameHeight = image.naturalHeight / 2;
  ctx.drawImage(image, frame % FRAMES_PER_ROW * frameWidth, Math.floor(frame / FRAMES_PER_ROW) * frameHeight,
    frameWidth, frameHeight, x, y, width, height);
}

function framePixels(image, frame) {
  if (!ready(image)) return null;
  const key = image.src + ':' + frame;
  if (sourcePixels.has(key)) return sourcePixels.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = COMPOSITE_WIDTH;
  canvas.height = COMPOSITE_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  drawFrame(ctx, image, frame, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  if (sourcePixels.size >= MAX_CACHED_FRAMES) sourcePixels.delete(sourcePixels.keys().next().value);
  sourcePixels.set(key, pixels);
  return pixels;
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function ellipseMask(x, y, centerX, centerY, radiusX, radiusY) {
  return clampUnit((1 - ((x - centerX) / radiusX) ** 2 - ((y - centerY) / radiusY) ** 2) * 5);
}

function blendPixel(pixels, overlay, offset, amount) {
  const baseAlpha = pixels[offset + 3] * (1 - amount);
  const overlayAlpha = overlay[offset + 3] * amount;
  const alpha = baseAlpha + overlayAlpha;
  if (alpha) {
    for (let channel = 0; channel < 3; channel++) {
      pixels[offset + channel] = (pixels[offset + channel] * baseAlpha + overlay[offset + channel] * overlayAlpha) / alpha;
    }
  }
  pixels[offset + 3] = alpha;
}

function compositeFrame(image, role, frame, look, direct) {
  const key = [role, frame, look.skin, look.cloth, look.head, look.outfit, look.accessory].join(':');
  if (frames.has(key)) return frames.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = COMPOSITE_WIDTH;
  canvas.height = COMPOSITE_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  drawFrame(ctx, image, frame, 0, 0, canvas.width, canvas.height);
  const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frameData.data;
  const standard = DEFAULT_AVATAR[role];
  const skinTint = skinRGB[look.skin].map((value, i) => value / skinRGB[standard.skin][i]);
  const [faceX, faceY] = FACE_POINTS[role][frame];
  const [bodyX, bodyY] = BODY_POINTS[role][frame];
  const [leftX, leftY, rightX, rightY] = HAND_POINTS[role][frame];
  const headSheet = role === 1 && look.accessory !== standard.accessory ? aditWithoutBand[look.head] : hair[role][look.head];
  const head = !direct && look.head !== standard.head ? framePixels(headSheet, frame) : null;
  const outfitSheet = outfits[role][look.outfit];
  const outfit = !direct && image !== outfitSheet && look.outfit !== standard.outfit ? framePixels(outfitSheet, frame) : null;
  const headband = head && role === 0 && look.accessory === 2 ? framePixels(accessories[0][2], frame) : null;
  const clothTint = role === 1 && look.cloth === 0 ? [1.08, 1.02, .87] : CLOTH_TINTS[look.cloth];
  const hijabTint = HIJAB_TINTS[look.head] || HIJAB_TINTS[0];
  const jacket = look.outfit === 1;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const p = (y * canvas.width + x) * 4;
      const hands = Math.max(ellipseMask(x, y, leftX, leftY, 15, 16), ellipseMask(x, y, rightX, rightY, 15, 16));
      const face = ellipseMask(x, y, faceX, faceY + 2, 27, 32);
      const exposed = Math.max(face, hands);
      if (head) {
        const headArea = ellipseMask(x, y, faceX - (role === 0 ? 14 : 9), faceY - 10, role === 0 ? 55 : 49, 45);
        const neckFade = clampUnit((faceY + (role === 0 ? 32 : 28) - y) / 9);
        const longHair = role === 0 && [4, 5, 8].includes(look.head) && head[p + 3] > 220 && head[p] < 105 && head[p + 1] < 75
          ? ellipseMask(x, y, faceX - 23, faceY + 25, 44, 55) : 0;
        const scarfArea = role === 0 && pixels[p] > 140 && pixels[p] - pixels[p + 1] > 18
          && pixels[p + 1] - pixels[p + 2] < 32 && y > faceY + 17
          ? ellipseMask(x, y, faceX - 13, faceY + 30, 40, 25) : 0;
        const blend = Math.max(headArea * neckFade, longHair, scarfArea) * (1 - hands);
        if (blend) blendPixel(pixels, head, p, blend);
        if (headband?.[p + 3] > 200 && y < faceY - 5 && headArea > .7
            && headband[p] - headband[p + 1] > 45 && headband[p + 1] < 105) {
          blendPixel(pixels, headband, p, headArea * (1 - hands));
        }
      }
      if (!pixels[p + 3]) continue;

      if (outfit && pixels[p] > 105 && pixels[p] - pixels[p + 2] > 36) {
        const garment = clampUnit((pixels[p + 1] - pixels[p + 2] - 12) / 20);
        const blend = ellipseMask(x, y, bodyX, bodyY, 38, 34) * (1 - exposed) * garment;
        if (jacket && blend) {
          const light = .25 * pixels[p] + .6 * pixels[p + 1] + .15 * pixels[p + 2];
          const blue = [light * .46, light * .67, light * .77];
          for (let channel = 0; channel < 3; channel++) pixels[p + channel] += (blue[channel] - pixels[p + channel]) * blend;
        } else if (outfit[p + 3] > 220 && outfit[p] - outfit[p + 2] > 38 && blend) {
          blendPixel(pixels, outfit, p, blend * .48);
        }
      }

      const red = pixels[p];
      const green = pixels[p + 1];
      const blue = pixels[p + 2];
      if (jacket && look.cloth !== standard.cloth && green >= red && green > 29 && blue >= green * .76) {
        const area = ellipseMask(x, y, bodyX, bodyY - 6, 38, 40);
        for (let channel = 0; channel < 3; channel++) pixels[p + channel] *= 1 + area * (JACKET_TINTS[look.cloth][channel] - 1);
        continue;
      }
      if (red < 70 || red - green < 10 || red - blue < 22) continue;
      const warm = green - blue > 20 && red - green > 16;
      const hijab = role === 0 && look.head > 0 && look.head < HIJAB_TINTS.length && green - blue < 28
        ? ellipseMask(x, y, faceX - 18, faceY + 6, 48, 52) * (warm ? 1 - face : 1) : 0;
      const skin = look.skin !== standard.skin && warm && red > 135 ? exposed : 0;
      const cloth = !jacket && look.cloth !== standard.cloth && warm && red > 105
        ? ellipseMask(x, y, bodyX, bodyY, 30, 30) * (1 - exposed) : 0;
      for (let channel = 0; channel < 3; channel++) {
        pixels[p + channel] *= 1 + skin * (skinTint[channel] - 1)
          + hijab * (hijabTint[channel] - 1) + cloth * (clothTint[channel] - 1);
      }
    }
  }

  ctx.putImageData(frameData, 0, 0);
  if (frames.size >= MAX_CACHED_FRAMES) frames.delete(frames.keys().next().value);
  frames.set(key, canvas);
  return canvas;
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

export function drawSpriteAvatar(ctx, role, pose, ms, face, look = DEFAULT_AVATAR[role]) {
  const preferred = directSheet(look, role);
  const base = accessories[role][look.accessory] || outfits[role][look.outfit];
  const image = [preferred, base, defaults[role]].find(ready);
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!image) return;

  const frame = frameFor(pose, ms);
  const scale = Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT);
  const drawWidth = FRAME_WIDTH * scale;
  const drawHeight = FRAME_HEIGHT * scale;
  const left = (width - drawWidth) / 2;
  const top = height - drawHeight;
  const standard = DEFAULT_AVATAR[role];
  ctx.save();
  if (face < 0) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  if (image === preferred && look.skin === standard.skin && look.cloth === standard.cloth
      && (look.head === standard.head || image === hair[role][look.head])) {
    drawFrame(ctx, image, frame, left, top, drawWidth, drawHeight);
  } else {
    const rendered = compositeFrame(image, role, frame, look, image === preferred);
    ctx.drawImage(rendered, left, top, drawWidth, drawHeight);
  }
  ctx.restore();
}

export function drawSpriteCompanion(ctx, variation, pose) {
  if (!ready(companions) || !['leo', 'laras'].includes(variation)) return false;
  const frame = (variation === 'leo' ? 0 : 2) + Number(pose === 'celebrate');
  const { width, height } = ctx.canvas;
  const frameWidth = companions.naturalWidth / 4;
  const frameHeight = companions.naturalHeight;
  const scale = Math.min(width / frameWidth, height / frameHeight);
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(companions, frame * frameWidth, 0, frameWidth, frameHeight,
    (width - frameWidth * scale) / 2, height - frameHeight * scale, frameWidth * scale, frameHeight * scale);
  return true;
}
