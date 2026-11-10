export const WIDTH = 1500;
export const FLOOR = 390;
export const PIT = [500, 820];
export const EXIT = 1415;
export const CRANK = 365;
export const BRIDGE_SWITCHES = [445, 872];
export const BRIDGE_REACH = 52;
export const RAFT_FROM = 495;
export const RAFT_TO = 835;
export const RAFT_HALF = 96;
export const RAFT_PAD = 44;
export const CLUE_HIGH = [445, 250];
export const CLUE_LOW = [745, FLOOR];
export const PATTERN = 893;
export const PADS = [515, 565];
export const TIMERS = [[462, 280], [740, FLOOR]];
export const SWITCH_STEPS = [[224, 315, 344], [331, 413, 310], [423, 508, 280]];
export const CLUE_STEPS = [[226, 315, 344], [327, 412, 297], [424, 503, 250]];
export const CLIFF_STEPS = [[497, 611, 335], [625, 738, 280], [753, 868, 226]];
export const CLIMB = [795, 226];
export const SYMBOLS = ['Daun', 'Bulan', 'Ombak', 'Bintang'];

function stop(place, title, theme, mode, quizCount, quote, extra = {}) {
  const quizAt = quizCount === 3 ? [312, 1000, 1175] : [312, 1090];
  return { place, title, theme, mode, quizAt, quote, ...extra };
}

