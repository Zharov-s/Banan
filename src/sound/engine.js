/* Звук игры. Все звуки синтезируются на лету через WebAudio, без аудиофайлов.
   Три канала микшера: цех (фон), голоса миньонов, игровые события. Звук выключен, пока игрок сам его не включит.
   Схема каналов и огибающих адаптирована из «Sound toggle with the scroll mixer» (Animorio, animorio.com/en/license). */

const LOUDNESS = 0.7;
export const CHANNELS = Object.freeze([
  { id: 'room', name: 'Цех', color: '#b9aef5', volume: 0.5 },
  { id: 'voice', name: 'Голоса', color: '#ffd64a', volume: 0.7 },
  { id: 'game', name: 'Игра', color: '#5ef0c8', volume: 0.8 },
]);

export function createSound() {
  let ctx = null;
  let master = null;
  let noise = null;
  let on = false;
  let idleTimer = 0;
  const chans = [];
  const volumes = CHANNELS.map((c) => c.volume);

  const gainN = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, Math.random() * 1.9); return s; };
  const lfo = (rate, depth, param) => { const o = ctx.createOscillator(); o.frequency.value = rate; const g = gainN(depth); o.connect(g).connect(param); o.start(); };

  /* короткий тон со скольжением высоты */
  const tone = (out, t, { f0, f1 = f0, peak = 0.2, len = 0.12, type = 'sine', attack = 0.004 }) => {
    const o = ctx.createOscillator();
    o.type = type;
    const g = gainN(0);
    chain(o, g, out);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len * 0.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    o.start(t);
    o.stop(t + len + 0.03);
  };
  /* шум через плывущий фильтр: вжух перехода */
  const sweep = (out, t, { f0, f1, peak = 0.2, len = 0.5, q = 1.2 }) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const b = filt('bandpass', f0, q);
    const g = gainN(0);
    chain(s, b, g, out);
    b.frequency.setValueAtTime(f0, t);
    b.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + len * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    s.start(t, Math.random());
    s.stop(t + len + 0.03);
  };

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = Math.floor(ctx.sampleRate * 2);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    master = gainN(0);
    chain(master, comp, ctx.destination);

    CHANNELS.forEach((c, i) => {
      const bus = gainN(1);
      const g = gainN(volumes[i]);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      chain(bus, g, an, master);
      chans.push({ bus, g, an, buf: new Float32Array(an.fftSize) });
    });

    /* цех: мягкий гул вентиляции и далёкий воздух */
    const room = chans[0].bus;
    const air = gainN(0.16);
    chain(noiseSrc(), filt('lowpass', 240), air, room);
    lfo(0.09, 0.05, air.gain);
    const hiss = filt('bandpass', 1300, 0.5);
    chain(noiseSrc(), hiss, gainN(0.018), room);
    lfo(0.05, 400, hiss.frequency);
    [55, 82.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = gainN(0.05);
      chain(o, g, room);
      lfo(0.07 + i * 0.04, 0.02, g.gain);
      o.start();
    });
  }

  const FX = {
    /* голоса: лепет из трёх-четырёх слогов */
    chirp: (out, t) => {
      const base = 360 + Math.random() * 220;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f = base * (0.85 + Math.random() * 0.5);
        tone(out, t + i * 0.085, { f0: f, f1: f * (Math.random() < 0.5 ? 1.25 : 0.8), peak: 0.13, len: 0.09, type: 'triangle' });
      }
    },
    yay: (out, t) => {
      [520, 660, 880].forEach((f, i) => tone(out, t + i * 0.075, { f0: f, f1: f * 1.18, peak: 0.16, len: 0.12, type: 'triangle' }));
    },
    snore: (out, t) => tone(out, t, { f0: 150, f1: 110, peak: 0.05, len: 0.5, type: 'triangle', attack: 0.2 }),
    /* игра */
    pop: (out, t) => tone(out, t, { f0: 420 + Math.random() * 80, f1: 900, peak: 0.2, len: 0.09 }),
    tick: (out, t) => tone(out, t, { f0: 1500, f1: 1200, peak: 0.07, len: 0.03 }),
    lift: (out, t) => {
      tone(out, t, { f0: 90, f1: 170, peak: 0.09, len: 1.0, type: 'sawtooth', attack: 0.15 });
      sweep(out, t, { f0: 300, f1: 900, peak: 0.03, len: 1.0 });
    },
    crown: (out, t) => [660, 880, 1320].forEach((f, i) => tone(out, t + 0.5 + i * 0.09, { f0: f, peak: 0.13, len: 0.5, type: 'triangle' })),
    open: (out, t) => sweep(out, t, { f0: 320, f1: 2400, peak: 0.16, len: 0.6 }),
    close: (out, t) => sweep(out, t, { f0: 2200, f1: 300, peak: 0.14, len: 0.5 }),
    row: (out, t) => tone(out, t, { f0: 700 + Math.random() * 200, f1: 1100, peak: 0.05, len: 0.05 }),
    land: (out, t) => tone(out, t, { f0: 160, f1: 70, peak: 0.2, len: 0.14 }),
  };
  const VOICE = new Set(['chirp', 'yay', 'snore']);

  /** @param {keyof typeof FX} name @param {{delay?: number}} [opts] */
  function play(name, { delay = 0 } = {}) {
    if (!on || !ctx || ctx.state !== 'running' || !FX[name]) return;
    FX[name](chans[VOICE.has(name) ? 1 : 2].bus, ctx.currentTime + delay + 0.01);
  }

  function setOn(value) {
    on = value;
    clearInterval(idleTimer);
    if (on) {
      try {
        if (!ctx) build();
        ctx.resume();
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(LOUDNESS, t + 0.35);
        /* миньоны иногда переговариваются сами */
        idleTimer = setInterval(() => { if (Math.random() < 0.3 && !document.hidden) play('chirp'); }, 2600);
      } catch {
        on = false; /* нет WebAudio: игра работает без звука */
      }
    } else if (ctx) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.25);
      setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 320);
    }
    return on;
  }

  function setVolume(i, v) {
    volumes[i] = Math.min(1, Math.max(0, v));
    if (ctx) chans[i].g.gain.setTargetAtTime(volumes[i], ctx.currentTime, 0.03);
  }

  /* уровень канала 0..1 для индикатора; null, если звук не идёт */
  function level(i) {
    if (!on || !ctx || ctx.state !== 'running') return null;
    const c = chans[i];
    c.an.getFloatTimeDomainData(c.buf);
    let s = 0;
    for (let j = 0; j < c.buf.length; j++) s += c.buf[j] * c.buf[j];
    return Math.min(1, Math.sqrt(s / c.buf.length) * 9);
  }

  return { play, setOn, setVolume, level, volume: (i) => volumes[i], isOn: () => on };
}
