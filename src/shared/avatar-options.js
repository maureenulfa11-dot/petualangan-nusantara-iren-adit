export const SKIN = [
  ['Cerah', '#ffd9b9'], ['Cerah hangat', '#f5bb91'], ['Sedang', '#d69367'],
  ['Sawo matang', '#ab6648'], ['Cokelat gelap', '#75412f'],
];
export const HEAD = [
  ['Hijab pasir', 'Hijab arang', 'Hijab marun', 'Hijab lumut', 'Panjang lurus', 'Panjang bergelombang',
    'Bob pendek', 'Pendek berlapis', 'Lurus sebahu', 'Ikal rapat'],
  ['Pendek lurus', 'Pendek bergelombang', 'Pendek keriting', 'Ikal rapat', 'Kepala plontos'],
];
export const CLOTH = [
  ['Pasir', '#dfad69'], ['Lumut', '#75a76a'], ['Nila', '#638fb5'],
  ['Bata', '#c56b58'], ['Ungu', '#a786ad'],
];
export const OUTFIT = ['Penjelajah', 'Jaket pesisir', 'Rompi bermotif'];
export const ACCESSORY = ['Ransel', 'Selempang', 'Ikat kepala', 'Syal', 'Sederhana'];
export const DEFAULT_AVATAR = [
  { skin: 1, head: 0, cloth: 0, outfit: 0, accessory: 0 },
  { skin: 2, head: 1, cloth: 1, outfit: 2, accessory: 2 },
];

export function cleanAvatar(avatar, role) {
  if (!avatar || (role !== 0 && role !== 1)) return null;
  const sizes = { skin: SKIN.length, head: HEAD[role].length, cloth: CLOTH.length, outfit: OUTFIT.length, accessory: ACCESSORY.length };
  if (!Object.entries(sizes).every(([key, size]) => Number.isInteger(avatar[key]) && avatar[key] >= 0 && avatar[key] < size)) return null;
  return Object.fromEntries(Object.keys(sizes).map(key => [key, avatar[key]]));
}