export const CHAPTERS = [
  {
    name: 'Sumatra', title: 'Jejak Tiga Negeri', marker: [13, 43],
    stages: [
      stop('Aceh', 'Jembatan yang Mogok', 'aceh', 'bridge', 3,
        'Adit: Katanya jembatannya kuat. Ternyata yang kuat cuma niatnya.'),
      stop('Danau Toba', 'Rakit Dua Dayung', 'toba', 'raft', 3,
        'Iren: Danau seluas ini, masa kita cuma bawa satu dayung? Coba cek sisi satunya.'),
      stop('Minangkabau', 'Rahasia Rumah Gadang', 'minang', 'clues', 2,
        'Adit: Aku dapat setengah petunjuk. Setengahnya lagi nyasar ke kamu, ya?'),
      stop('Minangkabau', 'Pintu di Balik Lumbung', 'minang', 'lift', 2,
        'Iren: Di balik balok itu ada cahaya. Semoga keping kompas, bukan lampu tetangga.', { support: true }),
    ],
  },
  {
    name: 'Jawa', title: 'Misteri Candi Kuno', marker: [33, 75],
    stages: [
      stop('Kaki Gunung', 'Batu yang Betah', 'jawa', 'push', 3,
        'Iren: Batunya nyaman sekali. Ayo kita bantu pindahan.', { support: true }),
      stop('Lorong Candi', 'Dua Jalur Relief', 'jawa', 'clues', 2,
        'Adit: Kamu lewat atas, aku lewat bawah. Yang ketemu gorengan dulu, bagi dua.'),
      stop('Teras Candi', 'Dentang Serempak', 'jawa', 'timing', 3,
        'Iren: Kita hitung sampai tiga. Jangan mulai dari angka tujuh lagi.'),
      stop('Persawahan', 'Jembatan Teras Hijau', 'jawa', 'bridge', 2,
        'Adit: Kepingnya berkilau sampai sini. Sedikit lagi!'),
    ],
  },
  {
    name: 'Kalimantan', title: 'Rahasia Hutan Rimba', marker: [39, 42],
    stages: [
      stop('Sungai Rimba', 'Arus di Bawah Rakit', 'kalimantan', 'raft', 3,
        'Iren: Dayung kompak, ya. Kemarin kita hampir bikin rakitnya menari.'),
      stop('Hutan Hujan', 'Pohon Melintang', 'kalimantan', 'push', 2,
        'Adit: Pohonnya tumbang di jalan. Kita geser bareng, pelan-pelan.'),
      stop('Rumah Panjang', 'Jembatan Papan', 'kalimantan', 'bridge', 3,
        'Iren: Aku bisa jaga tuas. Kamu cari penguncinya di seberang.'),
      stop('Gerbang Rimba', 'Isyarat dari Hulu', 'kalimantan', 'timing', 2,
        'Adit: Rimbanya sunyi sekali. Siap kasih aba-aba?'),
    ],
  },
  {
    name: 'Sulawesi', title: 'Lembah Seribu Rahasia', marker: [56, 49],
    stages: [
      stop('Dataran Tinggi', 'Katrol di Antara Tebing', 'sulawesi', 'cable', 3,
        'Adit: Talinya aman. Yang perlu diyakinkan sekarang lututku.'),
      stop('Kampung Tongkonan', 'Pola di Lembah', 'sulawesi', 'clues', 2,
        'Iren: Ukirannya memberi dua petunjuk. Kita cari masing-masing satu.'),
      stop('Tanjakan Batu', 'Dua Tali, Satu Beban', 'sulawesi', 'rope', 3,
        'Adit: Aku sudah pemanasan. Angkat satu gorengan, habis dua.', { support: true }),
      stop('Pesisir', 'Sinyal dari Dua Menara', 'sulawesi', 'timing', 2,
        'Iren: Kepingnya hampir kita dapat. Hitung bareng, satu, dua, tiga.', { landscape: 'pesisir' }),
    ],
  },
  {
    name: 'Papua', title: 'Misteri Tanah Cenderawasih', marker: [85, 57],
    stages: [
      stop('Pegunungan Papua', 'Tangga di Awan', 'papua', 'climb', 3,
        'Iren: Lihat, ada pijakan sampai ke atas. Kita nyalakan penandanya berdua.'),
      stop('Lembah Hijau', 'Batu dengan Dua Pesan', 'papua', 'clues', 3,
        'Adit: Aku baru paham setengah. Kabar baiknya, setengah lagi ada di tanganmu.'),
      stop('Pesisir Raja Ampat', 'Gema di Karang', 'papua', 'timing', 2,
        'Iren: Suara kita mantul dari batu. Panggil aku sekali saja, nanti jawabnya ramai.', { landscape: 'karang' }),
      stop('Gerbang Cenderawasih', 'Keping di Balik Batu', 'papua', 'lift', 2,
        'Adit: Kalau semua keping bersinar begini, kompasnya bisa jadi lampu tidur.', { support: true }),
    ],
  },
  {
    name: 'Bali', title: 'Akhir Perjalanan, Awal Kisah Baru', marker: [42, 81],
    stages: [
      stop('Desa Bali', 'Jalan Rahasia di Kebun', 'bali', 'clues', 2,
        'Iren: Wangi bunganya bikin betah. Kita cari jalan rahasianya sebelum gelap.', { landscape: 'desa-bali' }),
      stop('Teras Sawah', 'Beban Terakhir', 'bali', 'lift', 3,
        'Adit: Dulu angkat balok saja grogi. Sekarang groginya cuma setengah.', { support: true }),
      stop('Kebun Tropis', 'Titian Menuju Senja', 'bali', 'bridge', 3,
        'Iren: Mataharinya mulai turun. Pegang tuasnya, aku cari pengunci.'),
      stop('Tanjung Senja', 'Gerbang Kompas Nusantara', 'bali', 'gate', 2,
        'Adit: Enam keping, satu kompas. Yuk, kita putar bersama.'),
    ],
  },
];

export const CAST = ['Iren', 'Adit'];
export const LABELS = {
  bridge: 'Jembatan', raft: 'Rakit', cable: 'Katrol', clues: 'Petunjuk',
  lift: 'Angkat', push: 'Dorong', rope: 'Tarik', timing: 'Serempak',
  climb: 'Tebing', gate: 'Kompas',
};

export function stageOf(world) {
  return CHAPTERS[world.chapter].stages[world.stage];
}

export function within(player, x, y = FLOOR, radius = 55) {
  return Math.abs(player.x - x) <= radius && Math.abs(player.y - y) <= 32;
}

export function stageQuestionStart(world) {
  const { stages } = CHAPTERS[world.chapter];
  return world.chapter * 10 + stages.slice(0, world.stage).reduce((sum, stage) => sum + stage.quizAt.length, 0);
}

export function hasPit(stage) {
  return ['bridge', 'raft', 'cable'].includes(stage.mode);
}

export function platformsFor(stage) {
  if (stage.mode === 'clues') return CLUE_STEPS;
  if (stage.mode === 'timing') return SWITCH_STEPS;
  if (stage.mode === 'climb') return CLIFF_STEPS;
  return [[208, 286, 342]];
}
