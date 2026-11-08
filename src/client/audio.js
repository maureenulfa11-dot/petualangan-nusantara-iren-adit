// Melodi dan efek orisinal. Nilai angka adalah langkah nada, bukan cuplikan rekaman.
export const MUSIC = {
  aceh: ['Angin Seulanga', .183, 62, [0,2,4,7,9], [0,2,null,3,4,3,2,null,1,2,4,null,3,2,1,null], 'reed'],
  toba: ['Riak Danau', .208, 57, [0,2,4,7,9], [0,null,2,1,3,null,2,3,4,3,null,2,0,1,2,null], 'pluck'],
  minang: ['Langkah di Lumbung', .165, 60, [0,2,5,7,9], [0,1,2,null,4,3,2,1,2,4,3,null,2,0,1,null], 'wood'],
  jawa: ['Gema Teras Candi', .233, 56, [0,2,5,7,10], [0,null,3,2,1,null,4,null,0,3,null,2,4,3,1,null], 'metal'],
  kalimantan: ['Arus Kayu Rimba', .188, 57, [0,2,5,7,9], [0,2,1,3,null,4,2,null,0,3,2,1,3,2,0,null], 'pluck'],
  sulawesi: ['Pagi di Lembah', .177, 62, [0,2,4,7,9], [0,null,3,1,2,4,1,null,3,4,3,2,1,null,2,0], 'wood'],
  papua: ['Jejak di Awan', .190, 58, [0,3,5,7,10], [null,2,0,null,4,null,1,0,null,2,3,null,4,2,1,null], 'drum'],
  bali: ['Senja Saling Menjawab', .154, 59, [0,1,5,7,8], [0,3,1,3,2,4,null,2,0,4,1,3,2,1,3,null], 'wood'],
  senja: ['Keping Terakhir', .212, 60, [0,2,4,7,9], [0,null,2,3,4,null,3,2,1,null,2,4,3,null,2,0], 'pluck'],
};
const FX = {
  right: [72, 76, 81], wrong: [61, 57, 54], clue: [67, 74], success: [64, 69, 73, 76],
  danger: [52, 43], travel: [59, 66, 71], final: [60, 64, 67, 72, 79], jump: [58, 65], explore: [64, 71],
};
const hz = note => 440 * 2 ** ((note - 69) / 12);

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.key = 'aceh';
  }

  unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.music = this.ctx.createGain();
      this.effects = this.ctx.createGain();
      this.music.connect(this.ctx.destination);
      this.effects.connect(this.ctx.destination);
      this.apply(this.settings);
      this.change(this.key, true);
      this.timer = setInterval(() => this.schedule(), 75);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  apply(settings) {
    this.settings = settings;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(settings.mute ? 0 : settings.music * .30, now, .05);
    this.effects.gain.setTargetAtTime(settings.mute ? 0 : settings.effects * .34, now, .05);
  }

  change(key, force = false) {
    if (!MUSIC[key] || (key === this.key && !force)) return;
    this.key = key;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.track) {
      const old = this.track.gain;
      old.gain.cancelScheduledValues(now);
      old.gain.setTargetAtTime(0, now, .22);
      setTimeout(() => old.disconnect(), 1400);
    }
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(.001, now);
    gain.gain.setTargetAtTime(1, now + .08, .26);
    gain.connect(this.music);
    this.track = { gain, next: now + .09, i: 0 };
  }

  tone(output, type, note, t, length, level, detune = 0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz(note), t);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + Math.min(.032, length / 4));
    gain.gain.exponentialRampToValueAtTime(.0001, t + length);
    osc.connect(gain).connect(output);
    osc.start(t);
    osc.stop(t + length + .01);
  }

  schedule() {
    if (this.ctx.state !== 'running' || !this.track || document.hidden) return;
    const [, beat, base, scale, melody, timbre] = MUSIC[this.key];
    const track = this.track;
    const now = this.ctx.currentTime;
    if (track.next < now - .2) track.next = now + .025;
    while (track.next < now + .2) {
      const i = track.i++;
      const t = Math.max(track.next, now);
      const phrase = Math.floor(i / 16) % 4;
      const note = melody[i % 16];
      const root = base + [0, 0, 5, -2][phrase];
      if (note !== null) {
        const lead = root + scale[note] + (i % 11 === 0 && phrase === 2 ? 12 : 0);
        this.tone(track.gain, timbre === 'reed' ? 'triangle' : 'sine', lead, t, timbre === 'metal' ? .52 : .31, .16);
        if (['metal', 'wood', 'pluck'].includes(timbre)) this.tone(track.gain, 'sine', lead + (timbre === 'metal' ? 19 : 12), t, .15, .055, 5);
      }
      if (i % 8 === 0) this.tone(track.gain, 'sine', root - 12, t, .72, .19);
      if ([0, 3, 6].includes(i % 8) || (timbre === 'drum' && [2, 7].includes(i % 8))) {
        this.tone(track.gain, 'triangle', timbre === 'drum' ? 38 : 43, t + .01, .115, timbre === 'drum' ? .24 : .085);
      }
      track.next += beat;
    }
  }

  cue(key) {
    if (!this.ctx || this.ctx.state !== 'running' || !FX[key]) return;
    const t = this.ctx.currentTime + .012;
    FX[key].forEach((note, i) => this.tone(this.effects, key === 'wrong' ? 'triangle' : 'sine', note, t + i * .077, .205, .29));
  }
}
